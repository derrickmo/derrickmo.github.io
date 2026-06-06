// weekly-insights.js — single source of truth for the Weekly Insights feed.
// Newest entry first. The Sunday Cowork digest task prepends ONE object here;
// no other code needs to change to publish a new week.
//
// Entry shape (every field required unless noted):
//   {
//     date: "YYYY-MM-DD",                         // ISO date, used for sort + anchor id
//     range: "Month D to Month D, YYYY",          // human range
//     tldr: [ "string", ... ],                    // bullet points (no source needed)
//     sections: [
//       {
//         header: "// SECTION NAME",
//         items: [ { text: "string", source: { label: "string", url: "https://..." } } ]
//       }
//     ],
//     watching: [ { text: "string", source: { label, url } } ]  // optional
//   }
//
// Keep this file bounded to the most recent ~12 weeks. Older entries remain
// available as dated archives in `_private/digests/YYYY-MM-DD-weekly-ml.md`.

window.WEEKLY_INSIGHTS = [
  {
    date: "2026-05-31",
    range: "May 24 to May 31, 2026",
    tldr: [
      "EAGLE 3.1 landed (EAGLE team / vLLM / TorchSpec). It traces long-context spec-decode degradation to attention drift and fixes it with FC normalization plus post-norm hidden-state feedback. Up to 2x longer acceptance length on long context, config-driven, backward compatible with EAGLE 3 checkpoints. Ships in vLLM v0.22.0.",
      "Claude Opus 4.8 shipped May 28: 88.6% SWE-bench Verified, 69.2% SWE-bench Pro, GDPval-AA 1890 (+121 Elo over GPT-5.5). Price unchanged at $5/$25 per Mtok; new Fast mode is 3x cheaper than Opus 4.7's. Dynamic workflows fan out hundreds of parallel subagents and verify against your test suite.",
      "llama.cpp merged Multi-Token Prediction (PR #22673). Qwen 3.6 27B dense gets ~2x single-stream throughput, but the 35B-A3B MoE shows no net speedup at batch=1 on consumer GPUs because the verifier loads the expert union. MTP is not a free win on local MoE.",
      "MLX on M5 unlocks the Neural Accelerators path: up to 4x faster TTFT and 3.8x faster FLUX vs M4. Requires macOS 26.2 and MLX 0.30+, otherwise you only get the +19-27% memory-bandwidth gain.",
    ],
    sections: [
      {
        header: "// AGENTIC SYSTEMS & EVAL",
        intro: "Systems where the model plans, calls tools, and acts over many steps instead of answering in one shot, plus how we measure them. Capability is moving fast here; trustworthy evaluation is the harder, less-solved half.",
        items: [
          { text: "Claude Opus 4.8 (May 28) added dynamic workflows: Claude Code plans a large task, fans out hundreds of parallel subagents (separate model instances each given a slice of the work), then verifies their outputs against your test suite. Pitched for refactors spanning hundreds of thousands of lines, with an effort dial (Low/Medium/High/xHigh/Max) across claude.ai, Cowork, and Claude Code. The number that matters for autonomous runs: it is reportedly ~4x less likely than 4.7 to let a flaw in its own code pass unflagged. Self-verification quality, not the headline benchmark, is what decides whether you can let a fleet of subagents run unattended.", source: { label: "Codersera", url: "https://codersera.com/blog/claude-opus-4-8-launch-guide-2026/" } },
          { text: "Qwen WebWorld (8B/14B/32B, Apache 2.0) is an open-weight web world model: a model that predicts the next browser state given the current page plus an action, so you can train web agents against a simulator instead of the live internet (faster, safer, reproducible). Trained on 1.06M real interaction trajectories. WebWorld-32B scores 71.0% average Factuality, matching Claude-Opus-4.1 at 71.3%; a Qwen3-14B agent trained on its synthesized rollouts improves +9.2% on WebArena. If you do agent RL, this is a usable open environment and dataset for browser tasks.", source: { label: "arXiv", url: "https://arxiv.org/abs/2602.14721" } },
          { text: "Eval gotcha worth internalizing: the scaffold (the harness code that feeds the model context, parses its tool calls, and retries on failure) dominates the score as much as the model does. The same base model swings widely on Terminal-Bench (a benchmark of real command-line tasks) depending on harness, e.g. Terminus vs ForgeCode. A single leaderboard number is near meaningless without naming the scaffold. When you compare agents, hold the scaffold fixed or report it.", source: { label: "Codersera", url: "https://codersera.com/blog/ai-agent-benchmarks-state-of-leaderboard-may-2026/" } },
        ],
      },
      {
        header: "// SPECULATIVE DECODING & INFERENCE",
        intro: "Speculative decoding speeds up text generation without changing the output: a small fast 'draft' model guesses several tokens ahead, and the large model checks them all in one pass, accepting the ones it agrees with. More accepted guesses per pass means more tokens per second. These items are about making that trick hold up in production.",
        items: [
          { text: "EAGLE 3.1 (the EAGLE family is the dominant set of draft models) fixes a failure mode the authors call attention drift: as the drafter guesses deeper, it drifts attention away from the early 'sink' tokens toward its own output, so acceptance length (how many guessed tokens survive verification, the quantity that sets the speedup) collapses under long context, odd chat templates, or unusual system prompts. The fix is two architecture tweaks (FC normalization on each target hidden state, and feeding the normalized state forward) so drafting behaves like calling the drafter recursively. Result: up to 2x longer acceptance vs EAGLE 3. On Kimi-K2.6 at NVFP4 (a 4-bit serving format) with vLLM on GB200: 2.03x per-user throughput at 1 concurrent request, 1.71x at 4, 1.66x at 16. Config-driven and backward compatible with EAGLE 3 checkpoints, so it is a drop-in drafter upgrade; ships in vLLM v0.22.0.", source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-05-26-eagle-3-1" } },
          { text: "Spec-decode correctness fix shipped alongside: vLLM (a high-throughput serving engine) v0.21.0 made speculative decoding respect a reasoning model's thinking budget. Previously the drafter could spend tokens that the model had reserved for its hidden reasoning, a quiet correctness bug on reasoning models. If you serve reasoning models with spec-decode on, this is a reason to upgrade.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
        ],
      },
      {
        header: "// QUANTIZATION & COMPRESSION",
        intro: "Quantization stores model weights at lower numeric precision (16-bit floats down to 4-bit or less) so the model needs less memory and runs faster. The whole game is pushing the bit-width down while keeping quality intact; past a point, accuracy breaks.",
        items: [
          { text: "TurboQuant (ICLR 2026, Zandieh et al.) is being tracked into llama.cpp (the most portable local runtime; discussion #20969) with a working CPU implementation passing 18/18 tests and reconstruction error (MSE) within 1% of the paper. Its TQ3 format gives 4.9x compression vs FP16 (16-bit floats), TQ4 gives 3.8x, both well below the usual 4-bit floor. Community forks pairing it with draft-model speculative decoding report +30-50% throughput. A credible next-gen sub-4-bit path; not in mainline yet.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
        ],
      },
      {
        header: "// LOCAL & ON-DEVICE",
        intro: "Running models on hardware you own (a laptop, workstation, or single GPU) through runtimes like llama.cpp, MLX, Ollama, and LM Studio, instead of a cloud API. The constraints that bite here are memory, speed, and which model architectures the runtime actually supports.",
        items: [
          { text: "llama.cpp merged MTP speculative decoding (PR #22673). MTP (multi-token prediction) is the model drafting its own next tokens from built-in extra heads, so no separate draft model is needed. On Qwen 3.6 27B dense (every parameter runs on every token) it gives ~2x single-user throughput. The gotcha is MoE (mixture-of-experts, where only a few expert sub-networks fire per token): on the 35B-A3B MoE at batch size 1, each drafted token can wake a different expert and the verifier must load all of them, so multiple RTX 3090 runs show no net speedup over plain decoding. Servers that batch many requests amortize it; a solo user on one GPU running MoE should measure before assuming a win.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
          { text: "MLX (Apple's array/ML framework for Apple Silicon) on the new M5: every M5 GPU core now has dedicated matrix-multiply hardware (Neural Accelerators), and MLX is currently the only framework that targets it. Up to 4x faster time-to-first-token, 3.8x faster 1024x1024 FLUX image generation, and 30-60% across most workloads vs M4. Hard requirement: macOS 26.2 and MLX 0.30+, without both you only get the memory-bandwidth gain (~+19-27%). Ollama and LM Studio both increasingly run MLX underneath on Macs, so you benefit regardless of wrapper.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
        ],
      },
      {
        header: "// MODEL RELEASES",
        intro: "New models worth a practitioner's attention because capability or price actually moved, not because there was an announcement. Benchmark shorthand: SWE-bench = fixing real GitHub issues, GPQA Diamond = hard graduate science Q&A, GDPval = an economic-value score on real knowledge-work tasks.",
        items: [
          { text: "Claude Opus 4.8 (May 28): 88.6% SWE-bench Verified, 69.2% SWE-bench Pro, 74.6% Terminal-Bench 2.1, 93.6% GPQA Diamond, GDPval-AA 1890 (+121 Elo over GPT-5.5). Price held flat at $5 in / $25 out per million tokens, and a new Fast mode is 3x cheaper than Opus 4.7's at $10/$50. The pattern to budget around is capability up, price flat, with a cheaper fast tier for high-volume work.", source: { label: "llm-stats", url: "https://llm-stats.com/blog/research/claude-opus-4-8-launch" } },
        ],
      },
      {
        header: "// FRAMEWORKS & HARDWARE",
        intro: "Changes to the toolchain you build on: serving engines, training frameworks, GPU kernels, and hardware support. The kind of plumbing update that quietly changes what you can run or breaks your build.",
        items: [
          { text: "vLLM v0.21.0 (May 15) if you deploy on Blackwell (Nvidia's current GPU generation): a new TOKENSPEED_MLA attention backend for DeepSeek-R1 / Kimi-K2.5 prefill and decode, plus KV-cache offload wired into the hybrid memory allocator. Two breaking changes to check before upgrading: C++20 is now required to build, and Transformers v4 is deprecated.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
        ],
      },
    ],
    watching: [
      { text: "EAGLE 3.1's headline numbers are on Kimi-K2.6-NVFP4 with MLA on GB200. Acceptance behavior on dense, non-MLA models and consumer GPUs is the open question before assuming the 2x carries to your stack.", source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-05-26-eagle-3-1" } },
      { text: "TurboQuant upstreaming into llama.cpp mainline. If TQ3/TQ4 land in master with the reported +30-50% throughput, sub-4-bit on CPU/edge gets a real default. Track discussion #20969.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
    ],
  },
  {
    date: "2026-05-29",
    range: "May 22 – May 29, 2026",
    tldr: [
      "DFlash landed in vLLM as a fourth speculative-decoding backend (next to eagle, eagle3, medusa). Single forward-pass drafting, claims 6x+ lossless speedup and up to 2.5x over EAGLE-3. If you serve local models, re-benchmark against it.",
      "Spec-decode is still architecture-dependent and breaks quietly: Gemma 4's official drafter will not load on vLLM, and Qwen 3.6 built-in MTP regresses on vLLM. Verify acceptance rate per model.",
      "The open-weight coding tier compressed hard. Four Chinese labs (GLM-5.1, MiniMax M2.7, Kimi K2.6, DeepSeek V4) shipped in a 12-day window at a similar agentic-coding ceiling, well under Western frontier cost.",
      "DeepSeek V4-Pro is $0.435 in / $0.87 out per Mtok with a 75% promo through May 31. Frontier-adjacent SWE-Bench at a near-throwaway price for two more days.",
      "Gemini 3.5 Flash shipped at $1.50/$9 per Mtok, 1M context, and reportedly beats Gemini 3.1 Pro on coding and agents.",
    ],
    sections: [
      {
        header: "// INFERENCE, QUANTIZATION & LOCAL",
        items: [
          { text: "DFlash is now exposed in vLLM Speculators (v0.20.1+) as a fourth spec-decode method. It drafts all tokens in one forward pass and conditions the drafter on target-model context features, lifting acceptance rates. Reported 6x+ lossless acceleration and up to 2.5x over EAGLE-3. If EAGLE-3 is your speed baseline, this is a lossless swap worth A/B-ing.", source: { label: "Medium / arXiv", url: "https://arxiv.org/pdf/2602.06036" } },
          { text: "Spec-decode gotchas from a hands-on audit this week: Gemma 4 runs on llama.cpp but its official drafter will not load on vLLM, and Qwen 3.6 built-in MTP shows losses on vLLM. Wins are per-architecture, not free, and a bad drafter pairing can net-slow you. Measure acceptance rate, not just tokens/sec.", source: { label: "Medium", url: "https://allenkuo.medium.com/when-speculative-decoding-helps-local-llms-and-when-it-doesnt-5c41dd804e4b" } },
          { text: "Quant format consolidation continues: AWQ and FP8 are settling in as the default GPU-side trade-off, while llama.cpp now carries sub-2-bit and 1-bit weight paths for edge memory savings. If you still default to GGUF Q4_K_M on GPU, AWQ/FP8 is the comparison to run.", source: { label: "n1n.ai", url: "https://explore.n1n.ai/blog/llm-inference-engine-comparison-vllm-tgi-tensorrt-sglang-2026-03-13" } },
        ],
      },
      {
        header: "// POST-TRAINING & RL",
        items: [
          { text: "Turn-level rewards keep beating trajectory-level rewards for tool-calling agents: per-turn reward in GRPO/PPO reports greater stability, faster convergence, and higher accuracy. If you train tool-use agents on a single end-of-episode reward, credit assignment is likely your bottleneck.", source: { label: "HF blog", url: "https://huggingface.co/blog/karina-zadorozhny/guide-to-llm-post-training-algorithms" } },
          { text: "GRPO-lambda targets the same gap with a lambda-style return on the group-relative advantage, reported to improve multi-step reasoning over vanilla GRPO. Relevant if your GRPO runs plateau on reasoning.", source: { label: "arXiv", url: "https://arxiv.org/pdf/2510.00194" } },
          { text: "Cheap RLHF lever: higher reward variance in the initial policy correlates with faster RLHF training, and a reward-adjustment step that raises variance speeds convergence. Low-cost to try before bigger changes.", source: { label: "arXiv", url: "https://arxiv.org/pdf/2505.23247" } },
        ],
      },
      {
        header: "// AGENTIC SYSTEMS & EVAL",
        items: [
          { text: "MCP tool-use eval is maturing past toy benchmarks. Frontier evals (Scale MCP Atlas, Tool-Decathlon) push longer interactions, more domains, and tools from real MCP servers, and test tool selection against distractor tool lists. If your eval hands the model only the correct tools, you are over-reporting reliability.", source: { label: "arXiv (MCPVerse)", url: "https://arxiv.org/pdf/2508.16260" } },
          { text: "Context limits remain the silent constraint on agent design: you cannot mount a large tool catalog, so most systems retrieve a few dozen tools per query. That retrieval step is part of what you are evaluating, not preprocessing. Build it into the harness.", source: { label: "arXiv (MCPEval)", url: "https://arxiv.org/pdf/2507.12806" } },
        ],
      },
      {
        header: "// FINE-TUNING & TRAINING SYSTEMS",
        items: [
          { text: "Unsloth + Training Hub (v0.4.0) drive LoRA/QLoRA on the Unsloth backend, reporting ~70% less VRAM than full fine-tune and ~2x faster than a standard LoRA pipeline, with FP8/FFT/PT paths and 500+ models. The practical line: an 8B model now fine-tunes on a single 12 GB consumer GPU.", source: { label: "Red Hat Developer", url: "https://developers.redhat.com/articles/2026/04/01/unsloth-and-training-hub-lightning-fast-lora-and-qlora-fine-tuning" } },
          { text: "Apple Silicon training is still the rough edge: MLX/MPS QLoRA works through llama.cpp paths but first-class training in Unsloth is listed as in progress. Mac-native workflows should expect to keep one foot in CUDA for training.", source: { label: "Unsloth docs", url: "https://unsloth.ai/docs/get-started/fine-tuning-llms-guide" } },
        ],
      },
      {
        header: "// BROADER FIELD",
        items: [
          { text: "Open-weight coding wave: GLM-5.1, MiniMax M2.7, Kimi K2.6, and DeepSeek V4 landed in a 12-day window at a similar agentic-engineering ceiling. Kimi K2.6 is the standout for long-horizon coding: MoE ~1T total / 32B active, Multi-head Latent Attention plus a ~400M MoonViT encoder, 256K context.", source: { label: "Release tracker", url: "https://www.digitalapplied.com/blog/ai-model-releases-may-2026-complete-tracker" } },
          { text: "Where the open tier sits vs closed: SWE-Bench Verified has DeepSeek V4-Pro at 82.6% vs Sonnet 5 at 92.4% (a real 10-point gap); MMLU-Pro at 86.3% vs GPT-5.5 at 90.1% (4 points). Close enough that cost, not capability, decides many pipelines.", source: { label: "llm-stats", url: "https://llm-stats.com/llm-updates" } },
          { text: "DeepSeek V4 pricing: V4-Pro $0.435 in / $0.87 out per Mtok (75% promo through May 31), V4-Flash $0.04 / $0.07. If you have eval or bulk-generation work queued, running it before June 1 is a real cost decision.", source: { label: "llm-stats", url: "https://llm-stats.com/llm-updates" } },
          { text: "Gemini 3.5 Flash: $1.50 / $9 per Mtok, 1M context, reported 76.2% on Terminal-Bench 2.1 and beating Gemini 3.1 Pro on coding and agents. The Flash tier now does work that needed Pro a release ago.", source: { label: "whatllm.org", url: "https://whatllm.org/blog/new-ai-models-may-2026" } },
          { text: "Kernel/framework housekeeping: cuDNN 9.7 adds FP8 convolution on Blackwell and fused attention for GQA; CUTLASS 3.9 adds Blackwell FP8 MMA tile shapes; PyTorch 2.9 ships the NVSHMEM Triton plugin for custom multi-GPU kernels. If you write Triton or target Blackwell, these change what you can fuse.", source: { label: "PyTorch blog", url: "https://pytorch.org/blog/pytorch-2-9/" } },
        ],
      },
    ],
    watching: [
      { text: "SubQ shipped what it calls the first commercial subquadratic LLM: 12M-token context, ~1/5 frontier cost on long-context, up to 52x faster attention at scale. Vendor figures, no independent confirmation. If even half holds, it changes long-context RAG and agent-memory economics.", source: { label: "whatllm.org", url: "https://whatllm.org/blog/new-ai-models-may-2026" } },
      { text: "DFlash acceptance-rate behavior on MoE models (Kimi K2.6, DeepSeek V4) is the open question. Spec-decode gains have been uneven on sparse architectures; watch for real numbers as people wire it up.", source: { label: "arXiv", url: "https://arxiv.org/pdf/2602.06036" } },
      { text: "Data-selection methods (BLISS-style bilevel influence scoring, ~1.7x speedup to match SOTA at 1B scale) are creeping toward practical pretraining budgets. Not a default yet, but the speedup-per-dollar story is getting hard to ignore.", source: { label: "arXiv", url: "https://arxiv.org/pdf/2510.06048" } },
    ],
  },
];
