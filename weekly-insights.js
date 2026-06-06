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
