// weekly-insights.js — single source of truth for the Weekly Insights feed.
// Newest entry first. The Sunday Cowork digest task prepends ONE object here;
// no other code needs to change to publish a new week.
//
// Entry shape (every field required unless noted):
//   {
//     date: "YYYY-MM-DD",                         // ISO date, used for sort + anchor id
//     range: "Month D to Month D, YYYY",          // human range
//     tldr: [ "string", ... ],                    // bullet points (no source needed)
//     sections: [                                 // exactly three: Academic research,
//       {                                         //   Industry practices, New frameworks
//         header: "// ACADEMIC RESEARCH",
//         intro: "one plain-language sentence",   // no source
//         items: [ {
//           title: "short lead",                  // optional
//           whatsNew: "what changed",
//           howItWorks: "the mechanism, jargon glossed",
//           impact: "implementation / why it matters",
//           source: { label: "string", url: "https://..." }  // PRIMARY artifact
//         } ]
//       }
//     ],
//     watching: [ { text: "string", source: { label, url } } ]  // optional
//   }
//
// Sourcing rule: every item.source.url must point to a primary artifact
// (official blog/release notes, arXiv, GitHub PR, model card, lab report),
// not a secondary aggregator. Keep this file bounded to the most recent ~12
// weeks; older entries live as dated archives in _private/digests/.

