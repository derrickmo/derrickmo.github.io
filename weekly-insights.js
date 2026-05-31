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
        header: "// INFERENCE, QUANTIZATION & LOCAL",
        items: [
          { text: "EAGLE 3.1 fixes attention drift, where the drafter shifts attention off sink tokens as speculation depth grows and acceptance craters under long context, unusual chat templates, and OOD system prompts. The fix is FC normalization after each target hidden state plus feeding post-norm hidden states forward, so drafting behaves like recursive invocation. Up to 2x longer acceptance vs EAGLE 3. On Kimi-K2.6-NVFP4 (vLLM, TP=4, GB200): 2.03x per-user throughput at C=1, 1.71x at C=4, 1.66x at C=16. Config-driven, backward compatible, ships in v0.22.0. If you run EAGLE 3, it is a drop-in drafter upgrade.", source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-05-26-eagle-3-1" } },
          { text: "llama.cpp merged MTP speculative decoding (PR #22673) against Qwen 3.6 MTP heads. Dense 27B gets ~2x single-user throughput. The 35B-A3B MoE is the gotcha: at batch=1 every drafted token can pull a different expert slice, the verifier loads the union, and multiple RTX 3090 benchmarks show no net speedup over the autoregressive baseline. Production servers amortize via batching; solo MoE users should measure before assuming a win.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
          { text: "TurboQuant (ICLR 2026, Zandieh et al.) is being tracked into llama.cpp (discussion #20969) with a working CPU implementation passing 18/18 tests, MSE within 1% of paper. TQ3 gives 4.9x compression vs FP16, TQ4 gives 3.8x. Community forks bundling it with Gemma 4 MTP and Qwen 3.6 NextN drafting report +30-50% throughput. A next-gen sub-4-bit path to watch.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
          { text: "MLX on M5: every M5 GPU core now has dedicated matmul hardware (Neural Accelerators), and MLX is the only framework that targets them. Up to 4x faster TTFT, 3.8x faster 1024x1024 FLUX-dev-4bit, 30-60% across most workloads vs M4. Hard requirement: macOS 26.2 and MLX 0.30+. Ollama and LM Studio both lean harder on MLX as their Apple-Silicon backend, so you run it regardless of wrapper.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
        ],
      },
      {
        header: "// AGENTIC SYSTEMS & EVAL",
        items: [
          { text: "Claude Opus 4.8 dynamic workflows: Claude Code plans a large task, fans out hundreds of parallel subagents, then verifies their outputs against your test suite. Pitched for hundreds-of-thousands-of-LoC refactors, with effort control (Low/Medium/High/xHigh/Max) across claude.ai, Cowork, and Claude Code. Anthropic reports it is ~4x less likely than 4.7 to let a flaw in its own code pass unflagged, which matters more for autonomous multi-agent runs than a headline benchmark point.", source: { label: "Codersera", url: "https://codersera.com/blog/claude-opus-4-8-launch-guide-2026/" } },
          { text: "Qwen WebWorld (8B/14B/32B, Apache 2.0) is an open-weight web world model: predict the next browser state given current state plus action, so you can train web agents in simulation instead of the live web. Trained on 1.06M real interaction trajectories. WebWorld-32B hits 71.0% average Factuality vs Claude-Opus-4.1 at 71.3%; Qwen3-14B trained on its synthesized trajectories improves +9.2% on WebArena. A usable open simulator and dataset for browser-agent RL.", source: { label: "arXiv", url: "https://arxiv.org/abs/2602.14721" } },
          { text: "Agent benchmark reality check from this week's roundups: scaffold dominates the score. The same base model swings widely on Terminal-Bench depending on harness (Terminus vs ForgeCode), so a single leaderboard number is near meaningless without the scaffold. If you compare agents, fix the scaffold or report it.", source: { label: "Codersera", url: "https://codersera.com/blog/ai-agent-benchmarks-state-of-leaderboard-may-2026/" } },
        ],
      },
      {
        header: "// BROADER FIELD",
        items: [
          { text: "Claude Opus 4.8 (May 28): 88.6% SWE-bench Verified, 69.2% SWE-bench Pro, 74.6% Terminal-Bench 2.1, 93.6% GPQA Diamond, GDPval-AA 1890 (+121 Elo over GPT-5.5). Pricing held at $5 in / $25 out per Mtok; new Fast mode is 3x cheaper than Opus 4.7's at $10/$50. The pricing-flat, capability-up release is the pattern to budget around.", source: { label: "llm-stats", url: "https://llm-stats.com/blog/research/claude-opus-4-8-launch" } },
          { text: "vLLM v0.21.0 (May 15) if you deploy on Blackwell: new TOKENSPEED_MLA attention backend for DeepSeek-R1 / Kimi-K2.5 prefill+decode, spec decode now respects reasoning/thinking budgets (a prior quiet correctness bug), KV Offload integrates with the Hybrid Memory Allocator. Breaking: C++20 required, Transformers v4 deprecated.", source: { label: "Codersera", url: "https://codersera.com/blog/local-ai-runtimes-may-2026-update/" } },
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