window.WEEKLY_INSIGHTS = [
  {
    date: "2026-06-07",
    range: "June 1 to June 7, 2026",
    tldr: [
      "RL Excursions during Pre-Training (Kakade group, arXiv 2606.04272, Jun 2): RL is effective on base pre-training checkpoints, not just after SFT. Targeted pre-training data composition beats model scale as a lever for RL gains, and parallel-averaging RL and SFT objectives outperforms SFT-then-RL while preserving general capabilities.",
      "NVIDIA Nemotron 3 Ultra (Jun 4): 550B total / 55B active hybrid Transformer-Mamba MoE, 1M context, NVFP4, day-0 in vLLM v0.22.0. One NVFP4 checkpoint runs on both Hopper and Blackwell. Post-trained with multi-environment RL for agent harnesses.",
      "Session-Aware Agentic Routing (SAAR, Jun 2) in vLLM Semantic Router cuts model switches 79.29% across 21,600 turns and drives tool-loop and provider-state switch violations to zero. The point: a router behind 'auto' must know when switching mid-session is unsafe.",
      "AutoRound W4A16 is now in vLLM-Omni (Jun 2): Qwen3-Omni-30B drops from 66 GB to 25 GB with no quality loss, and FLUX.1-dev goes from needing 4 GPUs to 1.",
      "Watchlist resolution: last week's two items (EAGLE 3.1 on dense consumer GPUs; TurboQuant in llama.cpp mainline) are both still open, with no in-window primary confirmation this week.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later. Primary sources here are arXiv and official lab pages.",
        items: [
          {
            title: "RL Excursions during Pre-Training: re-examining where RL belongs in the pipeline",
            whatsNew: "Bansal, Mohri, Qin, Alvarez-Melis, and Kakade (arXiv 2606.04272, submitted Jun 2 2026) question the standard pipeline that applies RL only after pre-training and SFT. They train an LLM from scratch and apply RL, SFT, and SFT-then-RL directly to intermediate pre-training checkpoints.",
            howItWorks: "Rather than waiting for a finished base model, they run policy optimization on partially-trained checkpoints and compare it head-to-head with SFT and the usual SFT-then-RL recipe. SFT (supervised fine-tuning) imitates demonstration data; RL optimizes a reward directly. 'Sharpening' means RL concentrating probability mass on already-likely outputs rather than expanding what the model can produce. They also merge RL and SFT by parallel averaging, averaging the two separately-trained weight sets.",
            impact: "Three practitioner takeaways. (1) RL is effective very early and often matches the full SFT-then-RL pipeline, so RL is not strictly a final-stage tool. (2) Targeted pre-training data composition is a stronger lever for RL effectiveness than model scale, which reorders where to spend budget on hard problems. (3) RL on base checkpoints expands the output distribution and leaves general capabilities essentially unchanged, while SFT degrades them; the reported sharpening only appears when RL follows SFT. Parallel-averaging the two objectives outperformed every other method tested across metrics while preserving general capabilities.",
            source: { label: "arXiv 2606.04272", url: "https://arxiv.org/abs/2606.04272" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing moves, and deployment gotchas. Primary sources are vendor announcements and the original engineering threads.",
        items: [
          {
            title: "NVIDIA Nemotron 3 Ultra, day-0 on vLLM",
            whatsNew: "NVIDIA released Nemotron 3 Ultra, an open-weights (open data, open recipes) frontier reasoning model aimed at long-running autonomous agents, with day-0 support in vLLM v0.22.0. 550B total parameters, 55B active, context up to 1M tokens.",
            howItWorks: "A hybrid Transformer-Mamba mixture-of-experts (MoE) stack. Mamba layers (linear-time state-space sequence layers) carry long-context efficiency; Transformer attention layers preserve precise recall for fact retrieval. It uses a latent MoE for routing and multi-token prediction (MTP, predicting several future tokens per forward pass) for decode throughput. It was post-trained with multi-environment RL via NeMo RL and Gym across many agent harnesses, optimized for plan/tool-call/observe/recover loops rather than single-turn chat. NVFP4 is NVIDIA's 4-bit floating-point serving format.",
            impact: "The same NVFP4 checkpoint runs on both Hopper and Blackwell, so one artifact carries across GPU generations. Hardware floors: NVFP4 needs 4x GB200/B200/GB300/B300 or 8x H100; BF16 needs 8x B200, 16x H100, or 8x H200. NVIDIA claims leading throughput and ~30% cost savings versus other leading open models (measured at 10k/2k input/output, batch size 1, on vLLM). The serve recipe is published: TP 8, --kv-cache-dtype fp8, --max-num-seqs 16, --max-model-len 262144, MTP with 5 speculative tokens, --mamba-backend triton.",
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-06-04-nemotron-3-ultra-vllm" },
          },
          {
            title: "Session-Aware Agentic Routing (SAAR) in vLLM Semantic Router",
            whatsNew: "SAAR is a session-aware model-selection policy for long-horizon agents. Single-turn routers pick the best model for the current message but do not know when switching mid-session breaks correctness. SAAR adds router-owned session memory, hard locks, reset boundaries, prefix-cache-aware switch pricing, and replayable traces.",
            howItWorks: "It keeps the existing semantic-routing pipeline and wraps a session-control layer around the result. Two hard locks hold the previous physical model: tool-loop continuity (a tool result must return to the model that requested it) and provider-managed state (a non-portable continuation id stays on its backend). Reset boundaries (idle timeout, decision drift) reopen selection so the policy does not degrade into sticky sessions. Switch economics price the cached-input checkout delta, the input-token cost of abandoning a warm prefix cache, so switching away from a long warm session is penalized. Every decision writes a replay trace, making routing behind a logical 'auto' model inspectable.",
            impact: "Across 21,600 deterministic turns, full SAAR cut switches 79.29% and reduced estimated physical-model cost 78.71% versus single-turn routing, with a small quality delta (-0.0453) versus sticky sessions' larger drop (-0.1433). Tool-loop switch violations went 3,404 to 0; provider-state violations 432 to 0. In live AMD ROCm serving, 2,896 requests completed with 0 continuity violations and p95 routing overhead of 6.181 ms on the balanced workload. For anyone running a model portfolio behind one logical endpoint for agents, this is the missing correctness layer.",
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-06-02-session-aware-agentic-routing" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support. Primary sources are official release notes and project blogs.",
        items: [
          {
            title: "vLLM on NVIDIA DGX Spark: a tested local-serving recipe",
            whatsNew: "A deep-dive on running vLLM on the DGX Spark (GB10 desk-side system), covering the sm_121 consumer Blackwell target, unified-memory behavior, NVFP4 serving, and a measured single-Spark evaluation on Nemotron-3-Super-120B-A12B-NVFP4.",
            howItWorks: "DGX Spark has one 128 GB pool shared by CPU, GPU, OS, container runtime, weights, and KV cache, so serving flags must leave headroom. The post recommends --gpu-memory-utilization tuned for the shared pool and --max-num-seqs 4 because above four concurrent decode streams the per-token bandwidth tax outweighs continuous-batching gains and TTFT (time-to-first-token) spikes. NVFP4 MoE models with roughly 10-15B active parameters are the sweet spot; the unified pool makes loading NVFP4 models up to ~200B parameters practical. The recipe uses the official vllm/vllm-openai:cu130-nightly image and the nemotron_v3 reasoning parser.",
            impact: "Concrete local-serving numbers. On a 120B-A12B NVFP4 MoE on one Spark, measured decode throughput held in a narrow 22.7-23.7 tok/s band across prompts from 58 to 7,234 tokens; prefill scaled from 140 to ~1,900 tok/s as prompts grew. KV-cache utilization rarely topped 2% during interactive use. First weight load is 10-15 minutes with the default safetensors path (evaluate fastsafetensors or InstantTensor if it matters), and the first request after boot triggers ~25 s of JIT codegen, so pre-warm with a dummy max_tokens=3 call. Realistic expectation for a desk-side box: single-user/small-batch large-model serving, not high concurrency.",
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-06-01-vllm-dgx-spark" },
          },
          {
            title: "AutoRound W4A16 lands in vLLM-Omni",
            whatsNew: "Intel's AutoRound post-training quantization (PTQ) is now integrated into vLLM-Omni, bringing W4A16 (4-bit weight, 16-bit activation) to multimodal Omni, diffusion image, and video-diffusion pipelines with a quantize-once, serve-directly flow.",
            howItWorks: "AutoRound is a tuning-based PTQ that jointly optimizes rounding and clipping with three learnable parameters per tensor (V for rounding offset, alpha and beta for clip range), giving better low-bit accuracy than round-to-nearest while producing a static checkpoint with no inference-time quantization overhead. vLLM-Omni reads quantization_config.quant_method = 'auto-round' from checkpoint metadata and selects the matching backend, so the serving API is identical to a normal load (no --quantization flag). Roughly 128 calibration samples and ~200 optimization iterations are usually enough to converge.",
            impact: "Large memory wins with quality preserved. Qwen3-Omni-30B-A3B drops 62%, from 66 GB to 25 GB, and its W4A16 variant slightly beat its BF16 reference on OmniBench while keeping text-to-image quality drift to ~1.3% on TIIF-Bench. The deployment unlock is sharper: BF16 FLUX.1-dev (23 GB transformer) needs TP=4 to serve on Intel XPU B60, while the 7 GB W4A16 transformer fits on a single GPU with headroom; freeing GPUs enables CFG Parallel (running both classifier-free-guidance branches at once) for a 1.55-1.67x guided-generation speedup. Verified on both Intel XPU and NVIDIA; MXFP4/MXFP8 support is listed as in progress.",
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-06-02-vllm-omni-autoround" },
          },
        ],
      },
    ],
    watching: [
      { text: "The RL Excursions claim that parallel-averaging RL and SFT objectives outperforms SFT-then-RL across metrics while preserving general capabilities. If it reproduces at larger scale and on standard harnesses, it changes default post-training recipes.", source: { label: "arXiv 2606.04272", url: "https://arxiv.org/abs/2606.04272" } },
      { text: "NVIDIA's claim that Nemotron 3 Ultra leads open models on throughput and saves ~30% on cost (10k/2k ISL/OSL, BS 1). Worth checking against independent benchmarks rather than the vendor figure.", source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-06-04-nemotron-3-ultra-vllm" } },
      { text: "Carryover: EAGLE 3.1's 2x acceptance gains on dense, non-MLA consumer GPUs and TurboQuant reaching llama.cpp mainline both remain unconfirmed by a primary source as of this week.", source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-05-26-eagle-3-1" } },
    ],
  },
  {
    date: "2026-05-31",
    range: "May 24 to May 31, 2026",
    tldr: [
      "EAGLE 3.1 fixes 'attention drift', the reason speculative decoding lost speed under long context and unusual prompts. Up to 2x longer acceptance length, backward compatible with EAGLE 3 checkpoints, ships in vLLM v0.22.0.",
      "Claude Opus 4.8 (May 28) added dynamic workflows: it runs hundreds of parallel subagents in one session and verifies them against your test suite. Reportedly ~4x less likely than 4.7 to let a flaw in its own code pass. Price flat at $5/$25 per Mtok.",
      "Qwen WebWorld is an open-weight web world model (Apache 2.0) that simulates a browser so you can train web agents off the live internet. WebWorld-32B matches Opus-4.1 on factuality.",
      "TurboQuant (ICLR 2026), a near-optimal sub-4-bit quantization method, is being ported into llama.cpp.",
      "Sourcing note: every item below cites a primary source. The check dropped several items the aggregators had relabeled as current (Apple's MLX-on-M5 note is from Nov 2025).",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later. Primary sources here are arXiv and official lab pages.",
        items: [
          {
            title: "Qwen WebWorld: an open web world model for training agents",
            whatsNew: "Alibaba released WebWorld (8B/14B/32B, Apache 2.0), an open-weight web world model, a model that simulates a browser so you can train web agents against it instead of the live internet.",
            howItWorks: "Given the current page state plus an action, it predicts the next page state. It was trained on 1.06M real browsing trajectories, so the simulated responses stay close to how real sites behave.",
            impact: "WebWorld-32B scores 71.0% average Factuality, matching Claude-Opus-4.1 (71.3%), and a Qwen3-14B agent trained purely on its simulated rollouts gains +9.2% on WebArena. For agent RL this is a usable open environment plus dataset, with no live-web flakiness or rate limits.",
            source: { label: "arXiv 2602.14721", url: "https://arxiv.org/abs/2602.14721" },
          },
          {
            title: "TurboQuant: near-optimal sub-4-bit quantization, heading into llama.cpp",
            whatsNew: "TurboQuant (ICLR 2026) is a quantization method with provably near-optimal distortion at any bit-width, and a working CPU implementation is being ported into llama.cpp.",
            howItWorks: "Quantization stores model weights at lower precision to save memory. TurboQuant randomly rotates each weight vector, which makes its coordinates follow a predictable distribution, then applies the optimal simple per-coordinate quantizer. The rotation is data-oblivious, so it runs online with no calibration set.",
            impact: "It targets the sub-4-bit range below llama.cpp's usual 4-bit floor while keeping reconstruction error near the theoretical minimum, the regime where quality normally breaks. If it lands in mainline, it means a smaller memory footprint for local models without the usual accuracy cliff.",
            source: { label: "arXiv 2504.19874", url: "https://arxiv.org/abs/2504.19874" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing moves, and deployment gotchas. Primary sources are vendor announcements and the original engineering threads.",
        items: [
          {
            title: "Claude Opus 4.8 and dynamic workflows (Anthropic, May 28)",
            whatsNew: "Anthropic shipped Opus 4.8 plus a 'dynamic workflows' research preview in Claude Code and an effort control (Low to Max) in claude.ai and Cowork.",
            howItWorks: "In dynamic workflows, Claude plans a large task, runs hundreds of parallel subagents (separate model instances each handling a slice) in one session, then verifies their outputs against your existing test suite before reporting back. Opus 4.8 was also trained for honesty: to flag uncertainty rather than claim unsupported progress.",
            impact: "It is pitched for codebase-scale migrations across hundreds of thousands of lines, kickoff to merge. Anthropic reports it is ~4x less likely than 4.7 to let a flaw in its own code pass unremarked, the property that matters when subagents run unattended. Pricing is flat at $5/$25 per Mtok; fast mode is $10/$50 at 2.5x speed, 3x cheaper than the prior fast tier.",
            source: { label: "Anthropic", url: "https://www.anthropic.com/news/claude-opus-4-8" },
          },
          {
            title: "llama.cpp MTP: a real win on dense models, a trap on MoE",
            whatsNew: "Multi-Token Prediction (MTP) speculative decoding merged into llama.cpp (PR #22673), letting a model draft its own next tokens from built-in heads, with no separate draft model.",
            howItWorks: "The MTP heads load from the same GGUF file and guess a few tokens ahead; the main model verifies them in one pass. The PR reports about 75% acceptance at 3 draft tokens.",
            impact: "On dense Qwen 3.6 27B it lifts decode ~1.85-1.9x (roughly 23 to 42 tok/s). But on the 35B-A3B mixture-of-experts model (only a few expert sub-networks fire per token) at batch size 1, each drafted token can wake a different expert and the verifier must load all of them, so the gain can vanish. The rule: MTP is close to free on dense, but measure on MoE before relying on it.",
            source: { label: "llama.cpp PR #22673", url: "https://github.com/ggml-org/llama.cpp/pull/22673" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support. Primary sources are official release notes and project blogs.",
        items: [
          {
            title: "EAGLE 3.1 speculative decoding (EAGLE team / vLLM / TorchSpec, May 26)",
            whatsNew: "EAGLE 3.1 fixes 'attention drift', the reason speculative decoding (a small draft model guesses several tokens, the large model verifies them in one pass) lost speed under long context, odd chat templates, or unusual system prompts.",
            howItWorks: "As the drafter guesses deeper it drifts attention off the early 'sink' tokens toward its own output. EAGLE 3.1 adds FC normalization on each target hidden state and feeds the normalized state forward, so drafting behaves like calling the drafter recursively. It is config-driven and backward compatible with EAGLE 3 checkpoints.",
            impact: "Up to 2x longer acceptance length on long context; on Kimi-K2.6 (NVFP4, a 4-bit serving format) on a GB200 it delivered 2.03x per-user throughput at one concurrent request. It ships in vLLM v0.22.0 as a drop-in drafter upgrade, so existing EAGLE 3 setups can adopt it without retraining.",
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-05-26-eagle-3-1" },
          },
          {
            title: "vLLM v0.21.0: DeepSeek V4 and Blackwell hardening",
            whatsNew: "vLLM's v0.21.0 stable release focused on DeepSeek V4 and Nvidia Blackwell (the current GPU generation), adding a new TOKENSPEED_MLA attention backend.",
            howItWorks: "TOKENSPEED_MLA (#41778) handles DeepSeek-R1 / Kimi-K2.5 prefill and decode on Blackwell, alongside faster FP8 group-quant kernels and a persistent MLA path for the sparse backend. The FlashInfer top-k/top-p sampler is now on by default.",
            impact: "It is the current production-grade path for DeepSeek-class models on Blackwell. Two breaking changes to check before upgrading: C++20 is now required to build, and Transformers v4 is deprecated.",
            source: { label: "vLLM v0.21.0 release", url: "https://github.com/vllm-project/vllm/releases/tag/v0.21.0" },
          },
        ],
      },
    ],
    watching: [
      { text: "EAGLE 3.1's headline numbers are on Kimi-K2.6 (NVFP4, MLA attention) on a GB200. Whether the 2x carries to dense, non-MLA models on consumer GPUs is the open question before you assume it for your stack.", source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-05-26-eagle-3-1" } },
      { text: "TurboQuant landing in llama.cpp mainline. If the sub-4-bit path ships with near-paper quality, it becomes a new default for memory-constrained local models. Tracking against the method paper.", source: { label: "arXiv 2504.19874", url: "https://arxiv.org/abs/2504.19874" } },
    ],
  },
];
