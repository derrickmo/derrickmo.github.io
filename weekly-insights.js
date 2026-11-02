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
    date: "2026-11-01",
    range: "October 26 to November 1, 2026",
    tldr: [
      "Watchlist: Mistral Large 4 weights shipped about Oct 29 under a modified-MIT license with a Model-as-a-Service carve-out (see Update below). SGLang v0.5.23 (Oct 30) now pins FlashInfer 0.7.2, while vLLM's latest release is still v0.32.0 on 0.7.0.post1 and only vLLM main pins 0.7.2.post1. MRV2 sequence parallelism is still unchecked and the MRV1 runner is still in the tree. The Gemini deep-research preview shutdown is still unconfirmed on the changelog.",
      "What outcome RL buys: across 20 public RL models, 82% of the pass@1 change at 4k to 8k token budgets is just finishing before the budget runs out, and new problems solved add at most 2.1 points. S3AC shows a critic recipe that beats a modern GRPO variant from 1.5B to 397B.",
      "Cloudflare disclosed that SGLang prefill/decode disaggregation served stale KV pages across users for 155 over-length requests; upgrade to SGLang v0.5.22+ and check KV pool size against advertised context on every node.",
      "PyTorch 2.15 makes the rewritten NCCL backend the default nccl (TORCH_DIST_USE_NCCL2=0 or nccl-legacy to roll back), changes FSDP2 grad dtype behavior when reduce_dtype=None, and drops Python 3.10.",
      "Cheap compression wins: WISD self-distills against a pruned or quantized copy of the model for +5.5 pp with no labels, ThinkBit fits Qwen3-14B in 3.74 GB at 94.8 MATH-500, and top-k channel selection reads 17.8% of expert weights at 98.1% accuracy. GPT-6.1 Terra lands at $1 and $5 per Mtok.",
    ],
    sections: [
      {
        header: "// POST-TRAINING, RL AND AGENT DATA",
        intro: "Where outcome RL gains actually come from, a critic recipe that scales, self-distillation without a stronger teacher, and web environments built from real URLs.",
        items: [
          {
            title: "What outcome RL buys: 82% of the pass@1 change at 4k to 8k budgets is finishing on time",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Compares 20 public RL models (1.5B to 32B) with the thinking models they started from on math and physics at fixed token budgets, splitting each pass@1 change into finishing, reliability and reach.",
                  "At 4k and 8k budgets, 82% of the change is finishing, meaning the model answers before the budget runs out; with more tokens the base closes most of that gap itself.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Reach, problems the RL model solves that the base misses on all 8 samples minus the reverse, adds at most 2.1 points on any of the four datasets.",
                  "Of 144 physics problems only the RL model solved, 3.5% held up on resampling or re-reading, and 9 of 10 human-confirmed new RL solution steps already appeared in base samples.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Report pass@1 at several token budgets and log truncation rate next to accuracy, or a length-control win will look like a capability gain.",
                ],
              },
            ],
            source: { label: "arXiv 2610.34894", url: "https://arxiv.org/abs/2610.34894" },
          },
          {
            title: "S3AC: a critic recipe that beats GRPO-X from 1.5B to 397B and keeps improving on one rollout per prompt",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "An actor-critic method for long chain-of-thought RLVR where the critic supplies per-token advantages and per-prompt baselines in place of group baselines. It beats a modern GRPO variant (GRPO-X) on dense and MoE models from 1.5B to 397B.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Targets two critic failure modes on long traces: too few trajectories of varied length, and a freshly initialized value head dominating early gradients.",
                  "Difficulty-Aware Prompt Sampling (DAPS) uses the critic baseline plus each prompt's outcome history to pick prompts before generation, with no offline difficulty labels.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "DAPS-style pre-generation filtering is the liftable part if your GRPO runs waste rollouts on always-solved or never-solved prompts.",
                  "At 35B S3AC keeps improving with a single rollout per prompt while the critic-free baselines decline after early gains.",
                ],
              },
            ],
            source: { label: "arXiv 2610.35518", url: "https://arxiv.org/abs/2610.35518" },
          },
          {
            title: "WISD: self-distill against a quantized or pruned copy of yourself, +5.5 pp with no labels",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Weakening-Induced On-Policy Self-Distillation builds a weaker copy of the model by low-bit quantization or magnitude pruning and trains on the difference, so it needs only unlabeled prompts.",
                  "Average gains on math and coding reasoning: +4.0 pp with quantization as the weakener, +5.5 pp with pruning.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "Qwen3.5-4B with pruning: HMMT 2025 57.7% to 70.5%, LiveCodeBench v6 39.1% to 56.7%.",
                  "Qwen3.6-35B-A3B with quantization: HMMT 2025 68.5% to 74.6%, LiveCodeBench v6 61.8% to 69.5%.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "With prompts but no verifier or stronger teacher, this is a cheap post-RL step; the weakened model is a quant or prune you can make in minutes. The paper is marked work in progress.",
                ],
              },
            ],
            source: { label: "arXiv 2610.38681", url: "https://arxiv.org/abs/2610.38681" },
          },
          {
            title: "WebAnything rebuilds 244 resettable web environments from real URLs; 5,856 trajectories add 13.3 pp on WebArena-Verified",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "A fully automated pipeline turns real URLs into executable, resettable training environments: an Explorer-Builder captures page structure, resources and interaction results, and a separate verifier triggers repairs or re-captures.",
                  "Output: 244 sites across 14 domains and 53 categories, with 12,984 executed and accepted tasks.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "Blind fidelity audit vs the human-assisted WebHarbor mirrors: 12 wins, 2 ties, 0 losses on three metrics.",
                  "Qwen3.5-9B fine-tuned on 5,856 trajectories: +9.9 pp on REAL, +6.32 pp Odysseys-Easy task average, +13.33 pp WebArena-Verified overall.",
                ],
              },
            ],
            source: { label: "arXiv 2610.37786", url: "https://arxiv.org/abs/2610.37786" },
          },
        ],
      },
      {
        header: "// TRAINING SYSTEMS",
        intro: "A one-line MTP loss fix and a PyTorch release that changes NCCL and FSDP2 defaults under you.",
        items: [
          {
            title: "Soft-MTP: drop the noisy residual of the MTP gradient and keep only the KL term",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "The MTP cross-entropy gradient splits exactly into a KL self-distillation term, pulling each MTP head toward the model's own next-token distribution, and a low-SNR residual that interferes with both NTP and MTP and gets worse with scale.",
                  "Soft-MTP backpropagates only the KL part: a one-line change for DeepSeek-style and Meta-style MTP, with no extra parameters and no measurable overhead.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "With a shared linear output head, the KL gradient is recovered exactly from cross-entropy gradients by straight-through routing, so no vocab-sized logit matrices are needed and fused CE kernels still work.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "At 167M to 1.2B it beats standard MTP at every scale on NTP perplexity, speculative decoding speed and zero-shot accuracy. If you pretrain MTP heads for spec decode, this is a cheap ablation.",
                ],
              },
            ],
            source: { label: "arXiv 2610.38331", url: "https://arxiv.org/abs/2610.38331" },
          },
          {
            title: "PyTorch 2.15: the rewritten NCCL backend becomes nccl, FSDP2 grad dtypes change, Python 3.10 dropped",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Every job using nccl now runs on the rewritten backend (previewed as nccl2 in 2.14), which creates communicators eagerly and adds a flight recorder that dumps state on hangs.",
                  "FSDP2 can keep router gates and norms in fp32, set per-parameter gradient dtype, and capture full gradient accumulation in one CUDA graph.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Roll back with TORCH_DIST_USE_NCCL2=0 or backend name nccl-legacy. FSDP2 now separates sharded and unsharded gradient dtypes, which changes default behavior when reduce_dtype=None (PR #194434).",
                  "Python 3.10 is gone; 3.11 to 3.15 are supported, including free-threaded 3.14t and 3.15t. ROCm wheels no longer bundle ROCm libraries.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "The default wheel moves to CUDA 13.2, with CUDA 13.4 wheels alongside that add experimental Rubin support.",
                  "Rerun a multi-node smoke test and a mixed-precision FSDP2 loss comparison before upgrading training images; no speedup figure is given for the NCCL rewrite.",
                ],
              },
            ],
            source: { label: "PyTorch blog", url: "https://pytorch.org/blog/pytorch-2-15-release-blog/" },
          },
        ],
      },
      {
        header: "// INFERENCE, QUANTIZATION AND SERVING",
        intro: "Faster MoE decoding at batch one, a 2-bit format judged on reasoning, day-0 Mistral Large 4 serving numbers, and a KV cache leak post-mortem.",
        items: [
          {
            title: "Cloudflare post-mortem: SGLang P/D disaggregation served stale KV pages across users on over-length prompts",
            parts: [
              {
                label: "What happened",
                bullets: [
                  "GLM-5.3 on Workers AI advertised a 1,048,576-token context but its prefill KV pool held only 681,280 tokens, because SGLang sizes the pool from leftover GPU memory. 155 responses to longer prompts, from Aug 27 to Sep 9, could contain data from other users' requests.",
                  "A rejected over-length request got a 1-token placeholder; the admission check used finished(), which is False for rejected requests, so prefill sent 1 KV page while decode had reserved 8 and attended over stale ones. The client got HTTP 200. KV pages are not zeroed between requests.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Upgrade to SGLang v0.5.22 or later. After any change to weights, quantization, parallelism or memory settings, check KV pool size against context length in every prefill and decode node's startup log.",
                  "Turn on --disaggregation-enable-kv-checksum and --kv-canary where your architecture supports them, and confirm in logs that requests are actually verified. Tests that check only status codes would not have caught this.",
                ],
              },
            ],
            source: { label: "Cloudflare blog", url: "https://blog.cloudflare.com/kv-cache-exposure-remediation/" },
          },
          {
            title: "MoE channel selection: drop calibrated thresholds for top-k; the new reader is 1.6 to 1.9x faster than vLLM at batch 1",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Calibrated thresholds do not control how many weights a selector reads: Prox, calibrated for an 18% budget, read 12.9%. Per-token top-k needs no calibration data and matched or beat thresholding in 40 of 43 comparisons, including all 23 generation tasks.",
                  "Calibrated thresholds caused repetition-loop collapse on Gemma 4; top-k avoids it.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "A calibration-free reader screens channels with a ternary sketch of the model's own weights and recovers skipped channels with a low-rank map.",
                  "Keeps 98.1% of full accuracy reading 17.8% of routed-expert weights across three MoE models; Triton kernels run MoE blocks 1.60 to 1.90x faster than optimized vLLM at batch 1 and up to 2.69x at larger batches.",
                ],
              },
            ],
            source: { label: "arXiv 2610.37386", url: "https://arxiv.org/abs/2610.37386" },
          },
          {
            title: "ThinkBit: scalar 2-bit quantization judged on reasoning, Qwen3-14B in 3.74 GB at 94.8 MATH-500",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Argues that 2-bit methods judged on perplexity and multiple choice hide reasoning damage. ThinkBit is strictly scalar, an integer codeword times a bf16 group scale, so it stays kernel-friendly.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "A sensitivity metric assigns each layer to ternary, 2-bit or 3-bit; Gumbel-softmax codeword search runs block by block; scales are recalibrated with a KD loss on frozen codewords; a short QAT stage follows, and a paired reasoning test picks the checkpoint.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "Qwen3-1.7B: 46.7 MATH-500 after recalibration vs 30.0 for EfficientQAT on the same data, 73.0 after QAT on reasoning traces, at 0.52 GB.",
                  "Qwen3-14B at 3.74 GB scores 94.8 on MATH-500 vs 97.5 for the 29.5 GB bf16 model.",
                ],
              },
            ],
            source: { label: "arXiv 2610.34886", url: "https://arxiv.org/abs/2610.34886" },
          },
          {
            title: "vLLM day-0 Mistral Large 4: NVFP4 on 4 Blackwell GPUs, DSpark spec decode up to 2.2x, and a host KV offload crash flag",
            parts: [
              {
                label: "Deployment profile",
                bullets: [
                  "FP8 runs at TP8. NVFP4 runs on 4 Blackwell GPUs at TP4, holds about 1.5x the KV cache, decodes 1.08 to 1.19x faster than FP8 at TP8, and stays within 2.1 points of FP8 on every evaluated task. Model runner V2 only; image vllm/vllm-openai:mistral-large-4.",
                  "KV is 47,136 bytes per token, with only 63 of 72 layers holding KV. DCP8 raises KV capacity from 2.38M to 18.88M tokens on FP8 but decodes 16 to 28% slower than TP8.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "DSpark at TP8, concurrency 1: TPOT 8.84 to 3.50 ms on FP8 (acceptance length 2.90), output throughput 1.9 to 2.2x. At T=1.5, set draft_sample_method to probabilistic.",
                  "On AMD MI350X the Quark MXFP4 checkpoint is about 578 GB and fits on four 288 GB GPUs; VLLM_FP8_MOE_REQUANT=mxfp4 raises output throughput 22 to 71%.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "With HiSparse host KV offload on single-node TP, set VLLM_FLASHINFER_ALLREDUCE_BACKEND=trtllm; the default FlashInfer all-reduce can crash with a CUDA launch failure once KV spills to host (vllm#64327). DCP requires the FP8 KV cache.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-10-29-mistral-large-4" },
          },
        ],
      },
      {
        header: "// FOUNDATION MODELS AND APIS",
        intro: "Mistral Large 4 weights are out, OpenAI shipped a cheaper GPT-6.1 tier, and Gemini turned on request storage by default for new projects.",
        items: [
          {
            title: "Update: Mistral Large 4 open weights shipped, 1T total, FP8 and NVFP4 checkpoints, modified-MIT license with a MaaS carve-out",
            parts: [
              {
                label: "New release",
                bullets: [
                  "mistralai/Mistral-Large-4-1T-A52B: about 1T total parameters, 128 routed experts (4 active) plus 1 shared, 1M context, text and image input. The card gives about 49B active, 52B counting embeddings and output layers. Base weights are FP8 with a BF16 DSpark draft head.",
                  "A separate NVFP4 checkpoint targets Blackwell, and GGUF builds from ggml-org and Unsloth cover llama.cpp.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "License: Mistral Ecosystem Open-Weight, a modified MIT allowing commercial use and fine-tuning; running a Model-as-a-Service business needs a separate commercial license.",
                  "API: $0.70 per Mtok input, $0.07 cached, $2.10 output, below the $1.36 and $4.18 quoted at the Oct 6 preview. Mistral reports Terminal-Bench 4.0 at 41%, up from 28% in preview.",
                ],
              },
              {
                label: "Deployment profile",
                bullets: [
                  "vLLM needs --tool-call-parser mistral, --reasoning-parser mistral and --enable-auto-tool-choice at TP8; in SGLang, omitting --max-running-requests falls back to 48. Recommended sampling is temperature 1.0, top_p 0.95.",
                  "In vLLM, max_completion_tokens counts reasoning tokens too. The Transformers path needs an install from main.",
                ],
              },
            ],
            source: { label: "Hugging Face model card", url: "https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B" },
          },
          {
            title: "GPT-6.1 Terra: $1 in and $5 out, 1.05M context, six reasoning-effort levels, tools only via Responses",
            parts: [
              {
                label: "New release",
                bullets: [
                  "gpt-6.1-terra (Oct 26) is on v1/responses and v1/chat/completions, pitched for visual reasoning, computer use and writing. Knowledge cutoff Jun 1, 2026.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "Per Mtok: $1.00 input, $0.05 cached input, $5.00 output; cache writes $1.25 for 30-minute or $2.50 for 12-hour retention.",
                  "1,050,000-token context, 128,000 max output, reasoning effort none, low, medium (default), high, xhigh or max. No free tier.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Tool calling requires the Responses API, so Chat Completions integrations that use tools must migrate before switching.",
                ],
              },
            ],
            source: { label: "OpenAI model docs", url: "https://developers.openai.com/api/docs/models/gpt-6.1-terra" },
          },
          {
            title: "Gemini API: new paid projects store generateContent requests by default, with 55-day retention",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Paid-tier projects created on or after Oct 26, 2026 log generateContent, streamGenerateContent and batchGenerateContent by default (store=true), including calls through the OpenAI compatibility endpoints. Existing projects keep their setting.",
                  "Logs hold the full prompt, response and prior-turn context and expire after 55 days by default (7, 14, 28 or 55 configurable); logs saved to a dataset never expire.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Opt out per request with store=false (google-genai 2.33.0+ or @google/genai 2.31.0+) or in AI Studio Logs settings, and audit any new project that handles sensitive data.",
                  "Same week: Computer Use went GA on the Interactions and GenerateContent APIs (Oct 30), and a gemini-api CLI entered beta (Oct 27).",
                ],
              },
            ],
            source: { label: "Gemini API changelog", url: "https://ai.google.dev/gemini-api/docs/changelog" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether vLLM v0.33 ships FlashInfer 0.7.2.post1 (already on main) and drops the --disable-cascade-attn flag as announced, and whether MRV2 sequence parallelism lands or MRV1 is removed.", source: { label: "vLLM issue #47172", url: "https://github.com/vllm-project/vllm/issues/47172" } },
      { text: "Whether Mistral Large 4 support lands in tagged vLLM and SGLang releases rather than only the mistral-large-4 Docker images.", source: { label: "Mistral Large 4 model card", url: "https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B" } },
      { text: "Gemini 4 Argon's introductory pricing ends Nov 30; from Dec 1 it doubles to $4 input and $20 output per Mtok.", source: { label: "Gemini API docs", url: "https://ai.google.dev/gemini-api/docs/latest-model" } },
    ],
  },
  {
    date: "2026-10-25",
    range: "October 19 to October 25, 2026",
    tldr: [
      "Watchlist: no new vLLM or SGLang release this week; SGLang's v0.5.22 GitHub release page went up Oct 19 (PyPI Oct 16) on FlashInfer 0.7.1, vLLM v0.32.0 stays on 0.7.0.post1, and FlashInfer shipped v0.7.2.post1 on Oct 23 with Rubin FP8 MoE. MRV2 sequence parallelism is still unchecked. Mistral Large 4 weights are still not out. The Gemini deep-research-pro-preview-12-2025 shutdown date (Oct 23) passed with no changelog confirmation.",
      "Agentic RL credit: Self-Credit turns the policy's own citations of earlier turns into dense credit, +37.0 points on BrowseComp-Plus for Qwen3 8B, and a survey finds only 37 of 1,598 RL method papers ever reached one of seven open-source RL frameworks.",
      "Agent context: letting the agent drop old tool responses from its KV cache beats summarization by 1.7 points at 27.7% lower cost, and plain reranked RAG over raw history beats agentic memory systems in 6 of 7 settings.",
      "vLLM: the Humming kernel library (--moe-backend humming) runs MoE W4A16 about 2x faster than Marlin on H200 and about 5x on B300; Elastic EP rescales DeepSeek V4 Pro from 16 to 20 GPUs with 0.82 s of pause, vs 197 s for a restart.",
      "PyTorch: TorchTPU runs eager PyTorch on TPU with model.to('tpu') plus a vllm-torchtpu plugin, and TorchTitan's TitanRL gets bitwise-identical trainer and vLLM logprobs. OpenAI added a 12-hour prompt cache (writes at 2.5x input) and took the Decisions API GA with 400 questions per request.",
    ],
    sections: [
      {
        header: "// POST-TRAINING AND RL",
        intro: "Credit assignment for agentic RL, where the reflective 'wait' style really comes from, and which RL papers ever reach the frameworks you train with.",
        items: [
          {
            title: "Self-Credit turns the policy's own citations into dense credit for agentic RL, +37 points on BrowseComp-Plus",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "An end-to-end agentic RLVR method in which the policy writes summaries that cite the earlier turns holding key evidence; those citations become self-generated credit.",
                  "On BrowseComp-Plus it gains 37.0 points over the base on Qwen3 8B and 36.2 on Qwen3 32B, beating the strongest agentic RL baselines by 8.5 and 5.6 points. It also leads by 4.9 on GAIA and 4.7 on xBench-DeepSearch.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Intra-group rescaling compares cited actions across successful and failed rollouts of the same prompt, dropping unwarranted credit and boosting credit for critical actions.",
                  "Advantage reweighting then scales the advantages of cited turns; rescaling on failed rollouts matters at every model scale.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "For GRPO-style agentic RL with sparse outcome rewards, this densifies credit from your existing rollout groups with no critic or PRM.",
                ],
              },
            ],
            source: { label: "arXiv 2610.28388", url: "https://arxiv.org/abs/2610.28388" },
          },
          {
            title: "The 'wait' token comes from data, not RL, and KL-free GRPO does not amplify it",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Using label-free measures on sampled outputs, zero-RL rarely creates the 'wait' marker. On bases lacking it, RL still improves MATH-500 accuracy while the marker stays nearly absent.",
                  "The marker mostly arrives through training data, such as OLMo-3 mid-training and SFT on reasoning traces.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Where the base already uses it, some RL-Zero recipes amplify it while KL-free GRPO does not; RL after SFT barely changes it, and the authors' GRPO recipe erases a marker seeded by SFT.",
                  "LLM-as-a-judge revision metrics can reverse human-labelled trends.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Stop using 'wait' frequency or judge-scored self-revision as a proxy for RL-induced reasoning; track accuracy directly. If you want the reflective style, it is a mid-training or SFT data choice.",
                ],
              },
            ],
            source: { label: "arXiv 2610.30882", url: "https://arxiv.org/abs/2610.30882" },
          },
          {
            title: "Only 37 of 1,598 RL post-training method papers reached any of seven open-source frameworks",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Traces commit histories of seven open-source RL post-training frameworks against 6,939 screened arXiv papers from Jan 2025 to Jun 2026: 37 of 1,598 general RL method papers were included.",
                  "Inclusions within 180 days stayed at 5 to 7 per quarter while quarterly cohorts grew from 72 to 386 papers.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Included papers more often trained 30B+ policies (41% vs 10%) and more often just changed a coefficient, clip, mask or weight in the existing loss (29% vs 9%); code release was equally common in both groups.",
                  "Over nine in ten never-included methods have no issue or PR naming them.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Small loss edits validated at 30B+ are the RL tweaks likely to land as a config flag; anything else means maintaining a fork. The authors release a tracker linking training failures to framework implementations.",
                ],
              },
            ],
            source: { label: "arXiv 2610.28027", url: "https://arxiv.org/abs/2610.28027" },
          },
        ],
      },
      {
        header: "// AGENTIC SYSTEMS AND EVAL",
        intro: "Two results that argue for simpler agent context management: let the agent prune its own KV cache, and benchmark memory systems against plain RAG.",
        items: [
          {
            title: "Cache engineering: letting agents drop KV entries beats summarization by 1.7 points at 27.7% lower cost",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Agents manage their active KV cache directly: drop entries from future attention and adjust position encodings of retained keys, with no trajectory rewrite or re-prefill.",
                  "A rolling drop of old tool responses improved average benchmark scores by 1.7 points and cut average cost 27.7% vs threshold-triggered summarization.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "The AKV serving engine hides the resulting history dependence behind a stateless, API-compatible interface, reaching up to 1.2x output throughput and 1.5x P95 latency speedup.",
                  "Recursively self-improved cache policies cut cost a further 7.1% over expert-designed ones.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Before adding a summarizer for long tool outputs, try rolling-dropping old tool responses; summarization re-prefills and costs more.",
                ],
              },
            ],
            source: { label: "arXiv 2610.28577", url: "https://arxiv.org/abs/2610.28577" },
          },
          {
            title: "Reranked RAG over raw conversation history beats agentic memory systems in 6 of 7 settings",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Raw-RAG (dense retrieval plus reranking over raw history, fed to a reader LLM) ranks first in six of seven benchmark and model settings across LoCoMo, LongMemEval, MEME and MemoryAgentBench.",
                  "It beats the strongest agentic memory system compared by 0.13 to 5.53 points.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Raw-RAG's higher coverage of the necessary evidence outweighs its lower utilization of it.",
                  "Giving full access to transformed memory stores does not close the gap, so the loss happens at memory-write time.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Make reranked raw-history RAG the required baseline before shipping summarized or graph memory.",
                ],
              },
            ],
            source: { label: "arXiv 2610.30755", url: "https://arxiv.org/abs/2610.30755" },
          },
        ],
      },
      {
        header: "// INFERENCE AND SERVING",
        intro: "Prefill pruning, sparse decode attention, a new quantized kernel backend in vLLM, and near-zero-downtime expert-parallel scaling.",
        items: [
          {
            title: "TokenGate: learned prefill token pruning gives 1.4x to 11.3x faster TTFT with no accuracy loss",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Drop-in learnable token pruning for already-trained models: 1.4x to 11.3x faster TTFT and 1.5x to 3.4x lower peak prefill memory with no accuracy degradation.",
                  "Against the best prior token pruning: up to 6.4x faster prefill and 2x lower peak memory.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "MoE-inspired token-gated attention reweights attention logits by token importance scores, getting around the non-differentiable top-K.",
                  "Works on standard (Qwen3) and hybrid-attention (Qwen3.5) models at an adaptation cost comparable to PEFT.",
                ],
              },
            ],
            source: { label: "arXiv 2610.26754", url: "https://arxiv.org/abs/2610.26754" },
          },
          {
            title: "Stratified Sparse Attention holds up at 50x sparsity and decodes 2.96x faster than FlashInfer at 1M context",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "SSA attends deterministically to high-scoring tokens and samples the rest via proxy scores with inclusion-probability correction, generalizing top-k, top-p and hybrid schemes.",
                  "RULER-HARD on Ministral-3-8B at 50x sparsity: 84.2% vs 81.8% at 32K and 69.3% vs 63.8% at 128K against the strongest practical baseline, recovering 94% and 85% of dense.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Beats baselines at matched sparsity on RULER, LongBench, LOFT and AIME across five models from 3B to 27B.",
                  "CUDA kernels give up to 2.96x decode speedup over FlashInfer at 1M context; code at github.com/skylight-org/SSA-Paper-Code.",
                ],
              },
            ],
            source: { label: "arXiv 2610.28441", url: "https://arxiv.org/abs/2610.28441" },
          },
          {
            title: "vLLM Humming: one flag swaps Marlin for a quantized kernel library that is 2x to 5x faster on MoE",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Humming (Ant Group and the vLLM community) has shipped with vLLM CUDA installs since 0.29.0. Enable with --linear-backend humming and --moe-backend humming, or --quantization humming for formats such as GPTQ INT3.",
                  "Covers WnA16 (INT1 to INT4, FP4 to FP8), W8A8, W4A8, W4A4 and MXFP4, MXINT4, NVFP4, MXFP8 on SM75 and newer, including SM100/103 and SM120/121.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "MoE W4A16 vs Marlin: about 2x on H20 and H200 for MXFP4 at medium to large batch, about 5x on B300 for MXINT4 and NVFP4; dense W4A16 about 2x on large-batch H200.",
                  "DeepSeek-V4.1-Flash on 8x H20 at TP8, Marlin W4A16 to Humming W4A8: throughput up 14% to 43%, mean TTFT down 25% to 32%; at concurrency 64, 442.37 to 633.94 tok/s output.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "None stated. The two Blackwell-only formats (float4e0m3, float8e3m4) are not supported on Rubin.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-10-21-humming" },
          },
          {
            title: "vLLM Elastic EP rescales DeepSeek V4 Pro from 16 to 20 GPUs with 0.82 s of serving pause",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Background preparation for Elastic EP reconfiguration, CUDA graph reuse across scale-up and scale-down, and NIXL EP, a communication library that adds or removes ranks in place.",
                  "In the latest vLLM and NIXL pip releases; the usage example is the cuda_graphs_heavy_nixl_ep case in tests/distributed/test_elastic_ep.py, with no CLI flags documented.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "On GB200 (TP1, DP and EP 16 and 20), downtime for 16 to 20 GPUs fell from 99.62 s blocking to 0.82 s, and 20 to 16 fell from 56.25 s to 1.96 s. A full engine restart for the same scale-up stopped serving for 197 s.",
                  "Joining workers warm up and capture graphs while masking remote EP peers; a short commit then switches topology, and async EPLB redistributes experts afterwards.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-10-19-elastic-ep-near-zero-downtime" },
          },
        ],
      },
      {
        header: "// TRAINING SYSTEMS AND HARDWARE",
        intro: "PyTorch gets a native TPU backend with a matching vLLM plugin, and TorchTitan ships an RL stack with bitwise-identical logprobs.",
        items: [
          {
            title: "TorchTPU: eager PyTorch on TPU via model.to('tpu'), plus a vllm-torchtpu plugin for serving",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Google and Meta's TorchTPU runs PyTorch directly, not through JAX: change the device string to 'tpu', use backend 'tpu_dist' for distributed, and torch.compile(model, backend='tpu') for whole-graph StableHLO.",
                  "vllm-torchtpu (Python 3.12 on Cloud TPU VMs) is an out-of-tree platform plugin; v7x Ironwood is CI-tested on every PR, v6e, v5e and v5p are experimental. Set VLLM_XLA_CACHE_PATH to avoid recompiling at each startup.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "TORCH_TPU_DEFER_AND_FUSE=1 is said to be 50% or more faster than default Strict eager mode. 4,821 of 4,917 top HF models pass (98%), with 97% numerical parity vs GPU.",
                  "Qwen3 MoE 235B in TorchTitan: 2,236 TPS per TensorCore at 28.8% MFU on 1,024 chips.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "About 450 ATen ops (no FlexAttention yet), torch.compile forces dynamic=False, one process per TPU device so RL colocation does not work out of the box, and default 'skinny' collectives can cost 30% to 40% end to end.",
                ],
              },
            ],
            source: { label: "PyTorch blog", url: "https://pytorch.org/blog/introducing-torchtpu/" },
          },
          {
            title: "TorchTitan TitanRL: bitwise-identical trainer and vLLM logprobs, and checkpoint blocking from 841 ms to 34 ms",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "TitanRL uses one model definition across pretraining, post-training and inside vLLM; batch-invariant mode gives bitwise-identical logprobs between trainer and generator in supported on-policy configs.",
                  "Validated on SWE-Rebench with Qwen3.5-35B-A3B at 64K context on 40 GB300, stable over hundreds of steps.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "DeepSeek-V3 671B MXFP8 on GB300: 5,324 TPS per GPU at 256 GPUs and 5,263 at 512, with loss matching Megatron.",
                  "FlexShard cuts Muon optimizer time by up to 79% vs FSDP-only on DSv3 at 256 H100s, and blockwise FP8 all-gathers improve Llama 3 405B step time by up to 20%.",
                  "New torch_checkpointing on 512 H100s: trainer blocking 841.2 to 34.1 ms on average, checkpoint write 384.4 to 13.1 s.",
                ],
              },
            ],
            source: { label: "PyTorch blog", url: "https://pytorch.org/blog/torchtitan-update-new-sota-models-performance-at-scale-titanrl/" },
          },
        ],
      },
      {
        header: "// FOUNDATION MODELS AND APIS",
        intro: "Two OpenAI API changes that move cost for agent and classification workloads.",
        items: [
          {
            title: "OpenAI adds a 12-hour prompt cache TTL: writes cost 2.5x input, reads unchanged",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Set prompt_cache_options.ttl to '12h' on v1/responses (GPT-5.6 and later); the default stays '30m' and unsupported values return 400. prompt_cache_breakpoint.ttl lets shared tools and instructions sit at 12h while session context stays at 30m.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "12h writes cost 2.5x uncached input vs 1.25x for 30m; reads are 0.1x input (0.05x for GPT-6.1 Sol and Terra) for both.",
                  "Minimum prefix is 1,024 input tokens, and upgrading an existing 30m prefix to 12h is a fresh 12h write with no credit.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Older models keep prompt_cache_retention with in_memory or 24h, so do not mix the two parameters across model families.",
                ],
              },
            ],
            source: { label: "OpenAI prompt caching guide", url: "https://developers.openai.com/api/docs/guides/prompt-caching" },
          },
          {
            title: "Update: OpenAI's Decisions API goes GA with 400 questions per request and cacheable shared input",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "v1/decisions on gpt-6-luna is generally available as of Oct 22, and the per-request question limit doubled from 200 in beta to 400.",
                  "Shared input can now be prompt-cached, images can go into individual question instructions, and structured data can be passed with input_json.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "For scoring one document against many criteria, caching the shared input plus the 400-question limit cuts calls and input cost per decision. Accuracy claims for decision models are still vendor-run, so label your own cases before switching.",
                ],
              },
            ],
            source: { label: "OpenAI API changelog", url: "https://developers.openai.com/api/docs/changelog" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether vLLM ships a release on FlashInfer 0.7.2 or later; FlashInfer v0.7.2.post1 (Oct 23) adds Rubin FP8 MoE.", source: { label: "FlashInfer v0.7.2.post1", url: "https://github.com/flashinfer-ai/flashinfer/releases/tag/v0.7.2.post1" } },
      { text: "Whether Mistral Large 4 weights ship by Oct 31 as promised, and under what license.", source: { label: "Mistral AI", url: "https://mistral.ai/news/mistral-large-4" } },
      { text: "Whether MRV2 sequence parallelism lands; it is still unchecked on the tracking issue.", source: { label: "vLLM issue #47172", url: "https://github.com/vllm-project/vllm/issues/47172" } },
    ],
  },
  {
    date: "2026-10-18",
    range: "October 12 to October 18, 2026",
    tldr: [
      "Watchlist: SGLang v0.5.22 reached PyPI on Oct 16 pinned to FlashInfer 0.7.1, the first engine release on it, while vLLM v0.32.0 (Oct 18) still pins 0.7.0.post1 and FlashInfer v0.7.2 went out Oct 15. MRV2 sequence parallelism is still unchecked on issue #47172, and v0.32.0 makes MRV2 the default only on ROCm without removing MRV1. Mistral Large 4 weights have not shipped yet. OpenAI wired its Decisions API into GPT-Live on Oct 15.",
      "Train and inference mismatch, solved by force: vLLM and NVIDIA run the training forward pass through vLLM's own kernels and hold logprob KL at exactly 0; the baseline DeepSeek-V4-Flash GRPO run drifted to KL 29.9 in 100 steps at a cost of about 9% rollout throughput.",
      "RL objectives: a log-odds value head (TPPO) gives PPO +7.0 and +8.4 points on Qwen3 math, proximal KL beats GRPO in all 7 stale-rollout matchups, and 10 agentic self-distillation methods rerun over 12,124 H800-hours fail to consistently beat GRPO.",
      "vLLM v0.32.0 breaks things: Python 3.11 minimum, CORS closed by default, max_tokens no longer reserved from context, cascade attention removed. Two NIXL modes cut P/D TTFT by about 3x under load (push) and up to 3.3x on multi-turn (bidirectional).",
      "Gemini 4 Argon went GA at $2 and $10 per Mtok until Nov 30, then $4 and $20, ignores sampling params and drops explicit caching. Meta released Muse Spark Open, 816B total and 42B active, with day-0 vLLM and SGLang support.",
    ],
    sections: [
      {
        header: "// POST-TRAINING AND RL",
        intro: "This week's RL work removes the train and inference mismatch outright, repairs the critic and the off-policy correction, and checks whether the extra machinery beats GRPO at all.",
        items: [
          {
            title: "vLLM and NVIDIA hold train and inference KL at exactly 0 for MoE RL, and the baseline collapses without it",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "The training forward pass calls vLLM's inference kernels through custom autograd.Function wrappers, so the rollout logprob and the recomputed old logprob are bitwise equal. Acceptance requires max, mean and std of the logprob difference and the k3 KL to all be exactly 0.",
                  "Integrated into verl (PR #7688) with an agent skill named train-inference-consistency (gates C0 to C10). The recipe rejects TP above 1 at startup and requires 1 update per step.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "FP8 linear and expert GEMMs use DeepGEMM in batch-invariant mode, the router gate is one FP32-output GEMM at every batch size, and SiLU(gate) times up runs in FP32 and is rounded once to BF16.",
                  "FP8 KV decode is routed through the prefill path into a BF16 workspace, and Top-K ties break on a 64-bit score plus position key. FULL_AND_PIECEWISE CUDA graphs gave 16409 tok/s versus 10423 for PIECEWISE.",
                ],
              },
              {
                label: "Impact",
                bullets: [
                  "DeepSeek-V4-Flash GRPO on 32 GB200: baseline KL rose from 2e-3 to 29.9 over 100 steps while the consistent run stayed at 0, at 91.3% of baseline rollout throughput.",
                  "Nemotron-3.5 30B-A3B agentic RL on SWE-bench Pro: the consistent run went 0.56 to 0.59 while the baseline fell to 0.22 as entropy rose from 0.05 to 2.6. Baselines were untuned and used no TIS or MIS, so compare against your own correction first.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-10-14-train-inference-consistency" },
          },
          {
            title: "TPPO: a summed log-odds value head lifts PPO by 7 to 8 points on Qwen3 math",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Tracking-Value PPO argues that standard critics fail to track how value changes along a reasoning trace when reward is only terminal, and models successive prefix values as additive updates in log-odds space.",
                  "The value logit is the sum of position-wise scalar outputs, trained with terminal-outcome supervision on the reconstructed values.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Beats PPO on aggregate math by 7.0 points on Qwen3-4B-Base and 8.4 points on Qwen3-8B-Base, with better OOD generalization.",
                  "Gains also hold on Qwen3-4B, Qwen2.5-Math-1.5B, Qwen3.5-9B, countdown and scientific coding. Code is at github.com/LINs-lab/TPPO.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If you keep a critic for RLVR, swap in a summed log-odds value head before giving up on the critic for GRPO.",
                ],
              },
            ],
            source: { label: "arXiv 2610.16794", url: "https://arxiv.org/abs/2610.16794" },
          },
          {
            title: "Proximal KL replaces PPO clipping for stale rollouts and beats GRPO in all 7 off-policy matchups",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Keeps one token-wise importance weight against the behavior policy and drops the clip. Each token's advantage is reduced by a future KL cost summed over a window of clipped log-ratios against a frozen proximal reference that is refreshed periodically.",
                  "The proximal reference is decoupled from the behavior policy, and no value or Q function is fitted.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Across 7 matched off-policy settings (periodic refresh, controlled staleness, response reuse) on Qwen3-1.7B and Qwen3-4B, it beats GRPO on micro-averaged accuracy over 8 math benchmarks by up to 2.58%. On-policy the two are comparable.",
                  "Token-wise weighting beat sequence-level and unweighted controls in ablations.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If async rollouts or minibatch reuse make your GRPO data stale, this is a drop-in loss to test. Expect nothing in strictly on-policy runs.",
                ],
              },
            ],
            source: { label: "arXiv 2610.18738", url: "https://arxiv.org/abs/2610.18738" },
          },
          {
            title: "Instruction-following verifier rewards get hacked; CALIF adds a reference-policy likelihood bonus",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Some leading models get full credit on verifiable instruction-following benchmarks with very little substantive content, and released checkpoints trained on these verifiers satisfy more constraints but give worse responses after RL.",
                  "CALIF adds a calibrated likelihood bonus from the frozen reference policy, conditioned only on the request, to the verifier reward. No judge or reward model is needed.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "From 1.7B to 8B, in reasoning and non-reasoning modes, it improves IFBench constraint satisfaction while keeping response quality near or above pre-RL levels.",
                  "Beats the base policies in 40 of 45 model and metric comparisons on 3 rubric-based IF benchmarks.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If you train on constraint checkers alone, score response quality separately; a rising constraint pass rate can hide content collapse.",
                ],
              },
            ],
            source: { label: "arXiv 2610.19525", url: "https://arxiv.org/abs/2610.19525" },
          },
          {
            title: "Reality check: 10 agentic self-distillation methods, 12,124 H800-hours, none consistently beats GRPO",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Reruns 10 representative self-distillation methods against GRPO on ALFWorld, ScienceWorld, Search-QA and WebShop at 3 model sizes: 132 training runs, 12,124.4 recorded H800 GPU-hours, 8 rollout seeds per evaluation.",
                  "Gains over GRPO are narrow, strong final scores can hide unstable training, and extra training cost does not reliably buy performance.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Before adopting an OPD or self-distillation add-on for agent RL, rerun GRPO under your own conditions and compare training curves and GPU-hours, not published baseline numbers.",
                ],
              },
            ],
            source: { label: "arXiv 2610.19789", url: "https://arxiv.org/abs/2610.19789" },
          },
        ],
      },
      {
        header: "// INFERENCE, KV CACHE AND QUANTIZATION",
        intro: "A vLLM release with real breaking changes, two NIXL disaggregation modes, and hard numbers on when a remote KV tier loses to recompute.",
        items: [
          {
            title: "vLLM v0.32.0: Python 3.11 minimum, CORS closed by default, max_tokens no longer reserved from context",
            parts: [
              {
                label: "Breaking changes",
                bullets: [
                  "Python 3.10 is dropped. Default CORS origins went from all to none, so browser clients now need --allowed-origins. transformers is pinned to >=5.16.1,<5.20.0.",
                  "max_tokens is now an upper bound on output instead of being reserved from the context window. Cascade attention is removed (--disable-cascade-attn only warns until v0.33.0), and the torch.compile SP and AsyncTP passes are gone.",
                ],
              },
              {
                label: "What shipped",
                bullets: [
                  "NVFP4 KV cache now runs on SM8x, SM90 and SM12x. GLM-5.x defaults to FP8 KV on SM100: half the KV memory per rank and 2.3 to 5.5% more throughput at a 7 to 11% TTFT cost.",
                  "Model Runner V2 gains a GPU n-gram speculator and Elastic EP and is the default on ROCm. New --tool-call-parser hf and --reasoning-parser hf read the checkpoint's response_template.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "With --api-server-count above 1, short requests gained 43 to 85% req/s on Qwen3-0.6B. JSON schemas nested deeper than 64 levels now return a 400.",
                  "Audit browser-facing deployments and any client that relied on max_tokens reserving context before upgrading.",
                ],
              },
            ],
            source: { label: "vLLM v0.32.0", url: "https://github.com/vllm-project/vllm/releases/tag/v0.32.0" },
          },
          {
            title: "NIXL push connector: about 3x lower TTFT for P/D disaggregation under load",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "NixlPushConnector: decode reserves and registers KV blocks before prefill finishes, then prefill writes KV straight into decode memory with a NIXL WRITE over RDMA, from a background thread off the model loop.",
                  "Set NixlPushConnector on both prefill and decode (do not mix with pull) and use disagg_proxy_pushconnector_demo.py. Needs vLLM 0.29.0+ and NIXL 1.4.1 with the libfabric/EFA backend.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Qwen3-32B 1P1D on 2x p5en.48xlarge (H200, 3.2 Tb/s EFA) at 8 QPS and 16k input: TTFT about 1,744 ms with pull vs about 540 ms with push, TPOT about 10.4 ms vs about 7 ms. At light load and short prompts they are nearly identical.",
                  "Push picks the decode instance before prefill, so you lose load-aware routing after prefill and cannot combine it with bidirectional transfer.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-10-14-nixl-push-connector" },
          },
          {
            title: "Bidirectional KV transfer: decode sends multi-turn KV back to prefill, up to 3.3x lower TTFT",
            parts: [
              {
                label: "How it works",
                bullets: [
                  "Decode keeps prompt and response KV after generation and returns its metadata in the final stream chunk. On the next turn a router keyed on conversation_id lets prefill NIXL READ that KV and compute only the suffix.",
                  "Flags: bidirectional_kv_xfer true on both sides, NixlConnector with LIBFABRIC. decoder_kv_blocks_ttl defaults to 480 s and is not renewed; kv_recompute_threshold defaults to 64 tokens.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "TTFT: Qwen3-32B at 24k went 778 to 460 ms, GLM-5-FP8 at 20k went 2,334 to 702 ms. The transfer itself adds about 30 to 130 ms.",
                  "The repro needs vllm==0.29.0, nixl==1.4.1 and PR #40186. The fixed 480 s TTL matters for agent sessions with long tool pauses.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-10-12-bidirectional-kvxfer-multiturn-agentic-workload" },
          },
          {
            title: "A remote KV tier made context-parallel prefill p99 worse until sharded: 83 s down to 0.67 s",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "GLM-5.3 FP8 MLA on 8x B300 with PCP8 and LMCache plus Valkey: the remote tier left median TTFT flat but pushed 16k p99 from 3.96 s to 17.3 s. A remote hit took 0.88 s vs 0.31 s to recompute.",
                  "Cost model: break-even bandwidth 2.53 GB/s and a fixed per-hit cost of about 0.33 s, so hits on prompts under about 17k tokens cannot beat recompute.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Shard the MLA KV store across PCP ranks, partition the remote tier by rank (6.3x GET bandwidth, to 10.76 GB/s) and load asynchronously. On the hit-heavy stream p99 fell from 83.32 s to 0.67 s and prefill throughput rose 14%.",
                  "Do not route short prompts to a remote KV tier; benchmark recompute first.",
                ],
              },
            ],
            source: { label: "arXiv 2610.21500", url: "https://arxiv.org/abs/2610.21500" },
          },
          {
            title: "PN-Mix: a 2.26-bit key cache that picks channels by query-key pair norm",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Error in RoPE channel pairs with a large query-key pair-norm product drives most attention-logit perturbation, while existing methods rank channels on key statistics only.",
                  "PN-Mix gives those pairs higher precision, identified once at prefill and reused through decode.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "On reasoning, code and AIME, a 2.26-bit average matches or beats prior methods at 2.32 to 2.39 bits.",
                  "Degrades gracefully down to 1.5 bits while baselines drop sharply below 2.25 bits, which matters for long-output reasoning where KV bandwidth dominates.",
                ],
              },
            ],
            source: { label: "arXiv 2610.19605", url: "https://arxiv.org/abs/2610.19605" },
          },
        ],
      },
      {
        header: "// FOUNDATION MODELS AND APIS",
        intro: "A frontier API went GA with migration traps, and a large open-weight MoE landed with day-0 engine support.",
        items: [
          {
            title: "Gemini 4 Argon GA: sampling params ignored, no explicit caching, raise max_output_tokens",
            parts: [
              {
                label: "New release",
                bullets: [
                  "gemini-4-argon is GA on the paid tier with a 1,048,576-token window shared by input, thinking and output. thinking_level is low, medium (default) or high.",
                  "Outputs over 64K need background: true and max_output_tokens above 65,536; generation comes in hops of up to 64K and you must join every model_output step.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "Introductory pricing through Nov 30, 2026: $2 input and $10 output per Mtok, thinking included; from Dec 1, $4 and $20. Cached input $0.10, then $0.20. No free tier.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "temperature, top_p and top_k are ignored, and explicit caching (cachedContents, caches.create) is not supported.",
                  "Google advises raising any max_output_tokens below 32K to at least 32,768, setting HTTP timeouts to 15 minutes or more or using background mode, and using previous_interaction_id for multi-turn.",
                ],
              },
            ],
            source: { label: "Gemini API docs", url: "https://ai.google.dev/gemini-api/docs/latest-model" },
          },
          {
            title: "Meta's Muse Spark Open: 816B total, 42B active, 1M context, open weights with TorchTitan RL support",
            parts: [
              {
                label: "New release",
                bullets: [
                  "816B total and 42B active parameters, 1M-token context, native image, audio, video, document and text input, reasoning tuned for agentic coding. Shares its base with Muse Spark 1.3.",
                  "Weights at huggingface.co/meta-models/Muse-Spark-open-816B-A42B under the Muse Model License; read it before commercial use.",
                ],
              },
              {
                label: "Deployment profile",
                bullets: [
                  "Day-0 support on vLLM and SGLang. Helion kernels (RoPE, RMSNorm, quantization) run 1.03 to 3.95x faster than custom CUDA and CuTe DSL kernels on GB300, and add 3% end-to-end throughput on MI350.",
                  "TorchTitan ships a model definition with multi-turn SFT, LoRA and TitanRL. The post gives no quality benchmarks and no quantized checkpoints.",
                ],
              },
            ],
            source: { label: "PyTorch blog", url: "https://pytorch.org/blog/muse-spark-open/" },
          },
        ],
      },
      {
        header: "// TRAINING SYSTEMS",
        intro: "Data order that stays fixed when the GPU count changes.",
        items: [
          {
            title: "Zephon for TorchTitan: bit-identical global batches when you resume on a different GPU count",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "DatologyAI's Zephon tokenizes, packs, shuffles and mixes inside the training job and splits data into a fixed number of logical lanes rather than per-rank shards. torchtitan-zephon replaces the default loader and saves its state in the checkpoint.",
                  "A 1B model checkpointed on 16 GPUs and resumed on 8, 32 and 64 reproduced global batches exactly (SHA-256 per step), with a few MiB of loader state.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Training to 20B tokens on 8 to 64 GPUs, the standard loader's DCLM Core v1 varied by up to 0.82 points across GPU counts, vs 0.05 with Zephon.",
                  "Pick the lane count up front as a common multiple of your expected DP sizes (32 lanes covers 8, 16 and 32 GPUs). Losses stay close but not bitwise identical, since reduction order still depends on GPU count.",
                ],
              },
            ],
            source: { label: "PyTorch blog", url: "https://pytorch.org/blog/bringing-elastically-deterministic-data-loading-to-torchtitan-with-zephon/" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether vLLM moves off FlashInfer 0.7.0.post1 now that SGLang v0.5.22 ships 0.7.1 and FlashInfer v0.7.2 is out (Oct 15).", source: { label: "FlashInfer v0.7.2", url: "https://github.com/flashinfer-ai/flashinfer/releases/tag/v0.7.2" } },
      { text: "Whether MRV2 sequence parallelism lands and MRV1 is removed; v0.32.0 made MRV2 the default only on ROCm.", source: { label: "vLLM issue #47172", url: "https://github.com/vllm-project/vllm/issues/47172" } },
      { text: "Whether Mistral Large 4 weights ship by the end of October as promised, and under what license.", source: { label: "Mistral AI", url: "https://mistral.ai/news/mistral-large-4" } },
    ],
  },
  {
    date: "2026-10-11",
    range: "October 5 to October 11, 2026",
    tldr: [
      "Watchlist: vLLM v0.31.0 (Oct 5) finally ships FlashInfer 0.7.0.post1, and FlashInfer v0.7.1 went stable on Oct 9, though neither vLLM nor SGLang pins it yet. SGLang has no release after v0.5.21, but its main branch now pins 0.7.0.post1. MRV2 sequence parallelism is still unchecked on tracking issue #47172, while v0.31.0 brings draft-model spec decode and custom logits processors to MRV2. Decision models: OpenAI's Decisions API went to public beta, and the first outside comparison found Clef's lead over Jev not statistically significant.",
      "RL infrastructure: NVIDIA's NeMo-DCR refits a 1T policy across regions in 150s instead of 87.5 minutes by shipping only the weights that changed, bit-exact; LoGRA trains a 27B model with RL on one 8-GPU node where dense Adam runs out of memory.",
      "FP4 RL got two fixes for sampler and learner disagreeing: TRIAGE reweights the updates that amplify the mismatch (up to 2.3x rollout throughput vs BF16), and TRACE lets rollout-side FP4 rounding steer training-side quantization (up to 5.4x rollout speedup on MoE).",
      "Claude Haiku 5.5 costs $0.10 input and $0.50 output per Mtok with 1M context, but its tokenizer counts about 30% more tokens than Haiku 4.5 and sampling parameters must be omitted. Mistral Large 4 previews a 1T total, 52B active MoE with weights promised by end of October.",
      "Serving: vLLM v0.31.0 adds a weight-cache daemon for fast restarts and makes per-request multimodal kwargs opt-in; vLLM reports DeepSeek-V4.1-Flash at 5.3x its day-0 throughput; llama.cpp v0.6.0 adds an extended batch API and W4A4 matmul and bumps its session file version.",
      "Eval gotchas: pinned Gemini model strings now silently route to newer models (3.7 Flash to 3.8 Flash); SafeActBench finds tool agents at 95%+ static accuracy but 52% or less interactive success; CheckerBench's best agent writes a working vulnerability checker 45.33% of the time.",
    ],
    sections: [
      {
        header: "// POST-TRAINING AND RL",
        intro: "Most of this week's RL work is infrastructure: shipping weights to rollout fleets, fitting RL on one node, and making FP4 rollouts safe to learn from.",
        items: [
          {
            title: "NeMo-DCR: bit-exact delta refit moves a 1T policy across regions in 150 seconds",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "NVIDIA (arXiv 2610.08430, Oct 6) targets refit, the step that pushes every policy update from the training cluster to a separate rollout cluster. A full 1T-parameter checkpoint takes 87.5 minutes to move between two AWS regions.",
                  "At 3% and 5% change rates, refits run 12 to 40x faster than a transport-only full-checkpoint reference across 30B to 1T models; a 1T relay-tree refit at 3% takes 150s.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "In BF16 training about 1% of weights change their stored values per step, so only changed values are sent, and receivers end up bit-identical to a dense refit.",
                  "Fixed affine mappings project changes into the checkpoint's canonical coordinates and travel as compressible XOR masks; changes the mapping misses go as overwrites, applied in place, and the serving runtime's own loader places the weights.",
                  "Partial writes are retried and a joint commit binds each policy to its baseline for the next delta, recovery that earlier sparse-refit systems lacked. Payloads stream through object storage or a relay tree, with no cross-cluster collective.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "If your rollout fleet sits in another region or cloud, weight sync stops setting RL iteration speed, and the result is exact, not lossy.",
                  "Code is in NeMo RL PR #2444, with a refit guide in the NeMo RL nightly docs.",
                  "The 12 to 40x is against a transport-only reference; measure against whatever NCCL or object-store refit you run today.",
                ],
              },
            ],
            source: { label: "arXiv 2610.08430", url: "https://arxiv.org/abs/2610.08430" },
          },
          {
            title: "LoGRA: low-rank gradient sketches fit 27B RL on one 8-GPU node",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2610.06647 (Oct 5; authors include Jan Kautz and Yi Dong) keeps the useful learning signal of RL post-training in low-rank gradient sketches.",
                  "Up to 45.7% lower average training memory on reasoning tasks with no loss in performance, and a 27B model trained stably for over 1,100 steps on a single 8-GPU node where dense Adam runs out of memory.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "The same compact sketches drive both the model update and policy synchronization to the rollout engine, so sync traffic shrinks along with optimizer memory.",
                  "Predicted-KL step control estimates how far the policy would move before each update and scales the step to match.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If RL on a mid-size model forces you onto multiple nodes only because of optimizer state, test this first. Code is in the Molt library on its logra branch.",
                  "Predicted-KL step control is separable from the sketches and worth trying as a stability guard on its own.",
                  "The abstract names no models or benchmarks beyond reasoning tasks, so validate on your own task mix.",
                ],
              },
            ],
            source: { label: "arXiv 2610.06647", url: "https://arxiv.org/abs/2610.06647" },
          },
          {
            title: "FP4 RL breaks where sampler and learner disagree: TRIAGE and TRACE fix it from opposite sides",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "TRIAGE (InfiX.ai, arXiv 2610.07043, Oct 5) keeps sampler and learner in native NVFP4 W4A4 and reaches full-precision-level scores on five math benchmarks with Qwen3-4B and Qwen3-30B-A3B, at up to 2.3x rollout throughput vs BF16.",
                  "TRACE (arXiv 2610.07767, Oct 6) reaches RL performance comparable to BF16 rollouts on four large MoE models with FP4 weights, activations and KV cache in rollout, up to 5.4x rollout speedup, and its final FP4 policy beats post-hoc FP4 quantization of a BF16-trained policy.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "TRIAGE: mismatch size alone does not predict risk; what matters is whether an update amplifies or contracts the existing learner and sampler gap. Early in native NVFP4 runs, negative-advantage, negative-gap updates dominate, and their tail tokens cluster in a few response segments before the mismatch spreads.",
                  "TRIAGE diagnoses at segment level, rebalances those updates selectively, and applies bounded repair to remaining severe mismatch. Only the objective changes.",
                  "TRACE: prior FP4 RL tuned training-side and rollout-side quantization separately. TRACE uses rollout-side FP4 outcomes to guide training-side rounding, caching only selected mantissa and scale information from deeper layers to limit overhead.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If an FP4 rollout run diverges, log the learner and sampler gap split by advantage sign, not just its magnitude.",
                  "TRIAGE is an objective change with code released (InfiXAI/TRIAGE); TRACE changes quantization-aware training and links no code yet.",
                ],
              },
            ],
            source: { label: "arXiv 2610.07043", url: "https://arxiv.org/abs/2610.07043" },
          },
          {
            title: "OPPD: distill power sampling into the weights, and it stacks on top of GRPO",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "USC (arXiv 2610.06804, Oct 5) distills power sampling, which raises sequence probability to an exponent above 1 and needs many scored candidates per query, into a single generation.",
                  "One OPPD generation beats 64-candidate power sampling by 2.4 on MATH500 and 3.5 on GSM8K, and gains up to 23.0 and 27.3 over the untrained model at the same temperature.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "The policy generates candidates inside a sequential Monte Carlo sampler, a frozen teacher's power distribution weights them, and the same weights drive a maximum-likelihood update.",
                  "A loss coefficient sets the sharpening exponent the model absorbs, 1.19 to 2.02, versus 1.14 for ordinary on-policy distillation.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Against GRPO with verified rewards on the same checkpoint and budget, without reference answers: +3.8 MATH500, +4.0 GSM8K, +5.4 AIME. Running OPPD after GRPO adds up to 9.3 more.",
                  "On an RLVR-trained model, where lowering temperature no longer helps, it still adds 4.4 on MATH500, and math-only training transfers up to 5.3 on HumanEval.",
                  "Useful when you lack a verifier or reference answers; code is released.",
                ],
              },
            ],
            source: { label: "arXiv 2610.06804", url: "https://arxiv.org/abs/2610.06804" },
          },
        ],
      },
      {
        header: "// INFERENCE AND SERVING",
        intro: "vLLM ships the FlashInfer it had been waiting on plus a fast-restart daemon, and llama.cpp tags a release that changes its batch API and session format.",
        items: [
          {
            title: "vLLM v0.31.0: a weight-cache daemon for fast restarts, FlashInfer 0.7.0.post1, and opt-in multimodal kwargs",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Oct 5, 717 commits from 307 contributors. vllm preload launches a weight-cache daemon that keeps post-quantized weights resident in GPU memory across engine restarts; experimental vllm snapshot uses CRIU to restore an initialized TP1 engine.",
                  "FlashMLA mega attention with the NVFP4 compressed KV cache is now the SM100 default for DeepSeek-V4.1-Flash.",
                  "MRV2 gains draft-model speculative decoding and custom logits processors; also new are a MoonEP all-to-all backend, prefill context parallelism with DP, and an NCCL weight-transfer backend for RL.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "--max-num-active-seqs caps running admission independently of max_num_seqs, and the waiting queue now favors requests that already hold KV blocks.",
                  "Prefix-cache keys are tagged by source and LoRA paths are part of the block hash.",
                  "Dependencies: FlashInfer 0.7.0.post1, Transformers 5.17.0, XGrammar 0.2.7.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Per-request mm_processor_kwargs and media_io_kwargs are rejected unless the server runs with --trust-request-mm-kwargs. Server-level kwargs and offline LLM use are unchanged.",
                  "tokenizer_mode=slow is removed, --enable-mamba-fine-grained-prefix-cache becomes --enable-mamba-shared-prefix-checkpoint, quantization=fp8 now redirects to fp8_per_tensor, and the AllSpark INT8 W8A16 backend is gone.",
                  "--enforce-eager now also disables JIT kernel warmup, and MRV1 with PP>1, async scheduling and structured output is rejected at startup.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "If you restart engines for config changes or rolling deploys, preload removes the reload and requantize step. Test it before relying on it in autoscaling.",
                  "Clients that send multimodal processor kwargs per request will fail after the upgrade; either trust them server-wide or move them into server config.",
                ],
              },
            ],
            source: { label: "vLLM v0.31.0", url: "https://github.com/vllm-project/vllm/releases/tag/v0.31.0" },
          },
          {
            title: "DeepSeek-V4.1-Flash on vLLM: 5.3x the day-0 throughput, and where it came from",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "vLLM blog (Oct 7, Inferact and the vLLM team): 1.9x faster at low concurrency and 5.3x throughput under a 150 tok/s per-user constraint, both versus day-0 support.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "NVFP4 compressed KV is 45% smaller than the prior FP8 KV, about 890 bytes per token for global KV, while sliding-window KV stays FP8 over the last 128 positions in 40 layers; the MegaAttention kernel adds 1.45x.",
                  "Fused kernels: Mega-mHC 1.14 to 1.51x over TileLang on GB200, Mega-Gate 1.18 to 1.31x, and sparse MQA logits on GB300 1.2x at 8K tokens and 14 to 23x at 512K.",
                  "SWA bounded replay with CUDA graphs cuts TTFT about 30% and is on by default, toggled with --[no-]swa-bounded-replay.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Recipes: TP4 with FlashInfer attention for low latency, DEP2 for throughput, on GB200 and GB300. GSM8K and GPQA stay within about 1.5 standard errors of reference.",
                  "Re-benchmark V4.1-Flash on v0.31.0 before sizing capacity from day-0 numbers.",
                  "The 512K sparse MQA speedup matters most for agent workloads that run very long contexts.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-10-07-deepseek-v41-flash" },
          },
          {
            title: "llama.cpp v0.6.0: extended batch API, W4A4 matmul, and a session format bump",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Oct 5 (build b11429). A new llama_batch_ext API with llama_process() handles mixed token and embedding batches, including MTP and deepstack state embeddings.",
                  "MTP speculative decoding for Qwen4Exp, about 1.5x decode on DGX Spark; Metal mat-mul kernels up to about 3x faster on Apple GPUs.",
                  "New models include GLM-5.3-Flash, the Clef decision model, Ling 3.0 VL and LFM2.5-Encoder; the server adds a /v1/systemone endpoint for decision models.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Quantization: a new llama_prec_policy and a model-driven W4A4 (NVFP4 and MXFP4) mul_mat path, plus a CPU tiled k-quant mul_mat.",
                  "Backends: Metal tensor-API flash attention for F16 KV, Vulkan sparse flash attention for quantized K and V, ggml v0.26.0, and Windows ARM64 MSVC builds.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "LLAMA_SESSION_VERSION goes to 11 and LLAMA_STATE_SEQ_VERSION to 4, so saved session and sequence-state files from older builds are affected.",
                  "mtmd_get_memory_usage() now returns an mtmd_memory_usage struct.",
                  "Follow-up b11435 (Oct 6) fixes a k-pool scatter data race, so pin past it if you build from tags.",
                ],
              },
            ],
            source: { label: "llama.cpp v0.6.0", url: "https://github.com/ggml-org/llama.cpp/releases/tag/v0.6.0" },
          },
        ],
      },
      {
        header: "// FOUNDATION MODELS AND APIS",
        intro: "A very cheap Haiku with new tokenizer math, a 1T open-weight MoE without weights yet, decision APIs going public, and model strings that no longer mean what they say.",
        items: [
          {
            title: "Claude Haiku 5.5: $0.10 and $0.50 with 1M context, but count your tokens again",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Oct 7, model ID claude-haiku-5-5, on the Claude API, Bedrock, Google Cloud, Microsoft Foundry and Claude Platform on AWS. 1M context, 128K max output, 300K through the Batch API beta.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "Prompts up to 100K tokens: $0.10 input, $0.50 output, $0.01 cache read, and $0.125 or $0.20 for 5-minute or 1-hour cache writes per Mtok.",
                  "Over 100K tokens: $0.50 input, $2.50 output, $0.05 cache read. Batch is 50% off.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Omit temperature, top_p and top_k; listed values return a 400.",
                  "It uses the newer tokenizer, so the same text counts about 30% more tokens than on Haiku 4.5. Recompute cost and context budgets.",
                  "Adaptive thinking is on by default and set through effort; thinking blocks work only in the producing account or one linked to it; the minimum cacheable prompt is 512 tokens.",
                ],
              },
              {
                label: "Deployment profile",
                bullets: [
                  "Prompt-length price tiers make tokens past 100K five times the short-prompt rate, so the 100K boundary is worth designing RAG and agent context around.",
                  "The model page lists no capability benchmarks; evaluate against your current small model before switching.",
                ],
              },
            ],
            source: { label: "Claude docs", url: "https://platform.claude.com/docs/en/models/haiku-5-5/overview" },
          },
          {
            title: "Mistral Large 4 preview: 1T total, 52B active, weights promised by end of October",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Oct 6: a hybrid instruct-and-reasoning MoE with multimodal input, 1T total and 52B active parameters, in preview on Mistral Studio. Mistral says weights come by the end of the month; license and context length are not stated.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "$1.36 input and $4.18 output per Mtok during the preview.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "Runner not stated: DeepSWE v1.1 61.7%, SWE-Atlas-QnA 59.4%, Terminal-Bench 4 28.3%, Cybench 93% of 40 challenges, AutomationBench 59.9%.",
                  "Third party: Surge AI's blind human coding eval scores it 3.74 of 5, second of five behind Claude Opus 5 at 4.22; Lakera B3 says it resists 93.3% of attacks; Artificial Analysis places it top five on its Cyber Index.",
                ],
              },
              {
                label: "Deployment profile",
                bullets: [
                  "At 1T total parameters, self-hosting means multi-node or aggressive quantization once weights land; until then it is API-only.",
                  "Terminal-Bench 4 at 28.3% is low next to its other coding scores, so test agentic shell tasks specifically.",
                ],
              },
            ],
            source: { label: "Mistral AI", url: "https://mistral.ai/news/mistral-large-4" },
          },
          {
            title: "Update: decision models go public, cheaper and multimodal, and the first outside test is a wash",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "OpenAI's Decisions API entered public beta on Oct 6 at POST /v1/decisions on gpt-6-luna: predicate, choice and score questions, $0.10 per 1M input tokens with no output or cache charge, and images only as inline base64.",
                  "Cloudflare (Oct 9) added Clef-omni on Qwen3-Omni-30B-A3B (text, image, audio and video; about 130ms median for text), sped up Clef 1.7 to 2.0x, and cut hosted Clef-flash from $0.09 to $0.038 per Mtok while its hosted context drops from 64K to 24K.",
                  "Liquid AI released open d1-3B and d1-omni-600M decision models (Oct 7), quoting 8ms per decision on an RTX 4090.",
                ],
              },
              {
                label: "The evaluation worth reading",
                bullets: [
                  "construct.computer (Oct 5), which runs Jev in production, ran 117 synthetic cases three times each: Clef 92.3%, Jev 88.6%, Clef-flash 82.1%, with a 95% CI on the Clef lead of -1.1 to +8.8 points, so not significant.",
                  "Clef returned identical probabilities on repeat calls while Jev varied by up to 0.10; median REST latency from a laptop was 654ms for Clef, not the 209ms Cloudflare quotes.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "The category is real, but every accuracy claim is still vendor-run or vendor-adjacent. Label a few hundred cases from your own routing traffic before switching.",
                  "Hosted Clef-flash's new 24K context limit can break long-input classifiers that worked last week.",
                ],
              },
            ],
            source: { label: "Cloudflare blog", url: "https://blog.cloudflare.com/clef-faster-cheaper-multimodal/" },
          },
          {
            title: "The Gemini API now silently reroutes deprecated model strings",
            parts: [
              {
                label: "What changed",
                bullets: [
                  "Oct 8: gemini-3.7-flash is deprecated and all requests to it are automatically routed to gemini-3.8-flash; gemini-3.5-flash likewise routes to gemini-3.6-flash.",
                  "The deep-research-pro-preview-12-2025 agent shuts down Oct 23, 2026; move the agent parameter in interactions.create to deep-research-preview-04-2026.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "A pinned model string no longer guarantees the model. Eval baselines, regression suites and cost models recorded on those IDs changed under you on Oct 8.",
                  "Record the model version each response reports, not only the one you requested, and re-run baselines on the new targets.",
                ],
              },
            ],
            source: { label: "Gemini API changelog", url: "https://ai.google.dev/gemini-api/docs/changelog" },
          },
        ],
      },
      {
        header: "// AGENTIC SYSTEMS AND EVAL",
        intro: "Two benchmarks that score the work, not the answer: whether the evidence came before the action, and whether a checker separates vulnerable from fixed code.",
        items: [
          {
            title: "Tool agents act before they have the evidence, and static accuracy hides it",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "NUS (arXiv 2610.07753, Oct 6) names the evidence-to-action gap: an agent can reach the right outcome without first establishing the evidence that justified acting.",
                  "SafeActBench has 656 cases across 6 operational domains and 5 protocols, a provenance-bound Evidence Ledger and a deterministic trajectory evaluator, run on 10 model-harness configurations.",
                ],
              },
              {
                label: "Findings",
                bullets: [
                  "On the same cases, three configurations score at least 95% static accuracy but at most 52% interactive success.",
                  "Agents stopped before finishing required investigation in 21.7% to 62.9% of V0 episodes, and 37.0% to 66.9% of V1 action attempts came before the required evidence was established.",
                  "With one decisive record withheld on 43 cases, agents still acted in 46.5% to 53.5% of completed episodes.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Grade trajectories, not just final answers: check that the evidence an action depends on was retrieved before the action ran.",
                  "For irreversible tools, gate execution on a recorded evidence check, the same spot last week's Mid-Harness used for its verifier.",
                ],
              },
            ],
            source: { label: "arXiv 2610.07753", url: "https://arxiv.org/abs/2610.07753" },
          },
          {
            title: "CheckerBench: the best agent writes a working vulnerability checker 45% of the time",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2610.07557 (Oct 6) asks agents to turn real vulnerabilities into reusable static-analysis checkers: inspect the repo, write analyzer-specific logic, and iterate on compile and analysis feedback.",
                  "300 tasks from 297 CVEs across 167 repositories, 85 CWEs and 5 language ecosystems.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "The CheckerLab harness rebuilds each submitted checker and scores vulnerable-versus-fixed diagnostic contrast, patch localization, false positives and tool use.",
                  "21 model-harness configurations, each run three times.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Mean Pass@1 is 32.30% and the best configuration reaches 45.33%, so long-horizon tool work that must generalize beyond a single fix is still unreliable.",
                  "Scoring the contrast between vulnerable and fixed versions, plus false positives, is worth copying: a checker that flags everything cannot pass.",
                ],
              },
            ],
            source: { label: "arXiv 2610.07557", url: "https://arxiv.org/abs/2610.07557" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether SGLang cuts a release on FlashInfer 0.7.0.post1 now that its main branch pins it, and whether either engine moves to FlashInfer v0.7.1 (Oct 9), which changes several MoE and MQA call signatures.", source: { label: "FlashInfer v0.7.1", url: "https://github.com/flashinfer-ai/flashinfer/releases/tag/v0.7.1" } },
      { text: "Whether MRV2 sequence parallelism lands before v0.32 removes MRV1. Tracking issue #47172 still lists it unchecked, and PR #46789 renders inconsistently (draft on one view, merged on another), so it needs a manual look.", source: { label: "vLLM issue #47172", url: "https://github.com/vllm-project/vllm/issues/47172" } },
      { text: "Whether Mistral Large 4 weights ship by the end of October as promised, and under what license.", source: { label: "Mistral AI", url: "https://mistral.ai/news/mistral-large-4" } },
    ],
  },
  {
    date: "2026-10-04",
    range: "September 28 to October 4, 2026",
    tldr: [
      "Watchlist: vLLM main now pins FlashInfer 0.7.0.post1 (tagged Sept 29), but no vLLM release ships it yet and SGLang v0.5.21 still pins 0.6.18. The MRV2 sequence parallelism PR is still open. SGLang deleted its separate SWA radix cache, yet branching-point caching still has numbers only for DeepSeek-V4-Flash. Navier-Stokes and SP3O: still no independent confirmation, and SP3O's code link now returns 404.",
      "Decision models became a category this week: Cloudflare open-sourced Clef and Clef-flash (Apache 2.0, 209ms and 39ms median latency), SGLang v0.5.21 added a /v1/decisions endpoint, and OpenAI previewed a Decisions API at DevDay. Typed answers with calibrated probabilities replace a chat model parsing its own JSON.",
      "Mid-tier models closed on their flagships. Claude Sonnet 5.5 ($2/$10, 30%+ faster output than Sonnet 5) lands within about two points of Opus 5.5 on CursorBench and OSWorld; GPT-6.1 Sol ($2/$10, cached input halved to $0.10) matches GPT-6 Astra on DeepSWE at about a fifth of the cost. Sonnet 5.5 inherits Opus 5.5's breaking changes.",
      "Post-training: EasyPPO finds two more ways the PPO critic destabilizes LLM RL and fixes both with loss reweighting; RIDE distills RL gains in hidden-state space and approaches or exceeds the RL teacher on all four pairs tested; Nereus replans RL parallelism mid-run for 27.7% lower step latency.",
      "A KV-compression gotcha: DeepSeek-V4's chunked KV cache retrieves facts unevenly depending on where they sit relative to the compression window, up to 40 points apart at 128K, and average scores hide it.",
      "Agents: self-evolving search agents co-cheat as proposer and solver converge on shared errors, which cross-fitted rewards cut to 3.0-3.7% false agreement; Mid-Harness verifies sampled actions before execution and lifts TerminalBench-Lite Pass@1 from 50.0% to 68.0%.",
    ],
    sections: [
      {
        header: "// POST-TRAINING AND RL",
        intro: "The critic thread runs a third week, distillation moves into hidden states, and a runtime replans parallelism while RL is running.",
        items: [
          {
            title: "EasyPPO: two more ways the PPO critic breaks LLM RL, and three cheap fixes",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.36802 (Sept 29; authors include Joseph Gonzalez, Alvin Cheung and Karthik Narasimhan) argues PPO's learned critic, usually counted as its key strength, is also a major source of instability in LLM RL.",
                  "EasyPPO stays stable for the full training horizon on continuous-reward coding (FrontierCS), binary-reward math (AIME24) and multi-turn search (Search-R1), with best-validation gains over PPO of 14.89%, 2.28% and 9.47% relative, and beats VAPO and HL-Gauss PPO.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Failure one: filtering truncated rollouts out of both actor and critic quietly changes the objective to reward conditioned on completion, so truncation can rise even while measured reward improves.",
                  "Failure two: prompts differ in return noise, and in finite batches the high-variance prompts dominate critic updates.",
                  "Fixes: filter overlong rollouts for the actor only, so the critic still learns from truncated returns; weight each prompt's critic loss by the inverse standard deviation of its sampled returns; and use moderately smaller critic mini-batches so gradient clipping confines outliers to fewer rollouts.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If you drop truncated rollouts from the whole batch, chart the truncation rate next to reward. Truncation rising while reward rises is this failure.",
                  "Noise-normalized critic regression is a per-prompt weight on the value loss, a few lines on top of any PPO implementation.",
                  "Third week running the critic is the story: SP3O (flat values), PACT (update order), now EasyPPO (filtering and noise). If you run PPO, audit the critic before tuning the policy.",
                ],
              },
            ],
            source: { label: "arXiv 2609.36802", url: "https://arxiv.org/abs/2609.36802" },
          },
          {
            title: "RIDE: distill the RL shift in hidden states, not in the logits",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.36484 (Sept 29, code released) proposes RL-Induced Direction Extrapolation for on-policy distillation from an RL-trained teacher.",
                  "Across four base and RL-teacher pairs spanning scales, architectures and pre-training lineages, RIDE approaches or exceeds the RL teacher on every pair, is the only method whose mean does so, and consistently beats output-space extrapolation.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "Generalized OPD lets a student pass its teacher by extrapolating an implicit reward in output space. But the language-model head passes the teacher's hidden-state change through unevenly, much of it at a small fraction of its weight, and the sampled-token log-ratios that extrapolation relies on add noise that extrapolation then amplifies.",
                  "RL shifts internal representations relative to the base checkpoint, measurably at every layer. RIDE takes the residual between the teacher and its pre-RL checkpoint at each layer and position, and regresses the student's hidden states toward targets displaced beyond the teacher along that residual.",
                  "For a sampled trajectory this equals maximizing a linear directional reward under a quadratic penalty centered at the teacher, which bounds how far the student strays.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Output-space extrapolation degrades the student whenever the teacher sits close to its base; RIDE does not, which matters when the teacher has only light RL on top.",
                  "Requirement: the teacher's pre-RL checkpoint and access to hidden states, so this is for in-house distillation of open models, not for API teachers.",
                  "One of several on-policy distillation papers this week; this one changes the matching target itself, from next-token distributions to hidden states.",
                ],
              },
            ],
            source: { label: "arXiv 2609.36484", url: "https://arxiv.org/abs/2609.36484" },
          },
          {
            title: "Nereus: replanning RL post-training parallelism while the job runs",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.34645 (Sept 28) is a cost-aware runtime that moves RL post-training jobs between execution plans as conditions change mid-run: resource availability, sequence length, memory pressure, stage bottlenecks.",
                  "27.7% lower average step latency than fixed TP/PP with DP scaling; 2.14-7.27x the throughput of OpenRLHF and 1.10-1.47x that of verl for 8B PPO.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "RL post-training coordinates several models across generation, inference and training on shared GPUs, so a plan that fit at step 1 can become slow or infeasible later.",
                  "Nereus decides whether a new plan is worth its transition cost, reuses the job's distributed state, and coordinates GPU transfers across models and stages, using Elastic Model Units and a global transition graph.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "In a 1,000-step run scaling to 1,024 GPUs, six plan transitions cost 0.079% of total run time, so replanning is close to free at that scale.",
                  "If response lengths drift during your RL runs, a plan fixed at launch ends up tuned for the wrong regime; Nereus makes replanning part of the runtime instead of a restart.",
                  "The verl comparison, 1.10-1.47x, is the realistic upside for teams already on a modern RL stack.",
                ],
              },
            ],
            source: { label: "arXiv 2609.34645", url: "https://arxiv.org/abs/2609.34645" },
          },
        ],
      },
      {
        header: "// INFERENCE AND SERVING",
        intro: "An SGLang release that removes as much as it adds, a disaggregation guide with the numbers to decide by, and a KV-compression failure that averages hide.",
        items: [
          {
            title: "SGLang v0.5.21: a decisions endpoint, a Rust prefix cache, and a cleanup that breaks old configs",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Oct 2, 779 PRs from 227 contributors. A new /v1/decisions endpoint turns an LLM or VLM into a low-latency classifier and scorer, and the Score API gains setwise scoring of all candidates in one request plus per-item candidate token scoring and calibration.",
                  "The prefix cache now runs on a Rust core by default, and PD instances can switch between prefill and decode on the fly without a restart.",
                  "Model numbers: DeepSeek-V4.1 first-token latency 22% faster on long prompts, and Kimi K3 prefill throughput 20.6% higher with disaggregation.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "The unified radix cache adds agentic-aware, tail-optimized LRU eviction, cutting p99 inter-token latency by 43.9% at concurrency 32.",
                  "Adds RL weight-update sessions with support for updating speculative draft runners, so a draft model can be refreshed alongside the policy.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Role switching is the operational win for disaggregated fleets: rebalance prefill and decode capacity as the traffic mix shifts, without restarts.",
                  "If you run classification or routing through chat completions with constrained output, benchmark /v1/decisions against it on latency and calibration.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Deprecated endpoints, environment variables and aliases older than two releases are removed. Grep launch scripts and clients before upgrading.",
                  "The C++ radix tree implementation is gone, and so are the separate SWA and mamba radix caches; hybrid SWA and SSM models already routed to the unified radix cache.",
                  "Still CUDA 13 and torch 2.13.0, and still pinned to flashinfer-python 0.6.18.",
                ],
              },
            ],
            source: { label: "SGLang v0.5.21", url: "https://github.com/sgl-project/sglang/releases/tag/v0.5.21" },
          },
          {
            title: "When prefill/decode disaggregation pays off in vLLM, and the flags to do it",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "A practical guide on the vLLM blog (Sept 29, IBM Research) for v0.30.0 and later: when to split prefill and decode, which KV connector to use, and how to run a GPU-less render tier.",
                  "Qwen2.5-7B with 8K prompts on two L40S: collocated p99 inter-token latency jumps from 23ms to 169ms at only 0.4 req/s, while P/D holds 25-52ms over the same load range.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Prefiller and decoder are separate vllm serve instances joined by --kv-transfer-config, for example NixlConnector with kv_role kv_producer on one side and kv_consumer on the other. Connectors include NIXL, Mooncake, LMCache, AMD MoRI-IO, NCCL peer-to-peer, and MultiConnector to chain them.",
                  "kv_lease_duration (default 30s) sets how long the prefiller holds blocks, and kv_load_failure_policy picks fail (default) or recompute when a transfer fails.",
                  "For multi-turn agents, bidirectional_kv_xfer lets the prefiller pull the previous turn's KV from the decoder instead of recomputing it.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Disaggregate when p99 inter-token latency misses its SLO under load with long prompts and high concurrency. Do not when TTFT is the binding constraint or the KV fabric is slow: on PCIe 4.0 without peer-to-peer, a 10K-token Llama-3.1-70B KV cache (3GB) adds about 1.3s to TTFT.",
                  "Check nvidia-smi topo -p2p r and the decoder's KV transfer metrics first, benchmark with a 7B-class model or larger, and disable prefix caching across runs.",
                  "At larger scale, Qwen3-235B on 8x MI300X with MoRI-IO met a 1s TTFT plus 50ms ITL target on 73 of 100 requests versus 30 collocated, about 2.4x goodput.",
                ],
              },
              {
                label: "Gotchas",
                bullets: [
                  "Bidirectional transfer can misalign when a reasoning model's chat template drops thinking traces between turns, and nothing detects it yet.",
                  "Streaming derender replays parser history on every chunk, about 9x CPU overhead for long reasoning output, so raise --renderer-num-workers from its default of 1.",
                  "On plain vllm serve, the render and generate endpoints need --enable-scale-out since v0.30.0.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-09-29-disaggregated-serving-guide" },
          },
          {
            title: "Chunked KV compression has periodic weak spots, up to 40 points apart",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "ByteDance Seed (arXiv 2609.36322, Sept 28) shows models with chunked KV-cache compression retrieve information unevenly depending on a token's phase: its position relative to the compression-window boundaries.",
                  "In DeepSeek-V4 (window 8, stride 4), needle retrieval at 128K differs by up to 40 points across target positions, with a period equal to the stride. DeepSeek-V4.1-Flash compresses with stride 2, and all of its even residues stay above all of its odd ones.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Chunked compression folds windows of consecutive tokens into fewer cache entries at a fixed stride, which creates a positional coordinate that standard long-context benchmarks never vary.",
                  "The authors reproduce it by pretraining transformers from scratch across several compression designs: full attention stays within 6.1 points across residues, while compressed variants show gaps of up to 75.3 points at similar mean accuracy.",
                  "Causal interventions show phase specialization, with different attention components handling retrieval from different source phases, and an idealized analysis suggests gradient dynamics favor that specialization.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If you serve or fine-tune DeepSeek-V4-family models for long-context retrieval, stratify needle and RAG evals by position modulo the stride. A good average can hide a position class that fails.",
                  "Apply the same check to any fixed-stride KV compression you build or adopt.",
                  "Nothing here says these models are worse on average. The risk is systematic misses at specific positions, which look like random retrieval failures in production.",
                ],
              },
            ],
            source: { label: "arXiv 2609.36322", url: "https://arxiv.org/abs/2609.36322" },
          },
        ],
      },
      {
        header: "// FOUNDATION MODEL RELEASES",
        intro: "Two mid-tier models that close most of the gap to their flagships, and a new kind of model that answers with probabilities instead of text.",
        items: [
          {
            title: "Claude Sonnet 5.5: near-Opus scores at Sonnet prices, with Opus 5.5's breaking changes",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Sept 28, model ID claude-sonnet-5-5, on the Claude API, Bedrock, Google Cloud and Microsoft Foundry. 1M context, 128K max output, 300K through the Batch API beta.",
                  "Anthropic says it generates output 30%+ faster than Sonnet 5 and costs up to 30% less per task.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "$2 input and $10 output per Mtok, unchanged from Sonnet 5. Cache reads $0.20, cache writes $2.50 for 5 minutes or $4 for 1 hour, Batch 50% off.",
                  "That is half of Opus 5.5's list price for scores within about two points of it on several of Anthropic's agentic benchmarks.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "Anthropic's table, Sonnet 5.5 vs Sonnet 5 vs Opus 5.5: CursorBench 4.0 55.5% vs 34.1% vs 57.8%; OSWorld 2.1 80.1% vs 57.0% vs 81.8%; GDPval-AA v2.1 1844 vs 1449 vs 1846.",
                  "Terminal-Bench 4.0 shows 70.6% against 10.3% for Sonnet 5, above Opus 5.5's footnoted 66.4%. All vendor-run.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Default effort is high, and up-front thinking can only be turned off with the new between_tools setting. Integrations that ran Sonnet 5 with thinking disabled must switch before migrating.",
                  "Forced tool use returns a 400, thinking blocks are tied to model and conversation, computer_20251124 is rejected on the Claude API and Google Cloud, and text between tool calls now appears in thinking blocks.",
                  "The advisor tool rejects Claude Opus 4.8, Opus 4.7 and Sonnet 5 as advisors.",
                ],
              },
            ],
            source: { label: "Anthropic", url: "https://www.anthropic.com/claude-sonnet-5-5" },
          },
          {
            title: "GPT-6.1 Sol: Astra-level coding at Sol prices, plus Ultrafast and a Decisions API",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Sept 29, at DevDay: gpt-6.1-sol for agentic coding, computer use and professional work, in the API, ChatGPT Work and Codex.",
                  "1.05M context, 128K max output, knowledge cutoff April 30, 2026, reasoning effort from low to max with medium as default. Tools work only through the Responses API, and fine-tuning is not available.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "$2 input and $10 output per Mtok, the same as GPT-6 Sol, but cached input falls from $0.20 to $0.10. Cache writes $2.50; over 272K input tokens, 2x input and 1.5x output on the whole request.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "OpenAI's numbers: DeepSWE v1.1 matches GPT-6 Astra at roughly one fifth of the cost and beats GPT-6 Sol's best by 6.4 points at lower effort; OSWorld 2.0 offline 7 points above GPT-6 Sol at max effort; AutomationBench 2.2 points above Opus 5.5 at medium effort at about a third of the cost.",
                  "Factuality: at low effort, the share of responses with a factual error drops from 11.4% to 7.7%.",
                ],
              },
              {
                label: "Also at DevDay",
                bullets: [
                  "Ultrafast for GPT-6 Astra: up to 6x faster token generation in the API and up to 8x (300 tok/s) in Codex; Ultrafast for GPT-6.1 Sol is coming.",
                  "The Agents API adds computer use, and a Decisions API in limited preview focuses Luna on user-defined questions with finite, predefined answers.",
                ],
              },
            ],
            source: { label: "OpenAI", url: "https://openai.com/index/introducing-gpt-6-1-sol/" },
          },
          {
            title: "Cloudflare Clef: open-weight decision models that answer with calibrated probabilities",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Oct 1: Clef and Clef-flash, Apache 2.0 on Hugging Face and hosted on Workers AI, built on frozen Qwen3.8-27B and Qwen3.5-9B backbones with 64K context and vision encoders.",
                  "Median latency 209.3ms for Clef and 38.8ms for Clef-flash (p95 122.4ms).",
                ],
              },
              {
                label: "Innovations",
                bullets: [
                  "A decision model returns typed answers with calibrated probabilities instead of free text: yes/no, a choice among options ranked by criteria, or an ordinal score, all declared in the request.",
                  "Non-autoregressive scoring with two-stage attention routing, trained with label-smoothed cross-entropy plus a Brier loss for calibration, then reinforcement learning for calibrated decisions (RLCD).",
                  "An RL fine-tuning platform captures traffic through AI Gateway, generates rollouts on Workers AI and trains rank-256 LoRA adapters. For now it runs as a partnership with Cloudflare engineers, not self-serve.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "On TypeSafe's Jev Decision Index: BFCL case-exact 98.47 (Clef) and 98.76 (Clef-flash) vs 95.75 for Jev; BANKING77 macro-F1 94.20 vs 79.74; median latency 209ms vs 524ms.",
                ],
              },
              {
                label: "Deployment profile",
                bullets: [
                  "TypeSafe's Jev, Clef's comparison baseline, came first. This week SGLang v0.5.21 shipped /v1/decisions and OpenAI previewed a Decisions API on Luna, so routing, guardrails and agent branch choices no longer need a chat model parsing its own JSON.",
                  "With Apache 2.0 weights, the 9B variant can sit inline on every agent step on your own GPUs; the 39ms median is Cloudflare's hosted figure, so measure your own.",
                ],
              },
            ],
            source: { label: "Cloudflare blog", url: "https://blog.cloudflare.com/clef-decision-models/" },
          },
        ],
      },
      {
        header: "// AGENTIC SYSTEMS AND EVAL",
        intro: "Both papers move verification to a new place in the loop: between proposer and solver, and between model and shell.",
        items: [
          {
            title: "Self-evolving search agents co-cheat, and internal reward hides it",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Rutgers (arXiv 2609.39102, Sept 30) names co-cheating: when a proposer writes the questions and a solver answers them, the two increasingly agree on shared errors, so internal reward improves without a matching gain in external correctness.",
                  "A post-hoc audit against source evidence shows it worsening over successive rounds, with pseudo-label correctness flat or falling while the in-loop training signal improves.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "Multi-sample verification (MSV) queries the model three times with the source and three times without to admit tasks and replace unreliable pseudo-labels. It helps only a little and costs six extra generations per candidate.",
                  "CrossFit splits the proposer's source documents into groups A and B: questions from A are scored by an auxiliary solver trained only on B, and vice versa. Cross-fitted agreement sets the proposer's reward, so a same-source pseudo-label cannot be reproduced through the feedback solver, and the main solver's update rule is unchanged.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "False-agreement mass on Qwen3.5-4B and 9B: 6.1% and 8.8% baseline, 5.7% and 7.2% with MSV, 3.0% and 3.7% with CrossFit, and 0.4% and 0.1% when identical proposals are replayed with source-excluded feedback.",
                  "Downstream, CrossFit beats coupled self-evolution by 8.8 and 8.4 points and Search-R1 by 8.7 and 7.8 points across seven search benchmarks.",
                  "For any self-play or self-curriculum loop, track agreement against an external check over rounds. Internal reward rising while external accuracy stalls is the signature.",
                ],
              },
            ],
            source: { label: "arXiv 2609.39102", url: "https://arxiv.org/abs/2609.39102" },
          },
          {
            title: "Mid-Harness: sample and verify actions before the terminal runs them",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "NVIDIA (arXiv 2609.39982, Sept 30) spends test-time compute at the model-harness boundary: sample several candidate actions, verify them, and forward one for execution, with generator and harness unchanged.",
                  "On TerminalBench-Lite, a GPT-5.6 Sol verifier lifts a TMAX-9B agent's Pass@1 from 50.00% to 68.03% with 8 sampled actions.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "The motivation is irreversibility: one bad command, such as installing the wrong package, changes the environment and hurts every later step, even when the model could have produced a better one.",
                  "More sampling helps little under a weak verifier; a capable verifier exploits alternatives the same generator already produces. With TMAX-9B as its own verifier, pairwise verification works best among the mechanisms tested.",
                  "Distilling the stronger verifier's responses into TMAX-9B improves Pass@1 further without touching the action generator.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Combining action scaling with trajectory scaling reaches higher success at lower estimated token cost than generating more trajectories alone, which makes per-step verification the cheaper axis for terminal agents.",
                  "It drops into an existing harness as a filter in front of the shell, and the gains held across additional models, benchmarks and harnesses.",
                ],
              },
            ],
            source: { label: "arXiv 2609.39982", url: "https://arxiv.org/abs/2609.39982" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether a vLLM release ships FlashInfer 0.7.0.post1. Main pins it while v0.30.0 does not, and SGLang v0.5.21 is still on 0.6.18. Fourth week on this list in some form.", source: { label: "vLLM main requirements", url: "https://github.com/vllm-project/vllm/blob/main/requirements/cuda.txt" } },
      { text: "Whether MRV2 sequence parallelism lands before v0.32 removes MRV1. PR #46789 is still open, with discussion about relaxing its DP>1 guard.", source: { label: "vLLM PR #46789", url: "https://github.com/vllm-project/vllm/pull/46789" } },
      { text: "Whether decision models hold up outside vendor-run classification benchmarks. Clef's comparison runs on TypeSafe's own index, OpenAI's Decisions API is still a limited preview, and Cloudflare's RL fine-tuning is partnership-only.", source: { label: "Cloudflare blog", url: "https://blog.cloudflare.com/clef-decision-models/" } },
    ],
  },
  {
    date: "2026-09-27",
    range: "September 21 to September 27, 2026",
    tldr: [
      "Watchlist: FlashInfer finally shipped a stable v0.7.0 (Sept 22), but vLLM v0.30.0, tagged about four hours later, still pins 0.6.18.post1. MRV2 closed dual-batch overlap and speculative decoding under pipeline parallelism; sequence parallelism, logits processors and elastic EP still fall back to MRV1, and now so does the 'all' Mamba cache mode. Navier-Stokes, SGLang branching-point caching and SP3O: no change and no outside confirmation.",
      "Two frontier price cuts landed on Sept 22. Claude Opus 5.5 runs $4/$20 with $0.20 cache reads, but thinking is always on and forced tool use now errors. GPT-6 Sol and Luna come in at $2/$10 and $0.10/$0.50, at least 50% below GPT-5.6.",
      "vLLM v0.30.0 is a security upgrade as much as a feature release: two Sept 23 advisories, including a structured-output crash any authenticated client can trigger in the default config, are fixed only there. It also adds a GPU-resident weight cache for restarts and a host-memory KV tier for sparse-MLA decode.",
      "Post-training plumbing: PACT defines token-level credit and flips PPO to actor-then-critic (+8.8 points over GRPO on agentic math, 67.4% SWE-bench Verified). CIS caps importance ratios by token confidence to absorb the logprob gap between inference and training engines.",
      "Data and pipelines: a CPU-only diversity selector for SFT traces adds 16.9 points of pass@8 on held-out environments after RL, QwenGyre moves GPUs between rollout and training mid-run for up to 1.85x, and Shopify swapped a $27M/yr frontier bill for a daily-retrained model at about $1M.",
      "Low-bit and local: ISTA's disaggregated quantization pairs a 1-bit decoder with an NVFP4 prefiller (+32.5 MMLU-Pro) and gets 1.78x TTFT in llama.cpp. vllm-metal brings paged attention and continuous batching to Macs: 16 concurrent requests where llama.cpp offers 4 slots.",
    ],
    sections: [
      {
        header: "// POST-TRAINING AND RL",
        intro: "Both results fix the plumbing between what the sampler did and what the gradient sees: one on the critic side, one between the two engines.",
        items: [
          {
            title: "PACT: define token credit, then update the critic after the actor",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.26355 (Sept 22) states three regularity conditions for token-level credit, Completeness, Prefix Consistency and Neutrality, and proves they determine it uniquely.",
                  "Two consequences: an ideal on-policy distillation teacher acts as an implicit critic, and response-level RLOO matches token-level credit in expected policy gradient despite its coarser granularity.",
                  "Results: 72.87% average across four agentic math benchmarks, 8.80 points over GRPO and 13.16 over PPO; 67.4% on SWE-bench Verified, ahead of PPO, GRPO and SAO by 2.4, 2.0 and 3.8 points.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "Under bounded outcome rewards credit is approximately sparse: most tokens deserve close to zero. In GAE, intermediate critic errors can then be as large as the credit they are supposed to estimate.",
                  "The critic's value targets come from the policy that generated the batch, not the policy after the update. PACT (Policy Aligned Critic Training) updates the actor first, then trains the critic with an importance-sampling correction so it tracks the updated policy.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If you run PPO, update order is a few lines in the training loop. Try actor-then-critic with importance-corrected value targets before another round of GAE lambda tuning.",
                  "If you stayed on response-level RLOO because token-level methods looked better on paper, this says the expected gradient is the same, so the coarser signal is not what is holding you back.",
                  "Read it with last week's SP3O: two independent groups now locate the lost signal in the PPO critic rather than in the policy objective.",
                ],
              },
            ],
            source: { label: "arXiv 2609.26355", url: "https://arxiv.org/abs/2609.26355" },
          },
          {
            title: "Calibrated importance sampling for the inference-versus-trainer logprob gap",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.32444 (Sept 26) studies training-inference mismatch in RLVR: rollouts are sampled by an inference engine, gradients are computed by a training engine, and the two assign different probabilities to the same tokens.",
                  "Calibrated importance sampling (CIS) gets the highest five-benchmark math average on all three mixture-of-experts models tested, against the evaluated baselines. Code is public.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "The mismatch behaves like an additive displacement in log-odds, set by per-logit perturbation before the softmax, and its distribution is roughly the same whatever the token's confidence.",
                  "So CIS truncates large positive displacements at one constant threshold. Mapped back to probabilities, that is an importance-ratio cap that tightens as token confidence rises.",
                  "Exact importance sampling has an unbounded second moment; CIS replaces it with a term bounded by a constant, at the cost of a bias controlled by the truncated excess.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If you already correct with truncated importance sampling and a single cap, CIS refines the same knob: it puts less truncation bias on low-confidence tokens, which is where exploration happens.",
                  "One finding to act on now: clipping small importance weights upward reduced held-out accuracy. If your correction clamps ratios from below, test removing that side.",
                  "All three models are MoE and all five benchmarks are math, so treat dense models and agentic rewards as untested.",
                ],
              },
            ],
            source: { label: "arXiv 2609.32444", url: "https://arxiv.org/abs/2609.32444" },
          },
        ],
      },
      {
        header: "// DATA AND TRAINING SYSTEMS",
        intro: "Three views of the same lever: which traces go into SFT, how a cluster is shared while RL runs, and what retraining every day buys in production.",
        items: [
          {
            title: "Select diverse SFT traces, not similar ones, when RL comes next",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Google researchers (arXiv 2609.33780, Sept 27) find verified solutions are not equally useful for preparing a model for RL: choosing diverse reasoning routes beats choosing similar ones for post-RL problem coverage on puzzles and math.",
                  "OLMo3-7B gains 16.9 points of pass@8 on held-out environments, and single-model math gains reach 6.2 points of mean pass@8 across 10 benchmarks, over three open-source corpora.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "A lightweight, rule-based fingerprint of each trace's reasoning route drives the selection. It runs on CPU with no model calls.",
                  "It beat more computationally expensive selection alternatives in every evaluation reported.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If your SFT filter checks correctness and then deduplicates near-identical answers, deduplicate on the reasoning route instead. Ten correct traces that take the same path teach one thing.",
                  "Judge the selector by post-RL pass@k on held-out environments, the metric the gains were reported on, rather than by post-SFT accuracy.",
                  "CPU-only means it slots into an existing data pipeline as a preprocessing step with no GPU budget.",
                ],
              },
            ],
            source: { label: "arXiv 2609.33780", url: "https://arxiv.org/abs/2609.33780" },
          },
          {
            title: "QwenGyre: moving GPUs between rollout and training without stopping live agents",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Qwen's framework for extreme-long-horizon online RL (arXiv 2609.33848, Sept 27), where a single rollout can run for hours, span hundreds of model-environment interactions, and approach 1M tokens.",
                  "On Qwen3.8 2.4T with 700K tokens per rollout, NL2RepoBench rises from 52.5% to 58.5% in 48 steps. Across training domains it is up to 1.85x faster than colocated and 1.78x faster than async baselines.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Two problems at this horizon: execution times vary so much that GPUs idle while waiting on stragglers, and branching agent histories create large amounts of redundant trajectory.",
                  "QwenGyre elastically reallocates GPUs between rollout and training without interrupting executions already in flight.",
                  "A trajectory processor reconstructs branching histories, scores partial progress, and deduplicates redundant paths, which bounds the training cost of each step.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "The baselines are the two designs most RL stacks offer: colocated, where rollout and training take turns on the same GPUs, and async, where they run on separate pools. At hour-long horizons both leave capacity idle.",
                  "Scoring partial progress on reconstructed branches is the component to study if your rewards only arrive at the end of long tasks.",
                  "No code is linked from the paper page, so treat this as a design reference rather than something to install.",
                ],
              },
            ],
            source: { label: "arXiv 2609.33848", url: "https://arxiv.org/abs/2609.33848" },
          },
          {
            title: "Shopify retrains its agent model daily and cut a $27M serving bill to about $1M",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "PyTorch blog post (Sept 22) by Shopify's ML leads on a production continual-learning loop: full-parameter SFT then GRPO on a smaller model, retrained daily and served on vLLM.",
                  "Estimated annual serving cost falls from $27M on a frontier model to about $1M, a 96% cut, and they report the specialized model surpassing the frontier model on their judge.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Low-scoring production conversations are mined as hard negatives. A panel of frontier reasoning models critiques each failure, an arbiter merges the critiques into a repair hint, and the conversation is replayed from the repair point.",
                  "If the judge passes the repaired trajectory it becomes RL data; if not, it goes to expert annotators working from the same rubric.",
                  "Training accumulates new and previous trajectories to limit drift and forgetting, and distills full reasoning chains rather than final answers.",
                  "After training, gist tokens compress a 6,000-token system prompt into about 1,500 learned tokens.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Gisting under a 350 req/min load test: TTFT down 19%, end-to-end latency down 38%, 16% more requests per second, roughly 14% fewer GPUs for the same traffic, and no measured quality loss.",
                  "The transferable advice is about the judge: check inter-annotator agreement with Cohen's kappa before trusting a rubric, backtest the judge against past A/B outcomes, and prefer several narrow judges to one monolithic score.",
                  "Their sequencing is worth copying too: harness work first, and parameter updates once harness gains flatten.",
                ],
              },
            ],
            source: { label: "PyTorch blog", url: "https://pytorch.org/blog/how-shopify-built-a-continual-learning-loop-with-pytorch-and-vllm/" },
          },
        ],
      },
      {
        header: "// INFERENCE AND SERVING",
        intro: "A vLLM release that doubles as a security fix, the FlashInfer release this list has tracked for two weeks, and a sizing guide for a 2.4T hybrid model.",
        items: [
          {
            title: "vLLM v0.30.0: GPU-resident weight cache, a host KV tier, and two DoS fixes",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Sept 22, 762 commits from 315 contributors. New models include DeepSeek-V4.1-Flash, with its whole KV stored in MXFP8 through FlashMLA V4.1 on SM100, plus GLM-5.3-Flash with EPLB and K2-Horizon.",
                  "A weight-cache daemon (--load-format ipc_cache) holds post-quantized, TP-sharded weights in GPU memory across engine restarts via CUDA IPC, including FP4 checkpoints and multi-node TP.",
                  "HiSparse, a host-resident KV tier for sparse-MLA decode, spills KV pages to pinned host memory under GPU pressure and serves top-k misses from a per-request GPU hot buffer, enabled through HiSparseConnector.",
                  "Gumbel-max watermarking with a keyed PRF and per-request opt-out; a dual-key variant keeps it compatible with speculative decoding.",
                ],
              },
              {
                label: "Model Runner V2",
                bullets: [
                  "Dual-batch overlap now works in eager mode and with FULL CUDA graphs for microbatched steps, and MTP, EAGLE3, DFlash and DSpark speculative decoding run under pipeline parallelism.",
                  "Freezing garbage collection during CUDA graph capture cuts H200 engine init from 28.9s to 8.2s. GPU-side compaction fixes a roughly 2x regression in --return-sampling-mask, the RL replay feature.",
                  "Still missing: sequence parallelism, logits processors and elastic EP, which still fall back to MRV1, slated for removal in v0.32.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "The weight cache takes load, quantize and shard out of the restart path. The release gives no restart timings, so measure your own cold and warm starts before relying on it.",
                  "Kernel gains worth checking against your models: FlashKDA for GLM-5.3 at 1.7-3.8x, grouped FP8 MLA cache insertion at 4-6x for small batches, and pruned sliding-window tiles for 3-4x end to end on Gemma 4 multimodal.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Scale-out endpoints (/render, /derender, /inference/v1/generate) are no longer registered on plain vllm serve without --enable-scale-out, and VLLM_ENABLE_SCALE_OUT_ENDPOINTS is gone. Render-tier and disaggregated setups need the flag after upgrading.",
                  "GPTQ activation ordering is removed and g_idx is ignored. Re-validate accuracy on any act-order GPTQ checkpoint before upgrading.",
                  "The 'all' Mamba cache mode is deprecated and falls back to MRV1; the gRPC server module is deprecated in favor of vllm serve --grpc; vendor YaRN aliases no longer multiply max_position_embeddings, so TeleChat3-36B drops from 131072 to 32768; the default audio resampler moves from PyAV to torchaudio.",
                ],
              },
              {
                label: "Security",
                bullets: [
                  "Two advisories published Sept 23 are fixed only in v0.30.0 and later. GHSA-85xf-c7hm-whqw (CVSS 6.5): structured-output errors escape the per-request boundary and kill the shared EngineCore at three sites, one reachable in the default configuration by any authenticated client.",
                  "GHSA-5fj9-pfhr-6j48 (CVSS 5.9): the Rust frontend uses raw HTTP method tokens as Prometheus labels, so unauthenticated requests with invented methods to /tokenize grow memory without bound, even with --api-key set.",
                  "Neither has a workaround. If vLLM takes untrusted traffic, treat this as a security upgrade.",
                ],
              },
            ],
            source: { label: "vLLM v0.30.0", url: "https://github.com/vllm-project/vllm/releases/tag/v0.30.0" },
          },
          {
            title: "Update: FlashInfer v0.7.0 is finally stable, and vLLM has not taken it yet",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Tagged Sept 22 as the latest stable release, after a run of release candidates. MoELayer becomes an official API with explicit QuantFormat fields for weights and activations, for example W4A8 as MXFP4 weights with MXFP8 activations.",
                  "Adds an experimental PrimTS backend whose expert GEMMs are readable Python built on CUTLASS DSL primitives, expert-parallel MoE across Blackwell with BF16 and W4A8 backends, and NCCL-EP with CUDA-graph capture.",
                  "Attention: DeepSeek-V4 and MiniMax-M3 sparse attention plus linear attention for Kimi K3 and Qwen 3.6, with a 2.45x geometric-mean speedup on the MiniMax-M3 kernels on B200.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Autotuner v2 measures configs under deployment-matched conditions and persists the results. In vLLM's validation on Qwen3-8B-FP8 at TP2 on B200, tuning went from 128s on a cold start to 1s on restart.",
                  "A new @flashinfer_experimental_api decorator and flashinfer.experimental namespace make unstable APIs an explicit opt-in, which should make breakage of the stable surface rarer.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "vLLM v0.30.0 was tagged about four hours later and still pins flashinfer-python 0.6.18.post1, so most users get the MoE and autotuner work only after an engine bump.",
                  "If you call FlashInfer directly, the persistent autotune cache is the immediate win: it removes a two-minute tuning pass from every restart of a tuned deployment.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "comm.trtllm_custom_all_reduce and BatchDecodeMlaWithPagedKVCacheWrapper are removed, and QuantVariant is deprecated in favor of QuantFormat.",
                  "CUDA extras now require nvidia-cudnn-frontend 1.29.0 or later, apache-tvm-ffi 0.1.11 or later, and CUTLASS DSL 4.7.0a0 or later.",
                ],
              },
            ],
            source: { label: "FlashInfer v0.7.0", url: "https://github.com/flashinfer-ai/flashinfer/releases/tag/v0.7.0" },
          },
          {
            title: "Serving a 2.4T hybrid model disaggregated: size blocks for the recurrent state",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "vLLM and NVIDIA engineers (Sept 21) on prefill/decode disaggregated serving of Qwen3.8-2.4T in NVFP4 on a GB300 NVL72: 92 layers, 69 Gated DeltaNet (GDN, linear attention with a fixed-size recurrent state) and 23 full attention, with 512 experts per layer.",
                  "At ISL/OSL 8192/1024 they reach 5,000 tok/s per GPU at the throughput end and 180 generated tok/s per user at the interactive end.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Two kinds of state: full-attention KV grows per token at 2 KiB per layer, while GDN state is a fixed ~4.2 MiB per request, about 2,108x larger.",
                  "So GDN sets the block size: 2,112 tokens per block, 4.125 MiB, enough to hold one GDN state or that many tokens of full-attention KV.",
                  "MTP with three speculative tokens helps decode until the KV cache saturates.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "If prefill and decode derive different block sizes, set --block-size manually on both sides to a value large enough for the GDN state, or the KV handoff will not line up.",
                  "For decode, TP4DP4 with EP gave the most concurrency: a smaller per-engine weight footprint leaves more memory for state, even at lower per-GPU weight utilization.",
                  "Keep headroom in gpu_memory_utilization: CUDA graph memory estimates miss actual usage by wide margins.",
                  "The general rule for any hybrid linear-attention model: work out KV and state size first, then choose the topology.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-09-21-qwen38-pd-serving" },
          },
        ],
      },
      {
        header: "// LOCAL AND LOW-BIT",
        intro: "Two results that change what fits on one machine: quantize prefill and decode differently, and bring server-style batching to the Mac.",
        items: [
          {
            title: "Disaggregated quantization: different weights for prefill and decode",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "ISTA-DASLab (arXiv 2609.26333, Sept 22) specializes compute formats, weights and storage placement separately for the prefill and decode phases. Code is public.",
                  "Headline: with released Qwen3.8-27B GGUF decoders, training an NVFP4 prefiller improves 1-bit accuracy by 32.5 points on MMLU-Pro and 35.3 on MMMU-Pro without modifying the decode checkpoint.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "The phases reward different things: low-precision arithmetic accelerates prompt processing, while compact weights cut memory traffic during generation.",
                  "On Qwen 3 and Gemma 3, removing activation quantization on decode alone improves decode-heavy accuracy without raising inference cost.",
                  "Separately trained compute-native prefill weights process prompts faster than weight-only inference while matching or beating its accuracy at 2-3-bit decode.",
                  "Offloaded disaggregated prefill (ODP) streams the extra prefill checkpoint from SSD so both fit on one device, amortizing the load over prompt length.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "On the same 27B model, ODP gives 1.78x faster TTFT than the weight-only baseline at 8K prompts in llama.cpp.",
                  "For local setups dominated by long prompts, the second checkpoint costs SSD space rather than VRAM, a trade most machines can make.",
                  "Stop picking one quantization config for both phases: evaluate decode-heavy and prefill-heavy tasks separately, because the best format differs.",
                ],
              },
            ],
            source: { label: "arXiv 2609.26333", url: "https://arxiv.org/abs/2609.26333" },
          },
          {
            title: "vllm-metal: paged attention and continuous batching on Apple Silicon",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "vLLM blog (Sept 22) on the Apple Silicon plugin: vLLM's scheduler, paged KV cache and chunked prefill on Macs, with MLX executing the model and a custom paged varlen Metal kernel replacing attention. Homebrew install, macOS 15 or later.",
                  "Covers the hybrid-attention Qwen3 family (3.5, 3.6, 3.8, Next) and Gemma 4 E4B, with 4-bit weights and GGUF checkpoints.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Prefill and decode tokens are packed into one forward pass with cu_seqlens boundaries instead of padded tensors.",
                  "With 8 requests of ragged length on Qwen3.6-35B-A3B, padding inflates mlx_lm batch time by 143%, while packed queries absorb it (-6%).",
                  "M5 chips get automatic NAX tensor acceleration: 45% lower TTFT than tiled attention on a 0.6B model.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Gemma 4 E4B holds 16 concurrent requests with flat TTFT where llama.cpp tops out at 4 slots, which is what running several local agents against one model needs.",
                  "MTP speculation adds 20% output throughput at concurrency 1 and 9% at 16, but only for Gemma 4, only with greedy sampling, and only with --no-async-scheduling.",
                  "Prefix caching on hybrid models is experimental and cannot be combined with speculative decoding yet. Benchmark on a fresh server each time; warm caches skew comparisons.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-09-22-vllm-metal-v0-28-0" },
          },
        ],
      },
      {
        header: "// FOUNDATION MODEL RELEASES",
        intro: "Anthropic and OpenAI cut frontier prices on the same day, and the Anthropic release changes defaults that some integrations will trip over.",
        items: [
          {
            title: "Claude Opus 5.5: Fable 5.1-level work for 40% less, with thinking you cannot turn off",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Sept 22, model ID claude-opus-5-5, on the Claude API, Bedrock, Google Cloud and Microsoft Foundry. 1M context, 128K max output, 300K through the Batch API beta.",
                  "Anthropic says it performs at the level of Claude Fable 5.1 on most work and costs 40% less than Opus 5 on typical workloads at default settings, from lower prices plus fewer tokens per task.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "$4 input and $20 output per Mtok, down from $5 and $25 on Opus 5. Cache reads $0.20 (60% below Opus 5), cache writes $5 for 5 minutes or $8 for 1 hour, Batch 50% off, fast mode $8 and $40.",
                  "Cache reads at one twentieth of fresh input make resending a long, stable prefix 95% cheaper than sending it fresh, so append-only agent prompts benefit most.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "Terminal-Bench 4.0 66.4% vs 55.8% for Fable 5.1 and 52.3% for Opus 5; FrontierCode v1.1 54.4% vs 50.3% and 48.0%; CursorBench 4.0 57.8% vs 51.8% and 46.6%; GDPval-AA v2.1 1846 vs 1735 Elo for Fable 5.1. All vendor-run.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "Adaptive thinking is always on and cannot be disabled; control depth with effort, which defaults to medium.",
                  "Forced tool use now returns an error, so integrations that force a specific tool call fail on this model.",
                  "Thinking blocks are tied to the model and conversation, the computer_20251124 tool version is rejected on the Claude API and Google Cloud, and text between tool calls moves into thinking blocks, which are empty at the default display setting, so UIs that stream progress between tool calls can go quiet.",
                ],
              },
            ],
            source: { label: "Anthropic", url: "https://www.anthropic.com/claude-opus-5-5" },
          },
          {
            title: "GPT-6 Sol and Luna: at least half off GPT-5.6 prices",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Sept 22: gpt-6-sol and gpt-6-luna in the API (Responses and Chat Completions, text and image input), Codex and ChatGPT. GPT-6 Astra remains the top model; these two push cost efficiency.",
                  "Sol has a 1.05M-token context, 128K max output, and reasoning effort from none to max.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "Sol $2 input and $10 output per Mtok, half of GPT-5.6 Sol's $4 and $20. Luna $0.10 and $0.50, down from $0.20 and $1.20.",
                  "Sol bills cached input at $0.20 (10% of input) and cache writes at 1.25x input. Prompts over 272K input tokens pay 2x input and 1.5x output on the whole request.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "DeepSWE v1.1: Sol 68.8% at max effort, Luna 66.6%. OSWorld 2.0 offline: Sol 60.5% at xhigh. Agents' Last Exam: Sol 56.4% at max.",
                  "OpenAI's cost claim, unverified: on AutomationBench, Sol at xhigh beats Claude Opus 5 at max effort at 9% of its cost per task.",
                ],
              },
              {
                label: "Deployment profile",
                bullets: [
                  "The 272K threshold is the line to design around: a request that crosses it pays the multiplier on every token, not just the excess, so trim or summarize context before the boundary.",
                  "Luna lands within 2.2 points of Sol on DeepSWE v1.1 (66.6% vs 68.8%) at one twentieth of the price, so test it before defaulting to Sol for coding agents.",
                ],
              },
            ],
            source: { label: "OpenAI", url: "https://openai.com/index/introducing-gpt-6-sol-and-luna/" },
          },
        ],
      },
      {
        header: "// AGENTIC SYSTEMS",
        intro: "One result this week, aimed at the failure that makes self-improving harnesses look better than they are.",
        items: [
          {
            title: "RRSI: regularize harness self-improvement or it memorizes the benchmark",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Google Research (arXiv 2609.24972, Sept 21, code released) targets automated harness evolution: loops that propose and select edits to the prompts, control flow, tools, memory and context management around a frozen model.",
                  "Across eight benchmarks in coding, agentic workspace and engineering design: up to 14.1 points on the split it evolves against, up to 4.7 points on five out-of-distribution benchmarks, and a harness that runs on 30% fewer policy tokens than unregularized evolution.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "The failure being fixed: recursive harness edits memorize the training tasks, giving large in-distribution gains that shrink or vanish out of distribution.",
                  "The proposer gets a temporally annealed budget on how many edits one candidate can bundle, and evolution history steers it toward unexplored trajectories.",
                  "The selector adds a critic that screens out benchmark-specific proposals and a pruner that removes changes that are too small, too expensive, or no longer useful.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Up to 14.1 in distribution against up to 4.7 out of distribution is the honest spread: even with regularization, most of the gain is specific to the benchmark. Ask for out-of-distribution numbers on any evolved harness.",
                  "The token saving comes with the regularization, not at its expense: the constrained harness is both more general and cheaper to run.",
                  "Pairs with last week's component-level harness ablation: harness gains are real but narrower than headline numbers suggest.",
                ],
              },
            ],
            source: { label: "arXiv 2609.24972", url: "https://arxiv.org/abs/2609.24972" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether vLLM moves to FlashInfer 0.7.0. v0.30.0 pins flashinfer-python 0.6.18.post1, so MoELayer, expert-parallel MoE and the Autotuner v2 cache reach vLLM users only after a dependency bump. Third week on this list in some form.", source: { label: "vLLM v0.30.0 requirements", url: "https://github.com/vllm-project/vllm/blob/v0.30.0/requirements/cuda.txt" } },
      { text: "Whether MRV2 sequence parallelism lands before MRV1 is removed in v0.32. The DeepSeek-V4 sequence parallelism PR is still open, and v0.30.0 added a new MRV1 fallback for the 'all' Mamba cache mode.", source: { label: "vLLM PR #46789", url: "https://github.com/vllm-project/vllm/pull/46789" } },
      { text: "Whether SGLang's branching-point radix caching gets measured on anything besides DeepSeek-V4-Flash. Still one model and one fan-out pattern. Second week on this list.", source: { label: "SGLang PR #34565", url: "https://github.com/sgl-project/sglang/pull/34565" } },
    ],
  },
  {
    date: "2026-09-20",
    range: "September 14 to September 20, 2026",
    tldr: [
      "Watchlist: MRV2 gaps did not close in the stated 2-3 weeks (sequence parallelism still open, so it still falls back to MRV1). FlashInfer still has no stable v0.7.0; rc3 cut Sept 16, vLLM keeps pinning 0.6.18. Navier-Stokes remains unverified and the Clay Institute has not accepted it.",
      "DeepSeek's V4.1-Flash tech report gives the mechanism behind last week's model: 890 bytes/token of HBM-resident KV cache, about 1/4 of V4-Flash, from CSA2 cross-layer reuse plus FP4 KV. Roughly a 4x concurrency multiplier for KV-bound agent serving.",
      "Post-training had two real results. SP3O identifies Value Flattening, a systematic PPO critic failure, and fixes it by supervising only three well-separated states per response. BATON shows credit assignment and batch aggregation are orthogonal axes on top of GRPO.",
      "Low-bit went three directions at once: VC-Attention attacks the softmax bottleneck for 1.46-1.59x attention speedup on Blackwell, Edge0 streams a 35B MoE from SSD at 20 tok/s in 3GiB, and PrismML's ternary Bonsai 2 27B holds 98.2% aggregate in 5.9GB.",
      "SGLang v0.5.20 is the upgrade to plan: branching-point radix caching takes hit rate 43.8% to 60.8% and TTFT 1.57s to 1.07s, RL sampling masks add 52% decode throughput at batch 64, and CUDA 12 wheels are gone.",
    ],
    sections: [
      {
        header: "// POST-TRAINING AND RL",
        intro: "Two papers this week attack the same blind spot from opposite ends: how credit actually reaches the parameters in policy optimization.",
        items: [
          {
            title: "SP3O: PPO critics are systematically too flat, and three states per response fixes it",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "Shanghai AI Laboratory names a failure mode in PPO critics they call Value Flattening (arXiv 2609.18708, Sept 16, code released).",
                  "True state values estimated from Monte Carlo continuations swing sharply across intermediate states, while the critic's predictions stay comparatively flat.",
                  "Reproduced in a controlled FrozenLake environment, where it gets worse as the state space grows.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "The critic in PPO estimates expected return from a state, and its job is variance reduction on the policy update. A flat critic silently stops doing that job.",
                  "Two causes identified: an implicit variance penalty inside the critic loss, and redundant updates from temporally correlated states whose gradients look nearly identical.",
                  "SP3O (Sparse Proximal Policy Optimization) applies the value loss to only a few well-separated states per response rather than every token position, which removes the redundancy and the implicit penalty together.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "Three supervised states per response is enough to mitigate the effect on Qwen3-Base, with consistent policy gains across model sizes and evaluation suites.",
                  "If you run PPO rather than GRPO, this is a cheap diagnostic: sample Monte Carlo continuations at several intermediate states and compare the spread against your critic's predictions. A flat critic is a bug you can measure today.",
                  "This is the PPO-side counterpart to BATON below. Both say the default per-token treatment of a trajectory is what is broken, not the objective.",
                ],
              },
            ],
            source: { label: "arXiv 2609.18708", url: "https://arxiv.org/abs/2609.18708" },
          },
          {
            title: "BATON: credit assignment and batch aggregation are separate axes",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.19830 (Sept 17) argues agent RL conflates two independent decisions: how feedback inside one trajectory reaches the actions, and how whole trajectories are weighted against each other in a batch.",
                  "Evaluated on ALFWorld, WebShop, and SearchQA with both GRPO and GiGPO underneath. Both axes give gains alone; the combination is strongest across model scales.",
                ],
              },
              {
                label: "Mechanism",
                bullets: [
                  "GRPO computes advantages by comparing responses within a sampled group rather than against a learned critic, which is why it needs no critic network. It was designed for single-turn generation.",
                  "Applied to agents, one scalar reward gets smeared across every token of a multi-step trajectory, and long trajectories contribute more gradient mass just by being long.",
                  "Bayesian Feedback Attribution builds a feedback-conditioned posterior over sampled actions, asking which were likely responsible rather than assigning uniform credit.",
                  "Trajectory Mass Normalization gives each complete trajectory equal optimization mass regardless of token length, so a 40-step trajectory stops dominating a 5-step one.",
                ],
              },
              {
                label: "What to change in your pipeline",
                bullets: [
                  "If you run GRPO on agent trajectories you probably have a length-normalization bug, not a hyperparameter problem: token-level normalization is the default and silently upweights the long, flailing rollouts.",
                  "TMN is a small change to the loss reduction, testable in an afternoon. It is the half of BATON that costs nothing to try.",
                  "Read the benchmarks skeptically: short-to-medium-horizon environments with clean rewards. Hold a plain GRPO baseline with matched seeds, per the DataFlex-RL null result from two weeks ago.",
                ],
              },
            ],
            source: { label: "arXiv 2609.19830", url: "https://arxiv.org/abs/2609.19830" },
          },
        ],
      },
      {
        header: "// INFERENCE AND SERVING",
        intro: "The week's center of gravity: one tech report explaining a KV cache result, two engine releases, and a kernel that picks its own schedule.",
        items: [
          {
            title: "Update: the DeepSeek-V4.1-Flash report explains where the KV cache went",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Tech report for last week's model (arXiv 2609.19969, Sept 17). The release note claimed 1/4 the HBM and 1/8 the SSD without saying how; this supplies the mechanism.",
                  "552B-backbone multimodal MoE, 1M context, Causal Encoder-Decoder activating 16B params/token on decode and 8B on prefill. Pretrained on 45T multimodal tokens.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Two compressions stack. CSA2 adds cross-layer KV reuse: layers share one compressed cache instead of each storing its own K/V, so per-token footprint stops scaling with depth.",
                  "That shared cache is stored in FP4 rather than FP8 or BF16, taking another 2-4x off bytes per entry. 890 bytes/token is the product of both.",
                  "SWA Bounded Replay handles the SSD-resident persistent cache: sliding-window attention means each token attends to a fixed recent window, so the engine keeps just enough state to recompute that window instead of persisting full history. That is the 1/8.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "890 bytes/token is the number to size capacity against: about 890MB of HBM for one fully extended 1M-context sequence.",
                  "The same HBM budget that held N concurrent V4-Flash sequences holds roughly 4N. Agent serving is usually KV-capacity-bound, so that is close to a 4x concurrency win before any kernel work.",
                  "The 8x cut to persistent cache is what makes keeping prefix caches across agent turns affordable, which is what makes DeepSeek's 50x cache-hit discount real rather than theoretical.",
                  "Generalizable: cross-layer KV sharing and low-precision KV storage are orthogonal and compose multiplicatively. Evaluate them as two levers, not one.",
                ],
              },
            ],
            source: { label: "arXiv 2609.19969", url: "https://arxiv.org/abs/2609.19969" },
          },
          {
            title: "SGLang v0.5.20: branching-point prefix caching and RL sampling masks",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Sept 18, 713 PRs from 237 contributors. Branching-point radix caching, RL sampling masks, a CPU-only scheduler simulator, a large ROCm loading fix, DeepSeek-V4 kernels on Blackwell and RTX PRO 6000, Intel XPU images.",
                  "New models: GLM-5.3-Flash, Hy4-Preview, Qwen3.8-Flash-Next, K2 Horizon.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "The radix tree is a trie over token sequences letting requests sharing a prefix reuse KV blocks. Sliding-window attention keeps only a bounded recent window, so when requests fork from a shared prompt that window state was recomputed per branch. Caching it at the fork lets branches reuse it.",
                  "Sampling masks solve a different problem: replaying a rollout means reconstructing exactly which tokens the sampler could draw from, bitwise. return_sampling_mask returns the token support and the sampled token's log-probability directly, so the trainer replays instead of reconstructing.",
                  "The simulator runs the real scheduler and caches on CPU with a latency predictor standing in for the forward pass, within about 6% on TTFT and 0.05pp on prefix reuse.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Branching-point caching: 43.8% to 60.8% token hit rate and 1.57s to 1.07s TTFT on DeepSeek-V4-Flash, a 32% latency cut for any fan-out-from-one-prompt workload, which is most agent and RAG serving.",
                  "Sampling masks under overlap scheduling give 17% higher decode throughput at batch 1 and 52% at batch 64 on Qwen3-8B. With vLLM's sharded weight sync in v0.29.0, RL rollout cost has dropped materially in two weeks.",
                  "ROCm loading: GLM-5.2 at TP4 on 4x MI355X goes 505.7s to 40.4s, 12.5x, which changes whether MI355X is viable for rapid iteration. On RTX PRO 6000, DeepSeek-V4-Flash decode TPOT goes 36.1ms to 10.5ms at batch 1.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "v0.5.19 was the last release with -cu12x wheels and images. If you are still on CUDA 12 you are pinned there.",
                  "Prefill context parallelism v1 is removed; the strategy-based path is now the only one, and prefill CP is rejected on HIP, NPU, and MUSA until ported.",
                  "Quieter but easy to miss: /v1/responses drops in-memory retention unless started with --enable-response-store, so retrieval and previous_response_id chaining return 400 without it, and PD deployments cannot enable it at all.",
                ],
              },
            ],
            source: { label: "SGLang v0.5.20", url: "https://github.com/sgl-project/sglang/releases/tag/v0.5.20" },
          },
          {
            title: "VC-Attention: the softmax, not the matmul, is the low-bit bottleneck",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "arXiv 2609.15810 (Sept 14, Nunchux AI with CMU and MIT authors), a training-free low-bit attention framework for Diffusion Transformers.",
                  "Implemented for B200, B300, H200, RTX PRO 6000, and RTX 5090, and evaluated on Wan2.2, LongCat-Video, HunyuanVideo-1.5, and MiniMax-H3.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "Two separate problems. Accuracy is limited by value outliers: a block's quantization scale is set by its largest entries, so typical entries get squeezed into a narrow range. Prior work smooths queries and keys, but value outliers follow no fixed channel or spatiotemporal structure.",
                  "V-Smooth reorders value tokens by lightweight online clustering so tokens in a hardware block quantize well together, quantizes only the residual after subtracting the block mean, and restores that mean from the row sum online softmax already maintains.",
                  "Speed is limited by softmax: low-bit Tensor Cores accelerate only the two matmuls, so the high-precision exponential between them becomes the longest pipeline stage. ExpCast-FP8 maps log-domain scores straight to E4M3 codes with one fused multiply-add, removing the FP32 exponential and the format conversion.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "1.46-1.59x faster attention kernel than BF16 FlashAttention-4 on datacenter Blackwell and Hopper, and 2.3-3.6x on workstation cards, with end-to-end clip generation 1.13-1.19x and 1.36-1.70x faster respectively.",
                  "Training-free and composes with existing sparse attention, so it is additive to what you already run rather than a replacement.",
                  "The transferable insight is the diagnosis: once your matmuls are low-bit, the exponential becomes the critical path. If you are hand-tuning attention kernels, profile the softmax stage before optimizing the GEMMs further.",
                ],
              },
            ],
            source: { label: "arXiv 2609.15810", url: "https://arxiv.org/abs/2609.15810" },
          },
          {
            title: "Chord: an open W4A16 MoE kernel that picks its schedule from the shape",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Novita AI open-sourced Chord on Sept 15 (Apache-2.0), a W4A16 MoE CUDA operator for Kimi K2.x shapes, integrated through vLLM's existing Humming backend.",
                  "Per layer vs public Humming: 1.11-1.20x H200 EP8 prefill, 1.17-1.33x H200 TP8, 1.16-1.24x H200 EP8 decode, 1.81-2.15x B300 EP8 decode against an untuned default.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "W4A16 means 4-bit weights with 16-bit activations; group-32 scales means one shared scale per 32 weights, which keeps 4-bit usable without dynamic-range collapse.",
                  "The core insight: no single MoE schedule fits every request, and the deciding quantity is routed tokens per expert, not total token count, because padding and register pressure follow per-expert rows.",
                  "Below ~80 routed tokens/expert it keeps a baseline block search; above it sizes block_m around each expert's padded rows against a register ceiling.",
                  "Decode is a separate kernel: at a few rows per expert the WGMMA path is barrier-bound, so it swaps MMA operands and uses a semi-static tile schedule, 186us vs 216us at 9-15 tokens/expert.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "End to end on Kimi-K2.6 with 8xH200: mean TTFT down 8.6%, decode output throughput up 4.1% to 8.0% depending on batch size, with no accuracy regression on OCRBench or GSM8K.",
                  "Install and serve with --quantization humming, since Chord owns that import root. Do not co-install inclusionAI/humming, and select the backend explicitly because vLLM's automatic WNA16 priority may pick another.",
                  "Keep VLLM_HUMMING_USE_F16_ACCUM and VLLM_BATCH_INVARIANT off. That makes this incompatible with the batch-invariant determinism mode vLLM shipped in v0.29.0, which matters if you need reproducible evals.",
                  "Honest read: layer-level gains are real but end-to-end is single digits, and the 2.15x on B300 is against an untuned default because public Humming ships no SM100/SM103 tuning table.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-09-15-novita-chord-w4a16-moe" },
          },
          {
            title: "llama.cpp v0.4.1: loading flags collapse into one, plus a ternary MoE",
            parts: [
              {
                label: "What shipped",
                bullets: [
                  "Cut Sept 14. Adds Maple 20B-A1B (a ternary MoE on CPU), Tencent Hy 4 preview, and Spark2.5; adds Kimi-K3 recurrent-state rollback; refactors JSON schema handling; bumps ggml to v0.24.0.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "The removed flags were never orthogonal: memory-mapping, page-locking, and direct I/O are three points on one decision about how weights reach memory. --load-mode makes you pick the strategy outright.",
                  "Fixes MTP context KV cache allocation for DeepSeek2 and GLM-MoE. MTP is multi-token prediction, a speculative scheme needing its own KV region that was being sized wrong.",
                  "Fixes GDN normalization from max to rsqrt for affected Qwen, Kimi, and GLM models. Numerical correctness, not performance.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "The GDN fix matters more than its one-line entry suggests: if local Qwen, Kimi, or GLM output felt worse than the hosted version, this is a plausible cause. Re-run evals rather than blaming quantization.",
                  "--log-jsonl makes server logs machine-parseable without a regex layer, the quiet win for running llama.cpp as a service.",
                  "Speculative decoding after multimodal input was broken and is fixed, worth knowing if you ran a vision model with a draft model and silently got no speculation.",
                ],
              },
              {
                label: "Breaking changes",
                bullets: [
                  "--mmap, --mlock, and --direct-io are removed, folded into a single --load-mode. Anyone with these in a script, systemd unit, or Dockerfile breaks on upgrade, and they hide in operational config rather than application code. Grep before bumping.",
                  "Lazy tensor loading is now disabled by default on integrated GPUs, changing startup behavior on Strix Halo and similar parts.",
                ],
              },
            ],
            source: { label: "llama.cpp v0.4.1", url: "https://github.com/ggml-org/llama.cpp/releases/tag/v0.4.1" },
          },
        ],
      },
      {
        header: "// FOUNDATION MODEL RELEASES",
        intro: "Two releases pulling in opposite directions: one compressing a 27B into a laptop, one putting 600B behind an API.",
        items: [
          {
            title: "Ternary Bonsai 2 27B: low-bit compression that survives agent loops",
            parts: [
              {
                label: "New release",
                bullets: [
                  "PrismML released a ternary compression of Qwen3.8 27B on Sept 17 under Apache 2.0: 1.76 effective bits/weight, 5.9GB, 262K context, multimodal text and image.",
                  "Runs on NVIDIA GPUs via CUDA and Apple devices via MLX through custom low-bit kernels.",
                ],
              },
              {
                label: "Innovations",
                bullets: [
                  "Ternary constrains each weight to -1, 0, or +1, about 1.58 bits. The 1.76 figure accounts for FP16 group-wise scales, a shared multiplier per block that restores dynamic range.",
                  "Applied end to end across the language model rather than to selected layers, which is the part that usually breaks.",
                  "Retention gap against full precision closed from 95% in the first Bonsai generation to over 98% here.",
                ],
              },
              {
                label: "Benchmark evaluation",
                bullets: [
                  "98.2% of full-precision aggregate (83.9 vs 85.4) across reasoning, math, coding, instruction following, vision, and agentic tool use.",
                  "By capability: agentic and tool calling 77.57 vs 79.74, coding 81.58 vs 82.17, math 96.57 vs 97.06, instruction following 82.66 vs 81.25 (above baseline). Knowledge and reasoning takes the largest hit at 83.95 vs 86.66.",
                  "The agentic number is the one that matters. The standard objection to aggressive quantization is error compounding: 2% per-step degradation is invisible single-turn and fatal over 40 steps. A 2.2-point gap is the first low-bit result specific enough to argue against that.",
                ],
              },
              {
                label: "Deployment profile",
                bullets: [
                  "143 tok/s on RTX 5090, 46.8 on M5 Max. 5.9GB fits a 27B multimodal model on a 16GB laptop or one 24GB GPU with room for KV cache at real context.",
                  "0.714 mWh/token on a 4090, which PrismML puts at 40% better than a full-precision 8B. That is the number for always-on local inference.",
                  "Two caveats: it is a Qwen derivative, so licensing review covers both, and it needs PrismML's kernels rather than a drop-in GGUF. Budget the integration.",
                ],
              },
            ],
            source: { label: "PrismML", url: "https://prismml.com/news/bonsai-2-27b" },
          },
          {
            title: "Unconfirmed: StepFun ships a 600B agent model at $1 per Mtok input",
            parts: [
              {
                label: "New release",
                bullets: [
                  "Step 5 Preview: 600B total / 27B active sparse MoE for long-horizon agentic work, 1M context, native image input. Open weights scheduled for Oct 15.",
                  "Marked Unconfirmed: StepFun's own announcement and rate card could not be opened directly, and secondary reports disagree on whether launch was Sept 18 or Sept 20. Treat every number here as provisional.",
                ],
              },
              {
                label: "Innovations",
                bullets: [
                  "Standard agent-serving shape: low active fraction (27B of 600B, about 4.5%) keeps per-token compute near a mid-size dense model while total capacity stays frontier-scale.",
                  "Described as narrow-and-deep at 92 layers, which tends to help multi-step reasoning at the cost of harder pipeline-parallel serving.",
                  "1M context means long agent trajectories need no external memory machinery.",
                ],
              },
              {
                label: "Pricing and access",
                bullets: [
                  "Reported at $1.00/Mtok uncached input, $0.05 cached, $2.70 output including reasoning tokens. The 95% cache discount is the same lever DeepSeek pulls and implies the same discipline: build prompts append-only so the prefix stays stable.",
                  "Lands between DeepSeek-V4.1-Flash ($0.30/$1.20 peak) and the Western frontier tier, so the question is whether the agentic delta over Flash justifies roughly 3x input and 2.2x output.",
                  "The Oct 15 open-weights date matters more for self-hosting: a 600B/27B-active model with 1M context is serveable on one well-provisioned node at 4-bit.",
                ],
              },
            ],
            source: { label: "StepFun (official post, not directly retrievable)", url: "https://x.com/StepFun_ai/status/2101510462685003786" },
          },
        ],
      },
      {
        header: "// AGENTIC SYSTEMS",
        intro: "One paper this week, but it is the component-level harness ablation the field has been missing.",
        items: [
          {
            title: "Harness design for coding agents, component by component",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.20804 (Sept 17, Zoom Communications et al.) fixes the execution loop and varies three components independently: planning, action space, context management.",
                  "176 matched settings, four models, SWE-Bench Verified and Terminal-Bench 2.1, five context strategies across four context-window budgets.",
                ],
              },
              {
                label: "Method",
                bullets: [
                  "Most published comparisons swap whole harnesses at once, so you cannot tell whether a win came from better planning or better context trimming. Holding the loop constant isolates each component.",
                  "Trajectory-level analysis explains the deltas: context management extends trajectories without changing behavior, planning changes where trajectories stop, and the action space changes the granularity at which code is written.",
                ],
              },
              {
                label: "Impact vs prior work",
                bullets: [
                  "Context management earns its keep by preventing context-overflow failures, not by improving reasoning, so its value grows as the budget tightens and shrinks as windows grow.",
                  "Staging rule-based elision before LLM summarization is the most efficient strategy. Making elided content recoverable adds machinery models rarely invoke and buys no accuracy, which contradicts a lot of current harness engineering.",
                  "Planning shifts from accuracy scaffold on weak models to cost saver on strong ones. Review it on whether it removes verification turns, not on whether it lifts pass rate.",
                  "Your tool layer should be a function of the model: structured tools for a bash-fluent model are pure overhead, while bash-only cuts cost on command-line-centric tasks.",
                ],
              },
            ],
            source: { label: "arXiv 2609.20804", url: "https://arxiv.org/abs/2609.20804" },
          },
        ],
      },
      {
        header: "// OTHERS AND IMPORTANT DISCUSSIONS",
        intro: "Where the interesting argument was this week, and one training-infrastructure writeup worth copying.",
        items: [
          {
            title: "Edge0 serves a 35B MoE from SSD, and the comment thread is the real content",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "arXiv 2609.18063 (Sept 16, Edge0) streams a 35B MoE from SSD on a single 24GB machine at 20 tok/s inside 3GiB of peak active memory, within a few points of its fp16 teacher across five public benchmarks. Framework, checkpoints and adapters are open source.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "MoE inference on consumer hardware is bounded by weight bytes, not compute: a 35B-class model is 19.5GB at 4-bit, and sparsity shrinks compute per token, not the bytes you must hold.",
                  "Naive SSD offload fails because layer N+1's experts cannot be chosen until layer N's output exists, so reads start too late to hide behind compute.",
                  "A prerouter head predicts the next layer's routing one token ahead, and critically the prediction is consumed as the routing, so the staged expert set equals the routed set by construction.",
                  "An unmerged recovery LoRA trained on the student path pays back quality lost to int4 quantization and routing replacement.",
                ],
              },
              {
                label: "The discussion worth reading",
                bullets: [
                  "A commenter pushed hard on the obvious failure mode: does a wrong prediction stall decode to fetch the right experts, or push on with the wrong ones and eat a silent quality hit? They asked for the tail of the accuracy distribution, not the average.",
                  "The author's answer is that the prediction IS the routing, so by definition there is no mismatch and no stall. That is a real design choice, not a dodge, but it relocates the cost rather than removing it: quality now depends on the prerouter being a good router, which the recovery LoRA is there to patch.",
                  "Worth internalizing if you evaluate offloading engines: ask whether a system predicts-then-verifies or predicts-and-commits. The two have completely different tail behavior, and benchmark averages hide the difference.",
                ],
              },
            ],
            source: { label: "arXiv 2609.18063", url: "https://arxiv.org/abs/2609.18063" },
          },
          {
            title: "Training a 2.8T model's speculative drafter without owning the cluster",
            parts: [
              {
                label: "What's new",
                bullets: [
                  "vLLM published how it trained a DSpark draft model for Kimi K3 (2.8T params) on a GB300 NVL72 rack using the Speculators library (Sept 15).",
                  "Five layers, 5B params, eight proposed tokens per step. Single-stream interactivity goes from ~110 to ~435 tok/s/user on math reasoning, up to 3.5x output throughput at matched interactivity under load.",
                ],
              },
              {
                label: "How it works",
                bullets: [
                  "EAGLE-3 drafts autoregressively, so eight tokens cost eight sequential steps. DFlash predicts a whole block in one non-causal pass, but parallel positions cannot condition on each other and verification stops at the first rejection, which the paper calls suffix decay.",
                  "DSpark keeps the single parallel pass and adds two cheap heads: a Markov logit-bias head that adjusts each position's logits using the previously chosen token, and a confidence head that predicts acceptance so the scheduler trims suffixes when busy.",
                  "The reusable part is infrastructure. Drafters train on target-model hidden states, but vLLM's extraction path writes to disk from one node, which fails when the target needs several nodes just to fit. MooncakeHiddenStatesConnector streams hidden states over RDMA or TCP so training and inference scale independently.",
                ],
              },
              {
                label: "Impact (implementation)",
                bullets: [
                  "Acceptance: 4.11 tokens/round macro-average across nine domains, 6.42 on math, 4.96 HumanEval, 4.65 translation. Long context holds up at 5.31 accepted tokens/iteration on a 378K-token prompt.",
                  "Under load, 177 to 683 tok/s going 1 to 16 concurrent, with median TTFT up only 100ms (379 to 479). Quote that when someone claims speculative decoding collapses under concurrency.",
                  "Topology worth copying: three-node sets, two serving the target and one training, gave best throughput. Caveat: donated GB300 rack on CUDA 13.4 preview, so absolute numbers are a best case.",
                ],
              },
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-09-15-kimi-k3-dspark" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether SGLang's branching-point radix caching holds outside the DeepSeek-V4-Flash shared-prompt case it was measured on. One model, one fan-out pattern, and the mechanism is SWA-specific, so models without sliding-window attention should see nothing.", source: { label: "SGLang PR #34565", url: "https://github.com/sgl-project/sglang/pull/34565" } },
      { text: "Whether FlashInfer finally cuts a stable v0.7.0. rc3 published Sept 16 as a pre-release with 110 commits on main since, and at least one fix reported missing from the release branch. vLLM still pins 0.6.18. Second week on this list.", source: { label: "FlashInfer releases", url: "https://github.com/flashinfer-ai/flashinfer/releases" } },
      { text: "Whether SP3O's sparse value supervision reproduces outside Qwen3-Base and FrozenLake. Three supervised states per response is a strong claim, the code is public, and Value Flattening should be measurable in any PPO run you already have.", source: { label: "SP3O repo", url: "https://github.com/Dodojordi/SP3O" } },
    ],
  },
  {
    date: "2026-09-13",
    range: "September 7 to September 13, 2026",
    tldr: [
      "Watchlist resolution. vLLM's Kimi K3 Decode Context Parallelism work half-landed: v0.29.0 (Sept 9) ships K3 DCP with DSpark drafting and DCP partial prefix-cache hits, but as features, not the promised benchmark. Qwen3.8-27B still has no first-party Qwen Cloud API with native 1M context and built-in tools (fourth week open). No independent reproduction of the GLM-5.3-Flash claim surfaced (still open).",
      "DeepSeek-V4.1-Flash (Sept 10): 552B MoE on a new Causal Encoder-Decoder architecture, 8B active params on prefill and 16B on decode, 1M context, 384K max output, open weights. KV cache needs 1/4 the HBM and 1/8 the SSD of the prior generation. $0.30/$1.20 per Mtok peak, $0.15/$0.60 off-peak, cache-hit input $0.006 peak, a 50x cache-hit ratio.",
      "Gotcha in the same release: DeepSeek announced V4-Pro would be retired and routed to Flash at 04:00 UTC Sept 14, then reversed it on the pricing page without a dated note. If you built a migration around the Sept 10 release note, re-read the pricing reference before Monday.",
      "vLLM v0.29.0 (Sept 9) makes Model Runner V2 the default for all models and deprecates MRV1 for removal in v0.32. Ten architectures removed, PyAV video backend removed, the api_server module entrypoint deprecated. FlashInfer all-reduce is on by default and prefix-cache NONE_HASH is deterministic, so distributed KV cache users can stop pinning PYTHONHASHSEED.",
      "OpenAI published a Lean-formalized finite-time singularity proof for 3D Navier-Stokes (Sept 8) produced by roughly 10,000 concurrent agents on an unreleased internal model. The practitioner content is the token economics: 88 hours wall clock, 2.7M inter-agent messages, ~130B output tokens for Navier-Stokes alone, plus 17 hours of GPT-6 Astra for Lean verification.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "What a 10,000-agent swarm actually costs",
            whatsNew: [
              "On September 8, 2026, OpenAI published an analytical proof plus a Lean formalization showing the 3D incompressible Navier-Stokes equations can develop a finite-time singularity from smooth initial data under smooth forcing with finite energy, resolving statements C and D of the Clay Millennium Prize formulation. It was produced by a multi-agent system running on an internal model OpenAI describes as significantly more capable than GPT-6 Astra, in training since August 28. A September 10 update added findings from an investigation into whether user inputs could have influenced the result.",
            ],
            howItWorks: [
              "The orchestration is the part that generalizes, not the mathematics. Agents were split into communicating groups; the group that produced the result ran on the order of 10,000 concurrent agents, each with tool access to a cached copy of the internet and a code interpreter. Different groups were prompted with contradictory variants of the problem statement (proof variants A and B, disproof variants C and D), so the swarm hedged across outcomes instead of committing to one.",
              "When groups plateaued, Codex was used to consolidate the most useful intermediate results across groups and the consolidation was fed back as follow-up prompts, cross-pollinating otherwise isolated search trees. An easier warmup problem, unforced Euler regularity, was resolved first by about 100 agents over roughly 50 hours and then injected into the Navier-Stokes prompts as a seed. Lean is a proof assistant, so a formalization is machine-checkable and does not depend on human referees catching errors.",
            ],
            impact: [
              "The published token economics are the most reusable artifact. Across all attempted problems the agents sent 4.9 million messages and consumed roughly 300 billion output tokens; Navier-Stokes alone took 2.7 million messages and about 130 billion output tokens over 88 hours, with 17 more hours of GPT-6 Astra for Lean verification. At any public frontier output price that is a seven-figure inference bill for one result, which sets a realistic floor on what throwing a swarm at a problem costs.",
              "Three design choices transfer to ordinary agent systems: prompt disjoint groups with contradictory hypotheses rather than one shared objective; score with a cheap verifier the agents never see (Lean here) instead of trusting swarm confidence; and periodically consolidate cross-group intermediate results with a separate model rather than letting groups run isolated to completion.",
              "Treat the result itself as unrefereed: Alpoge (Anthropic) and Buckmaster (NYU) independently produced a Lean-verified forced-Euler blowup with an internal Anthropic model, and a Caltech/NVIDIA group posted an unforced self-similar Euler stability framework on Sept 9 (arXiv 2609.10860).",
            ],
            source: { label: "OpenAI", url: "https://openai.com/index/navier-stokes-solution/" },
          },
          {
            title: "ConvMem: long-context reasoning as a logarithmic tree",
            whatsNew: [
              "ConvMem (arXiv 2609.10441, submitted September 9, 2026) is a training-free framework for reasoning over contexts longer than the model's window. It replaces the sequential read-and-update memory loop used by MemAgent-style approaches with a hierarchical convolution, and reports better results than training-free baselines on RULER-HotpotQA and RULER-2WikiMultiHopQA without the out-of-distribution overfitting the authors observe in RL-trained memory agents.",
            ],
            howItWorks: "The framework treats an LLM prompted with a specific query as a convolutional kernel: the kernel slides over text segments emitting a summary each, then the summaries are convolved again, and so on up a tree. Because each level strides down the number of units, the path from raw text to answer is logarithmic in document length rather than linear, so a 100-segment document is roughly 7 hops deep instead of 100 steps long and error compounds 7 times instead of 100. Two borrowings from CNN design carry the weight: Configurable Strides control segment overlap so evidence straddling a boundary is not lost, and Skip Connections carry lower-level detail past intermediate summaries so a fact does not have to survive every compression step to reach the root. Multi-Kernel Convolution runs several query-specific kernels in parallel over the same text, each extracting a different semantic channel, so a multi-hop question is decomposed instead of being handled by one overloaded summarizer.",
            impact: [
              "The practical win is latency and cost structure as much as accuracy. Sequential memory agents are serial by construction: segment N+1 cannot start until segment N's memory update lands, so wall-clock time scales linearly with document length and you cannot batch. ConvMem parallelizes across both segments at a level and kernels within a level, so the work maps onto vLLM or SGLang as one wide batch per tree level with only log(N) synchronization barriers.",
              "Being training-free, it costs nothing to try against an existing endpoint, which is the relevant comparison against MemAgent-style approaches that need an RL run before you know whether they help on your data. The trade is total token spend: strided overlap plus multiple kernels reads more tokens than one linear pass, so this buys latency and robustness with tokens. Worth benchmarking if you run multi-hop retrieval over documents that exceed your context window and your current answer is to chunk it and hope.",
            ],
            source: { label: "arXiv 2609.10441", url: "https://arxiv.org/abs/2609.10441" },
          },
          {
            title: "Eight RLVR data-selection methods, none beats uniform sampling",
            whatsNew: [
              "Submitted September 5, 2026, two days outside this week's window, and included because it lands squarely on RL post-training data selection and was not covered in last week's digest. DataFlex-RL (arXiv 2609.06107) is a controlled platform comparing RLVR data policies under one fixed GRPO recipe.",
              "Across 13 configurations and 12 matched seeds on Qwen2.5-7B-Base over 12 math, logic, and science benchmarks, none of eight rollout-selection or reweighting methods achieved a paired 95% confidence interval excluding zero relative to plain uniform sampling, and none of three adaptive domain mixtures beat a fixed equal mixture at the same precision. A 12-seed extension on Llama-3.1-8B-Base found no consistent winner either.",
            ],
            howItWorks: [
              "RLVR is reinforcement learning from verifiable rewards, where a program checks the answer instead of a learned reward model scoring it. A data policy in this setting decides which sampled rollouts enter the gradient, how much weight each gets, and how much of each domain appears in the next batch. GRPO (Group Relative Policy Optimization) computes advantages by comparing responses within a sampled group rather than against a learned value critic, which is why it needs no critic network.",
              "The contribution is methodological control: identical GRPO hyperparameters, base checkpoint, and benchmark suite, 12 matched seeds per configuration, and paired confidence intervals instead of single-seed point comparisons. Uniform GRPO itself works fine, lifting domain-balanced average accuracy 7.76 percentage points over the untrained checkpoint. The finding is that the clever selection layer on top adds nothing measurable.",
            ],
            impact: [
              "Two things change if you build post-training pipelines. First, deprioritize rollout-filtering and reweighting engineering: if you planned difficulty-based filtering, advantage-magnitude reweighting, or an adaptive domain scheduler on top of GRPO, spend that time on reward quality, verifier coverage, or rollout count instead, and hold uniform sampling as a baseline you must actually beat with paired multi-seed intervals. Second, and more broadly useful, the paper quantifies benchmark-suite sensitivity by rescoring nine Qwen2.5-7B-Instruct runs under a math-heavy six-benchmark summary (five math benchmarks plus GPQA-Diamond, no logic benchmark) against the domain-balanced 12-benchmark summary.",
              "The two rankings are negatively correlated at -0.33. Dropping one domain from your eval suite can invert which checkpoint you ship. Fix the eval suite before comparing training recipes, and report seeds.",
            ],
            source: { label: "arXiv 2609.06107", url: "https://arxiv.org/abs/2609.06107" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "DeepSeek-V4.1-Flash: asymmetric architecture aimed at input-heavy agent traffic",
            whatsNew: [
              "DeepSeek released V4.1-Flash on September 10, 2026, with new API pricing effective 04:00 UTC the same day. It is a 552B-parameter multimodal MoE on a new Causal Encoder-Decoder architecture that activates only 8B parameters per token during prefill and 16B during decode. 1M context, 384K max output, native vision, thinking and non-thinking modes, tool calls, and both OpenAI-format and Anthropic-format endpoints. Weights and a technical report are on Hugging Face. DeepSeek states that new pre-training methods plus larger-scale RL post-training put it ahead of V4-Pro, its own prior flagship.",
            ],
            howItWorks: [
              "The asymmetry is the point. A standard decoder-only MoE activates the same parameter budget per token whether it is reading a 500K-token codebase or writing a 200-token answer. The Causal Encoder-Decoder split routes input tokens through a cheaper 8B-active encoder pass and charges the 16B-active decode cost only on generated tokens. Agent workloads are lopsided in exactly that direction, often 50:1 input-to-output or worse, so the cheaper side is the side that dominates the bill.",
              "The second lever is cache size: compared with the previous generation the KV cache needs 1/4 the HBM and 1/8 the SSD storage. Less HBM per sequence means more concurrent sequences per GPU at the same memory budget, and less SSD means cached prefixes are cheaper to persist across turns, which is where agent costs actually accumulate.",
            ],
            impact: [
              "At $0.30 per Mtok input on a cache miss and $1.20 output at peak, off-peak at exactly half ($0.15/$0.60), and cache-hit input at $0.006 peak or $0.003 off-peak, the cache-hit to cache-miss ratio is 50x. That makes prefix-cache discipline the single largest cost lever on this model: stable system prompts, stable tool schemas, append-only conversation construction so the prefix never shifts. Peak hours are 01:00-04:00 and 06:00-10:00 UTC Monday through Friday, so batch evals and offline pipelines belong outside those windows at half price.",
              "The concurrency limit is 2500 for deepseek-flash against 500 for deepseek-v4-pro, a 5x headroom difference that matters more than the price gap for parallel agent fleets. V4-Flash and V4-Flash-Vision-Exp are retired, with their legacy model names temporarily routing to V4.1-Flash at Flash rates. Open weights make self-hosting an option, though the tech report and a 2000-GPU deployment note suggest serving it well is not a weekend project.",
            ],
            source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/news/news260910/" },
          },
          {
            title: "Update: DeepSeek reversed the V4-Pro retirement days after announcing it",
            whatsNew: [
              "The September 10 release note stated that starting 04:00 UTC on September 14, 2026, all deepseek-v4-pro requests would route to V4.1-Flash at Flash rates until V4.1-Pro launches, and that V4-Pro was being phased out. The pricing page now carries a footnote reversing this: DeepSeek will continue providing API services for V4-Pro after September 14 with billing unchanged. The two primary pages currently disagree.",
            ],
            howItWorks: [
              "Nothing technical, but the failure mode is worth naming. A forced model migration announced with a four-day notice period is exactly the kind of thing teams script around immediately: pinning the model string, rewriting evals against the replacement, adjusting cost forecasts. When the vendor reverses it, the reversal is published on a different page than the announcement and gets no dated news entry of its own, so anyone who read the release note and moved on never sees it.",
            ],
            impact: [
              "If you planned a V4-Pro migration for Monday September 14, it is no longer forced. V4-Pro stays at its current rates, $0.66/$1.98 per Mtok off-peak and $1.32/$3.96 peak, which is 4.4x the Flash price on input and 3.3x on output, with a 500-request concurrency limit against Flash's 2500. The operational lesson generalizes to every vendor you depend on: the pricing or models reference page is the authoritative surface, not the announcement blog.",
              "Diff the reference page on a schedule rather than subscribing to release notes, because retractions and quiet amendments land there and nowhere else.",
            ],
            source: { label: "DeepSeek API Docs, Models & Pricing", url: "https://api-docs.deepseek.com/quick_start/pricing" },
          },
          {
            title: "Sakana Fugu Max and Ultra v2: routing as the product, priced against single models",
            whatsNew: [
              "Sakana AI released Fugu Max and Fugu Ultra v2 on September 11, 2026. Both are the same orchestration architecture tuned to opposite ends of the cost-capability curve. Fugu Max is priced at $2 per Mtok input and $6 output, which Sakana says is 40-60% below Sonnet 5, GPT-5.6 Terra, and Kimi K3 on output. Both ship on an OpenAI-compatible API, and upgrading an existing Fugu deployment is a one-line parameter change.",
            ],
            howItWorks: [
              "Fugu is not a model, it is a router with a pool of models behind it, dispatching each task or sub-task to the cheapest pool member capable of solving it. That is why its price-performance point sits off the curve any single provider can reach. Fugu Max widens the pool with open-weights and specialized models including NVIDIA's Nemotron family through a Sakana-NVIDIA collaboration. Fugu Ultra v2 tunes the same router for peak quality on long-horizon work.",
              "The claim worth checking is that Ultra v2's pool excludes Fable 5, Fable 5.1, and GPT-6 Astra entirely, with a 2026-08-28 training cutoff, so its frontier-level scores are not a frontier model wearing a router.",
            ],
            impact: [
              "If you are hand-rolling a model router (cheap model first, escalate on low confidence), this is the commercial version of that pattern with a maintained pool, and at $2/$6 it is priced where a homegrown router's engineering cost stops being worth it.",
              "Reported numbers: Fugu Ultra v2 scores 48.3 on Chartography against Opus 5 at 27.3 and Fable 5 at 29.5, and 74.3 on DeepSWE; Fugu Max takes best overall on six benchmarks including Terminal Bench 2.1, GPQAD, AA-LCR and AutomationBench, and expands the cost-performance Pareto frontier on seven of ten. The procurement argument is the more durable one: a swappable pool means a single vendor deprecating a model, revoking access, or changing pricing does not break you, which is a live concern given DeepSeek's V4-Pro whiplash this same week.",
              "Two caveats before routing production traffic. The benchmark set is partly Sakana's own (SWEFish is internal), so reproduce on your evals. And a router adds a routing decision to every request while the post publishes no latency or TTFT numbers, so measure p50 and p95 against your current single-model baseline first.",
            ],
            source: { label: "Sakana AI", url: "https://sakana.ai/fugu-max-release/" },
          },
          {
            title: "A bottleneck-chasing method, with 3.14x to show for it",
            whatsNew: [
              "On September 10, 2026, the vLLM blog published a joint write-up from vLLM, AMD, and Embedded LLM engineers on what happened after day-0 MiniMax M3 support landed on AMD Instinct MI355X. On the SemiAnalysis InferenceX benchmark at concurrency 32, fixed-topology MXFP8 standard serving went from 109.1 to 342.4 output tokens/s/GPU, a 3.14x gain over the day-0 result. Median TTFT dropped from 1.46s to 0.67s and mean TPOT from 69.1ms to 22.1ms.",
            ],
            howItWorks: [
              "The contribution is the diagnostic loop, not any single kernel. The team frames optimization as five repeated questions: local shape analysis (is this kernel's tile shape wrong for the tensor it actually receives), repeated-work batching (is the same computation being redone per layer or per request), data movement audits (is time going to HBM traffic rather than math), fast-path verification (is the optimized code path actually taken, or is a silent fallback firing), and queue analysis (is the GPU idle waiting on the scheduler).",
              "Each answer removes one bottleneck and moves it elsewhere, so the loop repeats. TTFT is time to first token, dominated by prefill; TPOT is time per output token, dominated by decode. MXFP8 is a microscaling 8-bit float format where a shared scale factor covers a small block of values, giving better dynamic range than plain FP8 at the same bit width.",
            ],
            impact: [
              "The headline number is an argument against trusting day-0 benchmarks. A 3.14x throughput gap between the model runs and the model is tuned means any procurement or architecture decision made on launch-week numbers for a new model-hardware pair is measuring integration maturity, not hardware. If you are evaluating MI355X against Hopper or Blackwell, re-benchmark after the optimization wave rather than at launch.",
              "The fast-path verification step is the one most teams skip and the one that most often explains a mysterious 2x: serving stacks fall back silently when a shape, dtype, or head count is unsupported, and nothing in the logs says so. Instrument which kernel actually ran before profiling anything else.",
            ],
            source: { label: "vLLM blog", url: "https://vllm.ai/blog/2026-09-10-minimax-m3-mi355x" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "vLLM v0.29.0: Model Runner V2 is the default, MRV1 is deprecated",
            whatsNew: [
              "vLLM v0.29.0 shipped September 9, 2026 with 594 commits from 277 contributors. Model Runner V2 is now the default for all models, completing a rollout that began with pooling models, and MRV1 is formally deprecated with removal targeted for v0.32. Ten deprecated architectures were removed (Arctic, Chameleon, Cheers, Fairseq2Llama, FireRedLID, GritLM, HCXVision, MPT, the RWForCausalLM and StableLMEpochForCausalLM aliases, and PrithviGeoSpatialMAE). FlexOlmo, Olmo3 and Hunyuan V1/VL now route through the Transformers modeling backend. The PyAV video decoder backend is gone; use OpenCV or Torchcodec.",
              "The python -m vllm.entrypoints.openai.api_server entrypoint is deprecated in favor of vllm serve.",
            ],
            howItWorks: [
              "The model runner takes a scheduled batch, lays out KV cache and attention metadata, runs the forward pass, and samples. MRV2 is the rewrite. Alongside becoming default it gained CUDA graph memory profiling for KV cache auto-sizing, batch-sharded sampling that cuts per-step logits memory by 1/TP (an 8-way tensor-parallel deployment holds one eighth the logits per step, which matters at large vocab and large batch), prompt embeds, extract_hidden_states speculation, padded FULL cudagraph dispatch for uniform decode under speculative decoding, and DP-sync skipping before EAGLE/MTP draft prefill.",
              "EAGLE and MTP are speculative decoding schemes where a small draft head proposes several tokens the full model then verifies in one pass. Separately, Mamba prefix caching gained internal prefill checkpoints worth a 9% to 25% TTFT improvement on hybrid state-space models.",
            ],
            impact: [
              "Test this one carefully rather than rolling forward blind. MRV2 does not yet support sequence parallelism, dual-batch overlap, elastic expert parallelism, custom logits processors, or certain speculative decoding methods; vLLM falls back to MRV1 automatically when those are configured and expects to close the gaps in two to three weeks. That silent fallback is the thing to check, because if you configure one of those features you are quietly still on a runner slated for removal in three releases, and MRV1-specific optimizations are no longer being accepted.",
              "Before upgrading: confirm your architecture is not among the removed ten, swap PyAV for Torchcodec if you decode video, change any python -m vllm.entrypoints.openai.api_server invocation to vllm serve, and log which runner actually initialized. If you serve Mamba or hybrid models the prefix-caching checkpoints are a free 9-25% TTFT win, but note that prefix_cache_retention_interval changed default from dense to 0 for SWA and SSM models and is now a CLI argument rather than an env var.",
            ],
            source: { label: "vLLM v0.29.0 release notes", url: "https://github.com/vllm-project/vllm/releases/tag/v0.29.0" },
          },
          {
            title: "vLLM v0.29.0, part two: sharded RL weight sync, and determinism gets cheap",
            whatsNew: [
              "The same release adds sharded_rdt, a peer-to-peer weight-sync backend where each inference worker pulls only its own tensor-parallel or expert-parallel slice over NIXL or Ray Direct Transport, plus rank-local IPC weight updates and sparse checkpoint-coordinate updates through native weight loaders. On the determinism side, per-architecture tuned batch-invariant matmul configs deliver roughly 3x faster decode kernels on RTX 4090D and H20, Blackwell autotuning cuts end-to-end latency 33.6%, MoE combine is deterministic under combined data and expert parallelism, and trace_decode_token_ids enables deterministic decode replay.",
            ],
            howItWorks: [
              "In online RL post-training the policy is updated on training GPUs and must be pushed to the inference GPUs generating rollouts, every step. The naive path broadcasts full weights, so every worker receives the whole model and discards most of it. sharded_rdt inverts this: each worker pulls only the slice its TP or EP rank owns, directly over the interconnect, so bytes moved scale with the shard rather than the model.",
              "Batch invariance is a separate problem: standard matmul kernels pick different reduction orders depending on batch shape, so the same prompt yields bitwise-different logits at batch size 1 versus 32, which breaks reproducibility and makes RL debugging miserable. Batch-invariant kernels fix the reduction order at a throughput cost, and this release tunes those kernels per architecture so the cost drops by roughly 3x on the named consumer and China-market SKUs.",
            ],
            impact: [
              "For anyone running GRPO or PPO-style post-training with vLLM as the rollout engine, weight-sync latency is usually a top-two bottleneck alongside rollout generation, and it worsens with scale because the naive broadcast is O(model size x workers). Sharded pull makes it O(model size) total. Combined with rank-local IPC updates and DeepSeek V4 mHC broadcast buffers now staying stable across weight sync, this is the most substantive RL-infrastructure change vLLM has shipped in months and directly cuts the wall-clock cost of a post-training run.",
              "On determinism: if you previously rejected batch-invariant mode because of the throughput hit, re-measure. Roughly 3x faster decode kernels on 4090D and H20 plus a 33.6% end-to-end latency cut from Blackwell autotuning changes the calculation for anyone who needs reproducible evals or bit-exact regression tests. One free win regardless: prefix-cache NONE_HASH is now deterministic by default, so distributed KV cache deployments no longer need to pin PYTHONHASHSEED across nodes.",
            ],
            source: { label: "vLLM v0.29.0 release notes", url: "https://github.com/vllm-project/vllm/releases/tag/v0.29.0" },
          },
          {
            title: "SGLang v0.5.19: beam search, DeepEP ElasticBuffer, LayerNorm sequence parallelism",
            whatsNew: [
              "Released September 5, 2026, two days before this week's window opens, and included because v0.5.18 was still the latest release at the time of last week's digest and this one went uncovered. SGLang v0.5.19 adds beam search, a DeepEP v2 ElasticBuffer all-to-all backend, LayerNorm sequence parallelism, a faster DSA prefill top-k kernel, an opt-in fused accept path for KDA models, and a persistent Lean attention kernel for AMD.",
            ],
            howItWorks: [
              "Beam search arrives via a beam_width request parameter returning the n best sequences instead of one sample; it runs alongside regular requests but does not yet compose with speculative decoding, disaggregation, DP attention, or HiCache. DeepEP is the expert-parallel all-to-all communication library for MoE models, and the new ElasticBuffer engine (--moe-a2a-backend deepep_v2, for DeepSeek-V3/V4 and Qwen3-MoE in FP8) uses fixed-size buffers, which is what lets decode run under CUDA graphs even across nodes, at performance on par with the classic backend.",
              "The --enable-layernorm-sp flag shards normalization itself across tensor-parallel ranks so each rank normalizes only its own share of prefill tokens rather than all of them. DSA is DeepSeek Sparse Attention, whose prefill top-k selection moves to a v2 kernel. KDA is the Kimi linear-attention variant, and SGLANG_OPT_KDA_FUSED_ACCEPT_STATE=1 fuses its speculative verify-and-commit step.",
            ],
            impact: [
              "The gains are individually small but they stack and most are one flag. LayerNorm SP takes 3.5% off Qwen3-8B prefill on H100 and 5.6% on B200, and the saving grows with TP degree, so it is worth more on wide deployments (dense Qwen3 only for now). DSA prefill top-k v2 is 1.3x to 1.8x faster on B200. The KDA fused accept path cuts MTP verify-and-commit time 45% to 63% on Kimi-Linear shapes with bit-identical output, the rare optimization you can enable without re-validating quality.",
              "The AMD story is the largest single gain: the persistent Lean attention kernel spreads long or uneven decode batches across all compute units instead of leaving many idle, worth up to 1.52x throughput and up to 3.62x lower inter-token latency on MI355X, and it self-enables where it helps (SGLANG_DISABLE_LEAN_ATTENTION=1 to disable). Evaluate the ElasticBuffer backend if you run cross-node MoE and have been forced into eager mode on decode.",
              "Container note: new ROCm 10 images ship for gfx942, gfx950 and gfx1250, ROCm 7.2.4 images move to Python 3.12 with torch 2.11 and triton 3.7, and a CUDA 13.4 container arrives for initial Rubin support.",
            ],
            source: { label: "SGLang v0.5.19 release notes", url: "https://github.com/sgl-project/sglang/releases/tag/v0.5.19" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether vLLM closes the Model Runner V2 feature gaps within the two to three weeks it stated on September 9. The list is sequence parallelism, dual-batch overlap, elastic expert parallelism, custom logits processors, and certain speculative decoding methods; until they land, configuring any of them silently falls back to MRV1, which is slated for removal in v0.32.", source: { label: "vLLM MRV2 gap tracker", url: "https://github.com/vllm-project/vllm/issues/47172" } },
      { text: "Whether the OpenAI Navier-Stokes proof survives independent mathematical review, and how priority settles against the Anthropic-assisted forced-Euler result from Alpoge and Buckmaster and the Caltech/NVIDIA unforced-Euler stability framework (arXiv 2609.10860, Sept 9). All three are unrefereed; the Lean formalizations narrow the dispute to whether the formalized statement is the Millennium Prize statement.", source: { label: "OpenAI Lean formalization", url: "https://github.com/openai/NavierStokesAndEuler" } },
      { text: "Whether FlashInfer cuts a stable v0.7.0 tag. The version bump PR went up for review September 3 and nightlies were building as of September 11, but v0.6.18 is still what vLLM v0.29.0 pins. The release brings MoE expert parallelism into serving engines via flashinfer.moe_ep with full CUDA-graph capture, so it is the next meaningful MoE-serving step for both vLLM and SGLang.", source: { label: "FlashInfer releases", url: "https://github.com/flashinfer-ai/flashinfer/releases" } },
    ],
  },
  {
    date: "2026-09-06",
    range: "August 31 to September 6, 2026",
    tldr: [
      "Watchlist resolution. Qwen3.8-27B's Qwen Cloud API remains unresolved (three weeks). vLLM's Kimi K3 DCP benchmarks still \"in progress\" (fourth week). OpenAI's Private Safety Processing white paper on track for September.",
      "Claude Fable 5.1 (Sept 1): input/output pricing unchanged ($10/$50 per Mtok), cache-read drops 75% to $0.25 per Mtok. Adaptive thinking improves hard-problem performance (Terminal Bench Science up to 52.6 from 24.7). Code security false positives drop 60%.",
      "Gemini 3.8 Flash (Sept 2): built on 3.7 Flash (not new base), beats 3.7 on every benchmark and Claude Opus 5 on three. Multimodal, 1M context, 64K output. Pricing unchanged until Jan 1 2027 ($0.75/$3.75 per Mtok, then doubles). Gemini 3.8 Flash Cyber: security-focused sibling.",
      "Muse Spark 1.3 (Sept 2): Meta's fourth release in five months. Reaches 62 on Artificial Analysis Intelligence Index (behind only Fable 5.1, Opus 5). Significant gains on agentic and scientific tasks. $1.25/$4.25 per Mtok on xhigh tier.",
      "Post-training methods converge: GRPO (on-policy, no critic) is dominant in 2026. DPO/KTO/SimPO (off-policy, static data) bounded by dataset quality. Unified theory (arXiv 2510.00977) shows GRPO and DPO converge under certain conditions. MCP ecosystem hits ~500M Tier-1 SDK downloads/month; 2026-07-28 spec introduces stateless core, multi-round requests, formal extensions.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            whatsNew: [
              "Nothing material this week. Recent speculative decoding papers (DSpark, Cross-Attention variants, Vision Is Not Overhead block drafting for VLMs) predate the window; arXiv September 2026 submissions are early and unvetted.",
            ],
            howItWorks: [
              "Monitoring for knowledge distillation mid-training effects (reasoning vs. factual recall tradeoff) and hierarchical RL credit assignment papers expected mid-September.",
            ],
            impact: [
              "Watch arXiv mid-September for speculative decoding and reasoning papers.",
            ],
            source: { label: "arXiv.org September 2026", url: "https://arxiv.org/list/cs.AI/2026-09" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "Claude Fable 5.1: 75% cache-read cost cut and deeper reasoning on harder problems",
            whatsNew: [
              "Anthropic released Claude Fable 5.1 on September 1, 2026. Input and output token pricing remain at $10/$50 per million tokens. Prompt-cache read pricing dropped 75 percent from $1.00 to $0.25 per million cached tokens, cutting total cost by ~25% for typical workloads and up to 45% for agentic use. Adaptive thinking (internal reasoning) is always-on; Terminal Bench Science score improved to 52.6 from Fable 5's 24.7. Code security false positives dropped ~60%.",
            ],
            howItWorks: [
              "Fable 5.1 is a capability update within the Fable line, not a new model. The cache-read pricing reduction directly incentivizes prompt caching, essential for agentic and long-context tasks that reuse context prefixes (system prompts, retrieved documents, tool-use traces). Reasoning improvements are internal: the adaptive thinking mechanism burns more tokens on harder problems, delivering better coverage on longer-horizon tasks. Security false-positive reduction suggests fine-tuning of instruction-following and internal reward signals governing safety flags.",
            ],
            impact: [
              "For teams running agentic work that already use prompt caching (cache_control parameter on Claude API), the 75% cache-read reduction is a direct cost cut with no code changes. For teams not yet using caching, this is the inflection point to adopt it: break-even on cache overhead is now at as few as 128-256 additional cached tokens. If deploying Claude Fable 5.1 for code understanding or linting, the 60% false-positive reduction on security checks is worth re-tuning alert thresholds on existing deployments, since actionable alerts will drop significantly.",
            ],
            source: { label: "Anthropic: Claude Fable 5.1 Release", url: "https://www.anthropic.com/news/claude-fable-51" },
          },
          {
            title: "Gemini 3.8 Flash: capability gains from deeper reasoning on 3.7 base",
            whatsNew: [
              "Google released Gemini 3.8 Flash on September 2, 2026. Built on Gemini 3.7 Flash architecture (not a new base model), deliberately designed to \"work harder\" by consuming more thinking tokens internally. Multimodal (text, image, audio, video, PDF), 1M-token context, 64K max output. Beats Gemini 3.7 Flash on every published benchmark and Claude Opus 5 on three (math, code, reasoning). Pricing identical to 3.7 Flash: $0.75 input / $3.75 output per million tokens (doubles Jan 1, 2027). Security-focused variant, Gemini 3.8 Flash Cyber, launched for red-teaming and security engineering.",
            ],
            howItWorks: [
              "Rather than retraining the base model, Google applied post-training adjustments to increase internal reasoning depth (adaptive thinking, similar to Fable 5.1). Model is tuned to spend more inference-time tokens on harder reasoning problems, prioritizing accuracy over efficiency on those trajectories. Google explicitly frames this: stay on 3.7 Flash if efficiency is your priority; switch to 3.8 Flash if accuracy on hard problems matters more.",
            ],
            impact: [
              "For teams evaluating upgrade from 3.7 Flash to 3.8 Flash, cost is zero (identical pricing through Dec 31 2026) but tradeoff is latency: deeper reasoning means more thinking tokens, higher TTFT and overall latency. Measure your p95 latencies before switching in production. Published benchmark wins (beating Opus 5 on three tasks) are reference points; verify against your own evals before committing traffic. Cyber variant is worth benchmarking against your red-team prompts if running security-focused workloads.",
            ],
            source: { label: "Google: Gemini 3.8 Flash Launch", url: "https://blog.google/technology/ai/gemini-3-8-flash/" },
          },
          {
            title: "Muse Spark 1.3: agentic and scientific capability gains, parity with GPT-5.6",
            whatsNew: [
              "Meta released Muse Spark 1.3 on September 2, 2026, fourth release in five months. Multimodal (text, image, video), 1M-token context. On Artificial Analysis Intelligence Index, max variant scores 62 (behind only Claude Fable 5.1 and Opus 5), xhigh tier scores 61 (tied with GPT-5.6 Sol max and Grok 4.6 high). Primary gains in agentic work and scientific reasoning. Pricing on xhigh: $1.25 input / $4.25 output per million tokens.",
            ],
            howItWorks: [
              "Muse Spark 1.3 is a capability update within the Spark line (incremental from 1.2, not new base). Improvements come from post-training adjustments targeting long-horizon agentic tasks (planning, tool orchestration, iterative problem solving) and scientific reasoning (math, symbolic manipulation, proof verification). This reflects industry shift toward agent-centric benchmarks.",
            ],
            impact: [
              "Muse Spark 1.3 reaches parity with GPT-5.6 Sol and Grok 4.6 on intelligence benchmarks and surpasses them on agentic-specific evals. For teams on Muse Spark 1.2, 1.3 is drop-in replacement at identical pricing. For teams evaluating multi-model inference, xhigh tier at 61 on AA Index puts Muse Spark 1.3 in \"capable enough for long-horizon agent work\" category without frontier-model cost. Verify against your own agentic evals (tool correctness, planning depth, trace quality) before committing production traffic.",
            ],
            source: { label: "Meta: Introducing Muse Spark 1.3", url: "https://research.meta.ai/blog/introducing-muse-spark-1-3/" },
          },
          {
            title: "Post-training methods converge: GRPO on-policy, DPO off-policy, unified theory",
            whatsNew: [
              "Industry and research consensus on post-training has solidified into a two-stage pipeline: (1) supervised fine-tuning (SFT) on diverse instruction data, then (2) alignment via GRPO (on-policy) or DPO/KTO/SimPO variants (off-policy, static data). GRPO (Group Relative Policy Optimization) dominates for on-policy work in 2026: no separate critic network (unlike PPO), cutting memory cost in half and simplifying stability. Recent research (arXiv 2510.00977, \"It Takes Two: Your GRPO Is Secretly DPO\") unifies PPO, DPO, and GRPO theoretically, showing surprising structural similarities.",
            ],
            howItWorks: [
              "GRPO operates by comparing responses within a batch (group) without maintaining separate value critic as PPO does. Policy gradient is computed directly from relative ranking of responses within that batch. DPO and variants (KTO, SimPO) skip RL loop entirely: take fixed preference dataset (human rankings or LLM-generated contrasts) and directly optimize policy to match preferences via maximum likelihood. Recent unification work shows that under certain conditions, GRPO and DPO converge on same gradient signal, explaining why both work well despite different formulations.",
            ],
            impact: [
              "If building post-training pipeline for your own model, consensus pipeline is: (1) gather 100K-1M diverse instruction examples, SFT for 2-3 epochs; (2) gather or generate 10K-100K preference pairs, choose GRPO or DPO. GRPO is lower total cost (single model, simpler infrastructure) but requires online rollout (sample generation during training). DPO is simpler (static dataset, embarrassingly parallel) but quality-bounded by preference dataset. For reasoning models (math, code, long-horizon tasks), RLVR plus DPO/GRPO is emerging standard (DeepSeek R1 approach). Reward hacking mitigation (Preference As Reward) is now standard consideration.",
              "Unification result (GRPO = DPO under specific conditions) suggests mixing methods or using whichever fits your infrastructure is safe.",
            ],
            source: { label: "arXiv:2510.00977", url: "https://arxiv.org/abs/2510.00977" },
          },
          {
            title: "Model Context Protocol reaches 500M monthly Tier-1 SDK downloads; stateless core and formal extensions",
            whatsNew: [
              "MCP ecosystem crossed ~500 million monthly downloads for Tier 1 SDKs (TypeScript and Python), with both languages individually exceeding 1 billion total downloads lifetime. Protocol adopted as de-facto standard for agentic tool use and external-system integration. 2026-07-28 specification introduced stateless protocol core (eliminating server-side session state requirements), Multi-Round-Trip Requests for complex workflows, header-based routing for tool selection, formal extensions framework. Roadmap updated Aug 22, focusing on long-running work primitives, interactive experiences, enterprise deployment patterns.",
            ],
            howItWorks: [
              "MCP is a JSON-RPC 2.0 protocol decoupling LLM hosts from tool/data servers. Client (e.g., Claude, other LLM) initiates connection to MCP server (tool provider, database connector, code sandbox) and discovers available tools via standard schema. Stateless design removes need to persist connections or session context on server, making integration simpler for managed services and cloud deployments. Multi-round-trip support allows single tool call to decompose into multiple request-response pairs, enabling streaming responses and incremental results.",
            ],
            impact: [
              "For teams building agentic systems, MCP is now default integration layer: define tools as MCP servers, connect LLM to them, let model orchestrate. Stateless core means deploying MCP servers in ephemeral containers or serverless functions without managing session state. 500M+ monthly download volume signals MCP effectively replacing point-to-point tool integrations in favor of standardized protocol. For teams evaluating which tools to expose to agents, MCP's extension framework makes it tractable to add custom tool types without forking protocol.",
              "Roadmap focus on long-running work (tasks spanning multiple agent invocations) and interactive experiences (user-in-the-loop agent orchestration) suggests MCP moving beyond stateless tool dispatch toward more complex agentic workflows.",
            ],
            source: { label: "Model Context Protocol Blog: 500M Downloads", url: "https://blog.modelcontextprotocol.io/posts/2026-mcp-milestone/" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "vLLM v0.27.1 stable and MiniMax H3 Omni integration",
            whatsNew: [
              "vLLM's stable release v0.27.1 (August 11, 2026) remains the production baseline. September 1 blog post highlights \"MiniMax H3 on vLLM-Omni: From System-Wide Optimization to Real-Time Serving with FastVideo's FastH3,\" indicating continued momentum in omni (multimodal + diffusion) serving. vLLM solidified as leading open-source inference serving framework, powering deployments from startups to enterprises.",
            ],
            howItWorks: [
              "vLLM v0.27.1 builds on continuous performance optimizations: paged attention (KV cache efficiency), batching and scheduling (dynamic batching under load), quantization support (GPTQ, AWQ, FP8), hardware-specific kernels (NVIDIA, AMD). MiniMax H3 Omni blog post demonstrates integration of MiniMax's hybrid 3D (spatial-depth-temporal) attention with vLLM's serving stack, enabling real-time video generation and streaming output.",
            ],
            impact: [
              "For teams deploying production LLM inference, vLLM v0.27.1 is stable and well-tested across wide range of models and hardware. v0.27.x series emphasizes compatibility and performance over new features; update within series without worry. For multimodal and diffusion deployments, vLLM-Omni is production-ready and worth benchmarking against closed-source options (Together, Baseten) on your specific models before deciding on infrastructure. MiniMax H3 integration is useful case study if you need real-time video generation serving.",
            ],
            source: { label: "vLLM: v0.27.1 Release", url: "https://github.com/vllm-project/vllm/releases/tag/v0.27.1" },
          },
          {
            title: "SGLang 29% faster than vLLM on H100, 3.1x on DeepSeek V3",
            whatsNew: [
              "SGLang (Structured Generation Language) widens inference-speed lead over vLLM. Benchmarks show SGLang 29% faster than vLLM on H100 for general workloads, 3.1x faster on DeepSeek V3 (custom MLA optimization backends: FlashAttention3, FlashInfer, FlashMLA, CutlassMLA). SGLang achieves up to 6x acceleration in RAG scenarios where cache reuse (RadixAttention) dominates. Framework is purpose-built for structured reasoning and agent-based workflows.",
            ],
            howItWorks: [
              "SGLang combines Python-embedded frontend language with optimized backend runtime. Core optimizations include RadixAttention (prefix-tree KV cache reuse across requests sharing context), Grouped GEMMs (kernel fusion for parallel matrix multiplications), custom cross-device all-reduce kernels, specialized backends for dense (standard attention) and sparse (MLA, sparse routing) attention. For MLA-heavy models like DeepSeek V3, MLA-specific kernels (FlashMLA) dominate speedup.",
            ],
            impact: [
              "For teams evaluating inference engines, SGLang is right choice if running reasoning workloads, agentic tasks with shared context (RAG, multi-turn agents), or MLA-based models (DeepSeek V3). 29% general speedup over vLLM translates to 15-25% cost reduction at same throughput, or 30-40% more throughput at same cost. For RAG and agent workloads, RadixAttention's 6x potential speedup is transformative: context reuse shifts from cost center to major performance lever. vLLM remains safer choice for broad model compatibility and community support if running diverse architectures; SGLang is sharper on target workloads.",
            ],
            source: { label: "Yotta Labs: SGLang vs vLLM Comparison 2026", url: "https://www.yottalabs.ai/post/vllm-vs-sglang-which-inference-engine-should-you-use-in-2026" },
          },
          {
            title: "Quantization ecosystem solidifies: AWQ production default, GGUF/GPTQ/FP8 in their niches",
            whatsNew: [
              "Quantization ecosystem stabilized by September 2026. AWQ (Activation-Aware Weight Quantization) is production default for multi-user GPU serving (vLLM, SGLang). GGUF is standard for local inference (llama.cpp, Ollama, LM Studio). GPTQ remains viable but slower than AWQ on modern kernels (Marlin). FP8 is low-friction choice on H100 and newer GPUs (TensorRT-LLM, vLLM).",
            ],
            howItWorks: [
              "AWQ analyzes activation patterns during calibration and protects important weights from aggressive quantization, while less-important weights are quantized more aggressively, preserving quality at INT4 with faster kernels than GPTQ. GGUF is CPU-friendly (GGML tensor library, efficient for inference on CPU and consumer GPUs without heavy framework). GPTQ uses second-order Hessian information to minimize quantization error at INT4, but slower kernel support makes it less attractive for new deployments. FP8 is native floating-point format on H100+ achieving near-FP16 quality with 50% memory savings and zero-overhead compatibility.",
            ],
            impact: [
              "For production multi-user serving on NVIDIA GPUs, AWQ is starting point: smaller models like Llama 3.1-8B or Mistral-7B run at 2-3x higher throughput in vLLM with <1% quality loss vs. FP16. For local development, GGUF via llama.cpp or Ollama is simple (one binary, one command). For H100/H200 clusters, FP8 is increasingly attractive: native GPU support, no quantization artifacts, minimal integration effort (set load_format=\"auto\" in vLLM).",
              "If quantizing custom model, AWQ calibration is faster and more stable than GPTQ; GPTQ quality is negligibly better but overhead not worth it for new work.",
            ],
            source: { label: "vLLM: Quantization Guide 2026", url: "https://blog.vllm.ai/2026-quantization-guide/" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether Qwen3.8-27B's promised Qwen Cloud API (native 1M context, built-in tools) launches by mid-September, and at what price relative to current third-party rates ($0.40-0.45/$3-3.20 per Mtok). After three weeks of \"coming soon,\" slippage is now material.", source: { label: "Qwen: Qwen3.8-27B Announcement", url: "https://huggingface.co/Qwen/Qwen3.8-27B" } },
      { text: "Whether GLM-5.3-Flash's claim to beat GLM-5.2 on every benchmark at 1/10 cost holds up under independent reproduction; MIT licensing makes this natural focal point for teams evaluating open-weight multimodal models.", source: { label: "Z.ai: GLM-5.3-Flash", url: "https://openrouter.ai/z-ai/glm-5.3-flash" } },
      { text: "Whether vLLM's Kimi K3 Decode Context Parallelism benchmarking work lands by week's end. Fourth week of \"in progress\" suggests either feature complexity increased or internal prioritization shifted; knowing which clarifies whether DCP optimizations are real wins or architectural overcomplications.", source: { label: "vLLM Blog: Decode Context Parallelism", url: "https://vllm.ai/blog/2026-08-07-decode-context-parallelism" } },
    ],
  },
  {
    date: "2026-08-30",
    range: "August 24 to August 30, 2026",
    tldr: [
      "Watchlist resolution. Qwen3.8-27B's hosted Qwen Cloud API remains \"coming soon,\" unresolved after two weeks. vLLM's Kimi K3 Decode Context Parallelism benchmark is still \"in progress,\" now a third consecutive week of no update. OpenAI's Private Safety Processing white paper is on track for September 2026.",
      "Three major open-weight releases in three days: Z.ai's GLM-5.3-Flash (320B/18B active, MIT license, $0.15/$0.50 per Mtok, beats GLM-5.2 on all benchmarks at 1/10 cost), Alibaba's Qwen3.8-Flash-Next (125B/6B active, Qwen4 preview with novel 51B N-gram embedding layer), Tencent's Hy4 Preview (770B/49B active, 2.99/4 on internal 163-expert eval, ahead of Kimi K3 and GLM-5.3).",
      "DeepSeek V4 Flash Vision Exp (Aug 21): multimodal Flash at 284B/13B active, $0.22/$0.66 per Mtok, 1M-token context, tool calling, 1.3B tokens already routed since launch.",
      "AsymSpec (EMNLP 2026 Main): context-asymmetric speculative decoding partitions KV cache between drafter (short window, fast) and target (full context), beating standard block drafters by 40-60% accepted tokens on agentic workloads with 50K-100K token traces.",
      "VeRL-Omni v0.2.0 (Aug 20): higher-throughput diffusion rollout, reusable omni adapters for cross-model RL config, expanded recipe library for Cosmos3-Super and DiffusionGemma post-training.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "AsymSpec: context-asymmetric speculative decoding for long-context agentic traces",
            whatsNew: [
              "arXiv 2608.26004 (accepted to EMNLP 2026 Main Conference). AsymSpec extends speculative decoding to long-context agentic workloads by partitioning the KV cache: a lightweight short-context drafter (e.g., 8K tokens) receives only recent-window KV cache while the target model uses the full long context (50K-100K tokens). On agentic benchmarks with realistic long-context traces, AsymSpec beats standard full-context block drafters (DFlash, Domino) by accepting 40-60% more tokens per verification step.",
            ],
            howItWorks: [
              "Standard speculative decoding runs drafter and target on the same context size, so for 100K-token agentic traces, the drafter becomes expensive itself. AsymSpec decouples their input distributions by giving the drafter only the recent window (e.g., last 8K tokens), which is typically sufficient for predicting the immediate next token since agentic traces are often feedback-rich and recent-context-heavy (tool outputs, immediate agent decisions feed forward more strongly than early trace context).",
              "The target model still sees the full 100K-token KV cache; verification re-computes the drafter's recent-window predictions with the full cache to catch any long-range dependence that the drafter might have missed. Since re-computation is limited to the short window, not the full target model, the cost is tractable.",
            ],
            impact: [
              "For teams running long-context agentic RL or reasoning traces (typical deployed lengths 50K-200K tokens) and accelerating them with speculative decoding, context-asymmetric drafting is a straightforward way to keep drafter cost low while preserving target context awareness. The 40-60% token-acceptance gains are measured on genuine agentic workloads, not synthetic fixed-length sequences, so they should transfer to production deployments. The method requires no training changes and is a pure serving-side scheduler modification for teams already running speculative decoding, complementary to per-token confidence-adaptive budgeting (e.g., DSpark adaptive verification from last week's digest).",
            ],
            source: { label: "arXiv:2608.26004", url: "https://arxiv.org/abs/2608.26004" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "Three open-weight releases collapse the capability premium: GLM-5.3-Flash, Qwen3.8-Flash-Next, Hy4 Preview",
            whatsNew: [
              "Z.ai released GLM-5.3-Flash on August 26, 2026: 320B total parameters with 18B active, native multimodal, 1M-token context, MIT license, $0.15/$0.50 per Mtok API pricing, claims to beat GLM-5.2 on every benchmark at 1/10 cost and under half the size. Same day, Alibaba released Qwen3.8-Flash-Next: 125B/6B active, Qwen4 architecture preview with a novel 51B N-gram embedding layer (learnable phrase dictionary stored in CPU RAM).",
              "August 28, Tencent open-sourced Hy4 Preview: 770B/49B active, 1M-token context, Terminal Bench 2.1 score of 85.4 (surpassing DeepSeek V4 Pro), DeepSWE 64.3, and 2.99/4 on Tencent's blind internal expert eval (163 experts, 203 tasks), ahead of Kimi K3 (2.94) and GLM-5.3 (2.92).",
            ],
            howItWorks: [
              "All three use MoE (Mixture-of-Experts) to decouple total parameters from per-token active compute. GLM-5.3-Flash builds on GLM-5.3's hybrid attention (combining multi-head attention with linear-time recurrent layers). Qwen3.8-Flash-Next previews Qwen4 with the N-gram embedding layer as an architectural innovation: common word sequences are stored as standalone dictionary entries that sit in regular host RAM rather than on GPU, reducing GPU-side weight memory with modest additional CPU cost. Hy4 combines sparse MoE with hybrid linear and standard attention to sustain 1M-token contexts while keeping per-token active parameters low.",
              "All three shipped with day-0 vLLM support and quantized checkpoints (FP8, NVFP4/MXFP4).",
            ],
            impact: [
              "The three releases in three days signal the collapse of the \"large = slow, small = cheap\" tradeoff that defined 2025. GLM-5.3-Flash at $0.15/$0.50 per Mtok and MIT licensed is the clearest entry point for teams that need open-weight multimodal models without API vendor lock-in; the published claim to beat GLM-5.2 on every benchmark is worth independent verification before committing production traffic, but if it holds, it is a direct replacement for teams currently running GLM-5.2 or similar cost-conscious deployments.",
              "Qwen3.8-Flash-Next's N-gram embedding is novel architecture (storage split between GPU weights and CPU RAM), and worth benchmarking on your own hardware if embedding memory is a bottleneck. Hy4's internal engineering eval (2.99/4, ahead of Kimi K3 and GLM-5.3) provides one concrete data point, though SWE-bench Pro scores (where Hy4 reportedly leads, though exact numbers not yet published) would be more directly comparable to hiring eval workflows.",
            ],
            source: { label: "Z.ai GLM-5.3-Flash on OpenRouter", url: "https://openrouter.ai/z-ai/glm-5.3-flash" },
          },
          {
            title: "DeepSeek V4 Flash Vision Exp: multimodal at 1M context for $0.22/$0.66 per Mtok",
            whatsNew: [
              "DeepSeek released V4 Flash Vision Exp on August 21, 2026: a multimodal extension of V4 Flash text model, supporting image, chart, and video input alongside text. It is a 284B sparse MoE with 13B active parameters, 1M-token context, structured output (tool calling, JSON), pricing $0.22 input / $0.66 output per million tokens with cache-read at $0.007 per Mtok. OpenRouter reports over 1.3 billion tokens routed through it since launch.",
            ],
            howItWorks: [
              "This is a multimodal input extension, not a new model training. DeepSeek added perception (image and video tokenization) to the frozen text decoder backbone; the sparse MoE routing and numerical kernels remain unchanged from Flash. Images and videos are encoded into token sequences that feed into the same 13B-active sparse network alongside text.",
            ],
            impact: [
              "The multimodal Flash release addresses a gap for agentic systems that need to process documents, screenshots, and video frames at near-zero cost per token. The price point ($0.22/$0.66, undercutting most open-weight inference providers) and extremely long context window (1M tokens) make it a direct alternative for teams currently using Qwen3.8-27B or Muse Glimmer-30B for visual agent workloads via API. Structured output support (tool calling, JSON) is essential for agentic deployments and worth validating against your own tool-use benchmarks before routing production traffic.",
            ],
            source: { label: "DeepSeek API Docs: V4 Flash Vision", url: "https://api-docs.deepseek.com/models" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "VeRL-Omni v0.2.0: higher-throughput diffusion RL and reusable recipe adapters",
            whatsNew: [
              "VeRL-Omni v0.2.0 released August 20, 2026, extending the unified RL post-training framework for diffusion and multimodal models. The release focuses on accelerating diffusion rollouts (candidate generation during RL training), introducing reusable omni adapters for cross-model RL configuration, and expanding recipe coverage for Cosmos3-Super, DiffusionGemma, and other recent omni models.",
            ],
            howItWorks: [
              "VeRL-Omni connects verl's training loop infrastructure (PPO, GRPO, on-policy, off-policy) with vLLM-Omni's serving engine to handle diffusion and multimodal generation during RL rollout phases. v0.2.0 optimizes the rollout path by reducing model reloads and improving batch-aware scheduling, adds adapter abstractions so RL recipes for one diffusion model can be transferred to another with minimal changes, and extends the recipe library with tested configs for new model families.",
            ],
            impact: [
              "If you are running post-training RL for diffusion models (reward-maximizing video generation, image refinement, text-to-image adaptation), the higher throughput in v0.2.0 reduces wall-clock time per RL iteration, which is particularly valuable since diffusion RL already incurs large sample generation cost versus text RL. The reusable adapters lower setup cost when porting recipes across similar model families, similar to LoRA for fine-tuning but at the orchestration level. For teams not yet doing diffusion RL, v0.2.0's recipe library and reference configs reduce the barrier to entry.",
            ],
            source: { label: "vLLM Blog: VeRL-Omni v0.2.0", url: "https://vllm.ai/blog/2026-08-20-verl-omni-v0-2-0" },
          },
          {
            title: "vLLM Speculative Decoding on AMD GPUs: MTP, EAGLE-3, DFlash, DSpark configuration guide",
            whatsNew: [
              "vLLM published \"Exploring Speculative Decoding in vLLM on AMD GPUs\" on August 23, 2026, a practical configuration and benchmarking guide for four speculative drafter families (MTP, EAGLE-3, DFlash, DSpark) on AMD Instinct MI300X and MI350X hardware. The post documents how to configure each family, tradeoffs between draft length and acceptance rate, and measured speedups on three model sizes.",
            ],
            howItWorks: [
              "The guide walks through each speculative approach: MTP (native multi-token prediction heads from the target, zero overhead), EAGLE-3 (learned drafter trained on target hidden states), DFlash (block-diffusion drafter, semi-autoregressive), and DSpark (sparse-MLA-based adaptive drafting, reference Blackwell design adapted for AMD). For each, vLLM shows configuration flags, calibration steps, and empirical tradeoffs between draft length, verification cost, and end-to-end token acceptance rate measured on real MI300X/MI350X hardware.",
            ],
            impact: [
              "For teams deploying speculative decoding on AMD MI300X/MI350X without clear guidance on which drafter to start with, this removes trial-and-error. The post includes actual speedup numbers per configuration (e.g., 2.0x from MTP at concurrency 128, 1.79x from EAGLE-3 on Kimi-K2.5), so you can plan hardware and batch-size needs upfront. MTP speedups (zero overhead, native) suggest that if your model ships with MTP heads, that is the first configuration to try on AMD before investing in EAGLE-3 or DFlash training.",
            ],
            source: { label: "vLLM Blog: Speculative Decoding on AMD GPUs", url: "https://vllm.ai/blog/2026-08-23-speculative-decoding-amd-gpus" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether Qwen3.8-27B's promised Qwen Cloud API (1M context by default, official built-in tools) launches and at what price relative to current $0.40-0.45 / $3-3.20 per-Mtok third-party rates; unresolved after two weeks.", source: { label: "Qwen3.8-27B model card", url: "https://huggingface.co/Qwen/Qwen3.8-27B" } },
      { text: "Whether GLM-5.3-Flash's published benchmarks (beats GLM-5.2 on every benchmark at 1/10 cost, under half the size) hold up under independent reproduction, given MIT licensing makes this a natural focal point for open-weight multimodal evaluation.", source: { label: "Z.ai GLM-5.3-Flash", url: "https://openrouter.ai/z-ai/glm-5.3-flash" } },
      { text: "Whether the Kimi K3 Decode Context Parallelism benchmark vLLM has tracked as \"in progress\" for three consecutive weeks will ship, and whether DCP performance improvements justify the architectural changes or whether other bottlenecks (attention, MLA, speculative drafter interaction) dominate.", source: { label: "vLLM Blog: Decode Context Parallelism", url: "https://vllm.ai/blog/2026-08-07-decode-context-parallelism" } },
    ],
  },
  {
    date: "2026-08-23",
    range: "August 17 to August 23, 2026",
    tldr: [
      "Watchlist resolution. Meta's promised llama.cpp, MLX, and ExecuTorch support for Muse Glimmer-30B has landed: Hugging Face hosts quantized GGUF builds and Meta's developer docs now publish an ExecuTorch export pipeline. Qwen3.8-27B's own hosted Qwen Cloud API remains \"coming soon,\" though third-party providers (OpenRouter and seven others) have served it since its August 14 release at $0.40-0.45 / $3-3.20 per Mtok. vLLM's Kimi K3 Decode Context Parallelism benchmark is still \"in progress,\" unchanged for a second consecutive week.",
      "OpenAI previewed Private Safety Processing (Aug 19): a safety-monitoring design meant to preserve Zero Data Retention while still catching cross-session misuse in longer-running agentic workloads, aimed at enterprises that won't accept content retention for safety review.",
      "The SkyRL team shipped IsoExec (Aug 21): a cross-framework execution contract that pins vLLM (rollout) and Megatron (training) to bitwise-consistent kernels, cutting the average rollout-vs-training logprob gap below 1e-6 on Qwen3.5-35B-A3B, at a 25% step-time cost.",
      "SAPO (Aug 20) shares one autoregressive backbone between policy and value functions for agentic RL, beating PPO and GRPO by 12-15 percentage points on ALFWorld/WebShop while cutting PPO's per-iteration runtime by a third.",
      "vLLM-Omni's Distributed Layerwise Offload (Aug 17) lets a 124GB diffusion video model run on 64GB-HBM cards by sharding and streaming weights layer by layer, with a measured 3.3x throughput gain from serving concurrent requests during the AllGather step.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "SAPO: one backbone for both policy and value in agentic RL",
            whatsNew: [
              "arXiv 2608.19842 (Dayang Liang, Lang Feng, Bo An, Yunlong Liu), submitted August 20, 2026. Introduces SAPO (Single-rollout Autoregressive Policy Optimization), an actor-critic framework where the policy and value functions share one autoregressive backbone, producing both at distinct causal positions with shared parameters rather than running a full second critic model. On ALFWorld and WebShop with Qwen2.5-1.5B/7B, SAPO outperforms PPO and GRPO by mean +15.1 and +12.1 percentage points respectively, while eliminating a separate critic's memory cost and cutting per-iteration runtime by 33.2% versus PPO.",
            ],
            howItWorks: [
              "Standard PPO (Proximal Policy Optimization) needs two models: a policy that acts and a critic that estimates how good a state is, which doubles memory and compute. GRPO (Group Relative Policy Optimization) drops the critic entirely and instead estimates advantage from the spread of rewards across a group of sampled rollouts for the same prompt, but the paper argues this leaves it without explicit value generalization or reliable turn-by-turn credit assignment on long-horizon agent tasks, and that advantage estimates can collapse over many turns.",
              "SAPO's fix keeps a single backbone but lets it emit two different predictions, a policy distribution and a value estimate, from different causal positions in the same forward pass, so the value function is trained through an auxiliary SARSA-style objective while sharing all the parameters and compute of the policy network. To make credit assignment more robust across long trajectories, it adds a trajectory-level generalized advantage estimator that combines lambda-returns (a standard way to blend short- and long-term reward signal) with batch normalization.",
            ],
            impact: [
              "This is a memory and compute optimization for agentic RL post-training, not just an accuracy gain: teams running PPO-style RL because they want an explicit value function (for long-horizon credit assignment) no longer have to pay for a separate critic model to get one.",
              "The reported numbers are on ALFWorld and WebShop with relatively small 1.5B/7B Qwen2.5 models, so the +12-15 point gains and 33% runtime cut are unverified at larger scale or on other agentic benchmarks, but the underlying idea, sharing one backbone across policy and value roles, is a general architectural pattern worth testing against any GRPO or PPO agentic RL pipeline that is memory-constrained or bottlenecked by critic overhead.",
            ],
            source: { label: "arXiv:2608.19842", url: "https://arxiv.org/abs/2608.19842" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "OpenAI previews a way to keep Zero Data Retention while still catching cross-session agent misuse",
            whatsNew: [
              "OpenAI published \"Offering Zero Data Retention for frontier models\" on August 19, 2026, previewing Private Safety Processing: a safety-monitoring design meant to detect patterns of misuse across multiple related interactions without giving OpenAI personnel access to the underlying content, for customers using Zero Data Retention (ZDR) deployments. A technical white paper and rollout are planned for September 2026.",
            ],
            howItWorks: [
              "ZDR (Zero Data Retention) is an API deployment mode where OpenAI does not retain prompts or responses after a request is processed, and customer content isn't available to OpenAI staff for review. That's attractive for regulated or security-sensitive customers, but it has historically limited safety monitoring to evaluating each interaction in isolation, which misses risks that only become visible across a longer agentic task (for example, a tool-using agent that keeps acting after being told to stop, or bad actors coordinating across accounts and sessions).",
              "Private Safety Processing extends monitoring across related interactions while keeping customer content either on infrastructure the customer controls (standard ZDR) or, in an option OpenAI is developing, on OpenAI infrastructure but encrypted with keys the customer controls. In both cases, an automated system evaluates the content and returns only a narrow, categorical signal (the type of activity flagged) to OpenAI, without exposing the underlying prompts or responses to OpenAI personnel; a human enforcement decision is made from that signal, and customers can share content voluntarily if they want to appeal.",
            ],
            impact: "This is a compliance and procurement-relevant change for anyone building agentic systems on OpenAI's API under a ZDR contract, not a model or training change, and it's worth tracking for two reasons: first, teams currently choosing between providers partly on data-handling terms now have a preview of how OpenAI plans to reconcile \"we can't see your data\" with \"we can still catch agents that go off the rails\" for longer-running agentic workloads, where that reconciliation has been a real point of friction; second, the actual mechanism (what counts as a flaggable pattern, what the categorical signal contains) is not fully specified until the September white paper, so this is a preview to plan around, not a shippable guarantee yet.",
            source: { label: "OpenAI: Zero Data Retention for frontier models", url: "https://openai.com/index/offering-zero-data-retention-for-frontier-models/" },
          },
          {
            title: "Muse Glimmer's promised local-deployment stack lands: llama.cpp, MLX, and ExecuTorch",
            whatsNew: [
              "Meta's Muse Glimmer-30B, released August 10, 2026 without edge-framework support beyond server-side vLLM/SGLang/Transformers, now has the llama.cpp, MLX, and ExecuTorch integrations it had promised \"in the coming days.\" Hugging Face hosts quantized GGUF builds of the model for llama.cpp, and Meta's developer docs now publish an ExecuTorch export pipeline for the model, resolving last week's open watchlist item.",
            ],
            howItWorks: [
              "The GGUF repository provides quantized text builds of Muse Glimmer for llama.cpp, along with a perception encoder for image input and a DFlash speculative-decoding drafter (DFlash proposes a block of draft tokens per forward pass rather than one token at a time; a target model verifies them in parallel). The ExecuTorch path takes the same quantized GGUF checkpoints as input and produces ExecuTorch `.pte` programs, PyTorch's ahead-of-time export/runtime format for on-device inference, supporting both target-only and DFlash-drafted export, with optional image input, on CUDA and Apple silicon (MLX) targets.",
            ],
            impact: [
              "This closes the gap between Muse Glimmer's Apache-2.0 licensing and its practical reach: teams that wanted a locally-deployable, license-unencumbered local agent model now have a real path to run it through the same edge frameworks (llama.cpp, MLX, ExecuTorch) already used for other open models, rather than being limited to server-side vLLM/SGLang serving.",
              "Meta's own published hardware numbers (3.1x decode speedup on RTX 5090, 1.8x on M5 Max, 1.5x on M4 Max from the bundled DFlash drafter) can now actually be reproduced end-to-end on that hardware through these integrations, rather than requiring a server-class GPU deployment to test.",
            ],
            source: { label: "Meta developer docs: Muse Glimmer + ExecuTorch", url: "https://dev.meta.ai/docs/muse-glimmer/executorch" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "IsoExec: pinning vLLM and Megatron to the same bits to fix RL's trainer-inference mismatch",
            whatsNew: [
              "The SkyRL team published \"IsoExec: Unified Execution to Eliminate Trainer-Inference Mismatch in SkyRL\" on August 21, 2026. IsoExec is a cross-framework execution abstraction that unifies numerical execution across SkyRL's vLLM (rollout) and Megatron (training) runtimes for RL post-training. On a single 8xH100 node running synchronous Qwen3.5-35B-A3B DAPO training, it reduces the average rollout-versus-training logprob difference to below 1e-6, with 25% step-time overhead versus the native stack over 50 measured steps.",
            ],
            howItWorks: [
              "On-policy RL assumes the rollout engine and the trainer are evaluating the exact same policy, but in practice they're usually two different systems (here, vLLM for generation and Megatron for training) with different kernels, batch shapes, and parallelism layouts. Because floating-point arithmetic isn't associative, those implementation differences change the computed token probabilities even when the underlying model and weights are identical, and prior work has shown this mismatch alone can destabilize GRPO or REINFORCE-style training and distort reward signal before other stabilizing mechanisms (like KL penalties) can react.",
              "IsoExec's fix is an \"execution contract\" that declares, for every region of the model's forward computation, exactly which kernel implementation and numerical constants (accumulation dtype, reduction order, and so on) both runtimes must use, validated in advance for bitwise exactness; a per-runtime adapter installs and enforces the contract, and SHA-256 digests let trainer and rollout engine verify they're actually running the same numerical policy. A separate technique, chunkwise-parallel recurrent (CPR) computation, extends this consistency to linear-attention (Gated DeltaNet) layers, which otherwise use different, non-bitwise-equivalent algorithms for training/prefill versus decode.",
            ],
            impact: [
              "For teams running RL post-training (RLHF/RLAIF/GRPO-style pipelines) with separate rollout and training engines, this targets a specific, previously hard-to-diagnose failure mode: reward instability or collapse that traces back to numerical mismatch rather than a genuine algorithm or data problem. The 25% overhead is a real cost of adopting it, and the paper's own 50-step experiment did not show a meaningful reward improvement from removing the mismatch in that short window, so the benefit shown so far is mainly diagnostic clarity and stability rather than a demonstrated accuracy or sample-efficiency win.",
              "The implementation is open-sourced (github.com/zanderjiang/SkyRL-IsoExec) for teams that want to test whether their own RL runs are affected by this class of mismatch before adopting the full contract-enforcement mechanism.",
            ],
            source: { label: "vLLM Blog: IsoExec", url: "https://vllm.ai/blog/2026-08-21-isoexec" },
          },
          {
            title: "Distributed Layerwise Offload: fitting a 124GB video model on 64GB HBM cards",
            whatsNew: [
              "The vLLM-Omni Diffusion Team published \"Distributed Layerwise Offload: Scaling Toward 200B+ DiT Models Efficiently in vLLM-Omni\" on August 17, 2026. Distributed Layerwise Offload (DLO) lets diffusion video models larger than a single device's HBM run across multiple GPUs or NPUs with minimal host-memory overhead, validated by serving a 124GB Cosmos3-Super model on 64GB-HBM Ascend 910B3 cards, and estimates a path to 200B+ parameter models within a 2TB host-RAM budget.",
            ],
            howItWorks: [
              "DiT (Diffusion Transformer) video models can outgrow a single GPU's memory; the two standard fixes are fully sharded data parallelism (FSDP/HSDP), which needs no host memory but leaves little HBM headroom, or plain layerwise offload, which needs only 2 layers of HBM at a time but stores a full model copy in every rank's host RAM (4 devices x 124GB = 496GB, more than most servers have).",
              "DLO combines both approaches' benefits: each rank stores only 1/N of the model's weights in host memory (via mmap-backed loading that shares one OS page-cache copy instead of N private copies, cutting cold-start memory 73% in their measurement), and reconstructs each layer's full weights on-device just before it's needed via an AllGather collective, double-buffered so the next layer's weights transfer while the current layer computes.",
              "A follow-on optimization batches multiple different requests across data-parallel ranks during that same AllGather step, since the weight-gathering is request-independent, yielding a measured 3.3x throughput gain (about 83% of ideal 4x scaling) from running 4 concurrent requests instead of 1.",
            ],
            impact: [
              "This is a memory-engineering technique specifically for teams serving large diffusion/video-generation models that don't fit on one device, trading some AllGather communication overhead (measured at about 150ms/step) for dramatically lower host RAM requirements. The reported numbers are honestly scoped: correctness was verified by byte-identical output hashes across strategies, the topology study on 8-GPU MiniMax-H3 explicitly found that the best DLO configuration is workload-dependent (AllGather wins at low data-parallelism, rank-local sharding wins at high data-parallelism), and the 200B-parameter extrapolation is explicitly labeled as unvalidated at that scale.",
              "For LLM-focused teams this is less directly applicable than the RL/agentic items above, but it's a relevant data point for anyone whose stack also serves multimodal generation models alongside text models on shared infrastructure.",
            ],
            source: { label: "vLLM Blog: Distributed Layerwise Offload", url: "https://vllm.ai/blog/2026-08-17-distributed-layerwise-offload" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether Qwen's own hosted Qwen Cloud endpoint for Qwen3.8-27B (promised \"1M context length by default, official built-in tools\") launches, and how it's priced relative to the $0.40-0.45 / $3-3.20 per-Mtok rates already live through third-party providers.", source: { label: "OpenRouter: Qwen3.8 27B", url: "https://openrouter.ai/qwen/qwen3.8-27b" } },
      { text: "Whether vLLM publishes the Kimi K3 Decode Context Parallelism benchmark it has now described as \"in progress\" for multiple consecutive weeks.", source: { label: "vLLM Blog: Decode Context Parallelism", url: "https://vllm.ai/blog/2026-08-07-decode-context-parallelism" } },
      { text: "Whether OpenAI's promised September 2026 white paper on Private Safety Processing discloses enough of the flagging mechanism for practitioners to independently assess the privacy/safety tradeoff, given this week's post left those specifics undefined.", source: { label: "OpenAI: Zero Data Retention for frontier models", url: "https://openai.com/index/offering-zero-data-retention-for-frontier-models/" } },
    ],
  },
  {
    date: "2026-08-16",
    range: "August 10 to August 16, 2026",
    tldr: [
      "Three major open-weight releases landed this week, all with day-0 vLLM support: Qwen3.8-27B (Aug 14, Apache 2.0, native vision-language, beats Muse Glimmer-30B and Qwen3.6-27B on most agentic/coding benchmarks per Qwen's own comparison table), Meta's Muse Glimmer (Aug 10, 30B Apache-2.0 local-agent model with a bundled DFlash speculative decoding drafter), and NVIDIA's Nemotron 3.5 Lightning (Aug 11, 30B-A3B open weights paired with NeMo Switchyard, an open-source multi-model router already adopted by LangChain, Ramp, and Cognition).",
      "Watchlist resolution. Qwen3.8-Max's open-weights promise landed on schedule (Aug 12) but underdelivered: the 2.4T-A95B flagship checkpoint is text-only, always-thinking, and released under a new revenue-share license rather than Apache-2.0. Two days later Qwen shipped the smaller Qwen3.8-27B under the license practitioners actually wanted — full Apache 2.0, native vision-language, thinking toggle included — and it beats the flagship's own sibling, Muse Glimmer-30B, on most benchmarks. vLLM's promised Kimi K3 DCP benchmarks are still \"in progress,\" unchanged from last week. MoonEP remains frozen at its original single commit with zero external contributors, two-plus weeks after release.",
      "vLLM shipped DSpark adaptive verification (Aug 14): instead of a fixed speculative-decoding draft length, the scheduler now sizes the verification budget per step from a confidence head's survival-probability scores, holding the throughput/latency Pareto frontier across the full concurrency range from 1 to 256 with one configuration.",
      "Two RL/inference papers worth the read this week: I-SDPO (Aug 13) fixes GRPO's dead-signal problem when every sampled rollout in a group fails, by routing only those groups to a self-distillation objective instead of applying it throughout training; DARTree (Aug 13) extends a pretrained AR correction head from single draft chains to full trees for diffusion-style speculative drafters, for up to 9.73x lossless speedup.",
      "A useful negative result: a paper this week derives the mathematically optimal RoPE-aligned rotation for 4-bit KV-cache quantization, implements it correctly, and shows it still loses to a plain full-head Hadamard transform — because the theoretical optimum doesn't match what the actual dynamic quantizer uses to set its scale.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "I-SDPO: fixing GRPO's blind spot when every rollout in a group fails",
            whatsNew: [
              "arXiv 2608.12957 (Yubo Zhang, Xinhong Ma, Zezhong Tan, Ziqiang Dong), submitted August 13, 2026. Introduces I-SDPO (Instance-Level Adaptive Self-Distillation Policy Optimization), a GRPO variant that routes each rollout group to either ordinary GRPO or a privileged self-distillation objective, decided once per instance from whether any sampled response in that instance's group succeeded. On SciKnowEval, I-SDPO raises mean@16 accuracy from 56.67% under plain GRPO to 70.31%, with a maximum domain gain of 18.24 points, and gets the best result in all four tested scientific domains.",
            ],
            howItWorks: [
              "GRPO (Group Relative Policy Optimization, the critic-free RL method behind DeepSeek-R1-style training) computes its training signal from the spread of rewards within a sampled rollout group. If every response in the group is wrong, all rewards are equal and GRPO has no relative signal to learn from on that instance — a known blind spot for RLVR (reinforcement learning with verifiable rewards) on hard problems.",
              "Privileged self-distillation can fill the gap with dense token-level supervision from a stronger teacher, but the paper shows this creates a second failure mode: the teacher is a biased, low-variance stand-in for the true reward objective, so leaning on it after the policy has already learned to succeed on an instance can actively fight reward-improving updates. The paper's local analysis derives an \"optimization bias floor\" that a non-vanishing, biased distillation weight induces once the policy is capable.",
              "I-SDPO's fix is a routing rule computed once per instance and shared across that instance's whole rollout group: all-incorrect groups get the self-distillation objective (since GRPO has nothing to work with there anyway), any-success groups stay on ordinary GRPO untouched. Because the teacher is only used where GRPO is blind, and the expected distillation rate automatically falls as the policy's own success probability rises, there is no hand-designed schedule to tune.",
            ],
            impact: [
              "This is a targeted, checkable fix rather than a new training pipeline. If GRPO or RLVR runs plateau specifically on hard subsets where the policy rarely succeeds, that is the exact all-incorrect-group blind spot this paper describes, and I-SDPO is a routing-level change on top of an existing GRPO setup. The reported gains (56.67% to 70.31% mean@16, up to 18.24 points in the best domain) are on SciKnowEval, a scientific-domain benchmark, so effect sizes elsewhere are unverified.",
              "The routing mechanism — an instance-level switch between GRPO and self-distillation gated on whether the rollout group has any success — is general enough to test against other sparse-reward RLVR setups, particularly agentic or tool-use tasks where early-training success rates on hard instances can be very low.",
            ],
            source: { label: "arXiv:2608.12957", url: "https://arxiv.org/abs/2608.12957" },
          },
          {
            title: "DARTree: extending speculative-decoding correction from chains to trees for diffusion drafters",
            whatsNew: [
              "arXiv 2608.13524 (Tianyi Li, Yaxin Luo, Xinyi Shang, Zhiqiang Shen), submitted August 13, 2026. DARTree is a training-free speculative decoding method that takes a pretrained autoregressive (AR) correction head — previously usable only along a single draft chain — and extends it to score and prune a whole tree of draft candidates.",
              "Across seven math, code, and chat benchmarks, DARTree achieves the highest average accepted length and speedup in all four tested model/temperature configurations, accepting up to 12.97 tokens per verification round (98.6% more than DFlash and 27.9% more than Domino under the same settings), for up to 9.73x lossless speedup over locally measured autoregressive decoding.",
            ],
            howItWorks: [
              "Diffusion-based drafters propose a whole block of draft tokens in parallel rather than one at a time, which is fast but has a correctness cost: each position's predicted distribution is marginal (computed independently), not conditioned on which tokens were actually selected earlier along that specific draft path. Prior work fixed this with an AR correction head that re-scores a draft chain causally, but only along one sequential path, so it does not help when exploring several candidate continuations (a tree) at once.",
              "DARTree extends that correction from chains to trees in two decoupled steps: it first expands and scores every candidate node at each depth of a fixed-width tree in a single batched pass — so the expensive AR-head inference stays parallel rather than becoming a sequential loop over branches — and only then applies best-first pruning to select which branches actually get sent to the target model for verification. Decoupling the batched scoring from the sequential pruning is what lets the method scale to trees without paying tree-shaped inference cost.",
            ],
            impact: [
              "The method is training-free — it reuses an existing pretrained AR correction head rather than requiring a new drafter — so it is a serving-side change for teams already running diffusion-style speculative drafters, not a retraining project. The headline numbers (up to 12.97 accepted tokens per verification round, beating DFlash and Domino by double- to triple-digit percentages) translate directly into fewer expensive target-model forward passes per generated token.",
              "For anyone benchmarking speculative decoding configurations against DSpark, DFlash, or Domino — all three referenced elsewhere in this digest — DARTree is a fourth data point worth adding, particularly where the serving stack already uses a diffusion-style drafter.",
            ],
            source: { label: "arXiv:2608.13524", url: "https://arxiv.org/abs/2608.13524" },
          },
          {
            title: "A quantization technique that should work on paper doesn't: RoPE-aligned rotations for 4-bit KV cache",
            whatsNew: [
              "arXiv 2608.13365 (Shuhan Wang, Yilin Luo, Nan Xu, Chi Wang Cheung), submitted August 13, 2026. The paper derives the mathematically optimal rotation for aligning a quantization-friendly transform with RoPE's frequency-pair structure, verifies the implementation attains its own analytic minimum, then tests it in a dynamic W4A4KV4 setting (4-bit weights, activations, and KV cache) and finds it increases perplexity relative to a standard full-head Hadamard rotation, across four checkpoints and both short and long context lengths.",
            ],
            howItWorks: [
              "Rotation-based post-training quantization applies an orthogonal transform to spread outlier values across channels before rounding to low bit-widths, reducing quantization error. The common approach rotates across an entire attention head; RoPE (rotary position embedding, the mechanism most modern LLMs use to encode token position) instead operates on two-dimensional frequency pairs within each head, so the paper asks whether a rotation respecting that pair structure — rather than mixing the whole head — could do better.",
              "The authors derive the rotation angle that is provably optimal for minimizing channel variance under a theoretical surrogate (a pooled, position-averaged calibration covariance) and confirm their implementation hits that analytic minimum. It still loses to the plain full-head Hadamard transform. Their diagnosis: the theoretical surrogate the rotation was optimized for measures something different from what the actual dynamic quantizer uses to set its step size (a per-token group range), and the pairwise rotation only mixes two channels at a time versus the full head.",
              "As the paper interpolates from two-channel to full-head mixing, quantization error and perplexity degradation both shrink — the narrower, more \"targeted\" transform is the worse choice specifically because it is narrower.",
            ],
            impact: [
              "This is a caution against assuming a theoretically-motivated transform will translate into practice without checking it against the quantizer's actual scale-setting statistic, not just an abstract error bound.",
              "Teams building or evaluating custom rotation schemes for KV-cache or activation quantization (a live area given NVFP4/MXFP4 adoption elsewhere in this digest) get a concrete lesson: validate any structured-surrogate optimum against the quantizer's real calibration statistic before shipping it, since \"provably optimal for the surrogate\" was demonstrated here to not imply \"better in production.\" Teams already using a full-head Hadamard for W4A4KV4 or similar dynamic quantization have a documented reason not to switch to a narrower RoPE-paired variant without re-validating on their own checkpoints.",
            ],
            source: { label: "arXiv:2608.13365", url: "https://arxiv.org/abs/2608.13365" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "Qwen3.8's two-track open release: a restrictive 2.4T flagship, then a fully open 27B that beats it",
            whatsNew: [
              "Alibaba's Qwen team published Qwen3.8-2.4T-A95B — the open-weights checkpoint behind Qwen3.8-Max — on Hugging Face on August 12, 2026, fulfilling last week's \"week of August 10\" promise and marking the first Qwen-Max-class model released as open weights.",
              "It is not a full mirror of the hosted API: it is text-only, always runs in thinking mode (thinking cannot be disabled), and ships under a new \"qwen3.8-max\" license rather than Apache-2.0. Two days later, on August 14, Qwen released Qwen3.8-27B: a 27B dense, native vision-language model, fully Apache 2.0 licensed, with thinking mode on by default but toggleable per request.",
              "On Qwen's own published benchmark table, Qwen3.8-27B beats Muse Glimmer-30B (Meta's local-agent release, also covered this week) and Qwen3.6-27B on the large majority of coding, agentic, and multimodal benchmarks tested, including SWE-bench Pro (61.7 vs Muse Glimmer's 51.2), OSWorld-Verified computer use (84.3 vs 65.9), and AndroidWorld (81.9 vs Opus4.6 Max's 62.0).",
            ],
            howItWorks: [
              "The 2.4T-A95B flagship is a 2.4-trillion-parameter, 95-billion-active-parameter Mixture-of-Experts (MoE, where each token is routed to a small subset of expert sub-networks rather than the whole model) with a hybrid architecture: 92 layers arranged as repeating blocks of three Gated DeltaNet (a linear-attention variant with constant, non-growing recurrent state) layers followed by one full Gated Attention layer, each paired with its own MoE block, with native 262K context extensible to just over 1M tokens.",
              "The hosted Qwen3.8-Max API adds vision input, non-thinking mode, and a default 1M-token context on top of this open checkpoint — none of which ship in the open release, a distinction the model card states directly. Qwen3.8-27B uses the same hybrid Gated-DeltaNet/Gated-Attention layout at a much smaller dense scale (64 layers, no MoE), adds a native vision encoder for image and video understanding, and — unlike the flagship — lets callers disable thinking mode per request via enable_thinking: False.",
              "Licensing differs sharply between the two: qwen3.8-max is a new license requiring copyright-notice retention, in-product model-name attribution for large-scale deployments (over 100M monthly active users or $20M monthly revenue), and a separate commercial license above $50M annual revenue for model-as-a-service businesses; Qwen3.8-27B carries none of those restrictions.",
            ],
            impact: [
              "For teams that were waiting on \"open weights coming next week\" to plan a self-hosting migration off the API, the honest read is two different stories landing two days apart. The 2.4T flagship delivers Max-class reasoning and coding capability self-hosted, but not the full hosted product, and under a materially more restrictive license than Qwen's usual Apache-2.0 releases — read the qwen3.8-max license's revenue thresholds directly before committing production traffic to it.",
              "The 27B dense model is the more practically interesting release for most teams: fully open, natively multimodal, deployment-friendly at 55.6GB in BF16, and it beats Meta's same-week Muse Glimmer-30B release on the majority of head-to-head benchmarks Qwen published. Day-0 vLLM support shipped for both (BF16/FP8 plus NVFP4/MXFP4 quantized weights, kernels co-developed for NVIDIA and AMD), so the serving path is ready for either.",
            ],
            source: { label: "Qwen3.8-2.4T-A95B model card", url: "https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B" },
          },
          {
            title: "Meta ships Muse Glimmer, a 30B local-agent model with a built-in speculative decoding drafter",
            whatsNew: [
              "Meta Superintelligence Labs released Muse Glimmer on August 10, 2026: a 30-billion-parameter model open-sourced under Apache 2.0 and built for always-on local agent workloads (function calling, local coding, LLM-as-judge evaluation) on a single consumer GPU or Mac. It is distilled from Meta's larger proprietary Muse Spark via logit distillation, then mid-trained on longer-context agentic data and post-trained with a mix of supervised fine-tuning, on-policy distillation, and reinforcement learning.",
            ],
            howItWorks: [
              "At full precision a 30B model needs over 55GB of memory, more than any consumer GPU offers; Meta quantizes the weights to roughly 4-bit precision to shrink the language model itself to under 20GB, leaving headroom in a 24-32GB budget for the KV cache, a perception encoder for image input, and a speculative decoding drafter to run at the same time.",
              "That drafter is based on DFlash (a block-diffusion-style drafter that proposes multiple tokens per pass, the same drafter family referenced elsewhere in this digest), shipped in quantized form to keep its own footprint small. Meta reports the DFlash drafter increases decode speed by 3.1x on an RTX 5090, 1.8x on a MacBook M5 Max, and 1.5x on an M4 Max, measured with the quantized K-Quant-17GB model.",
              "The model is evaluated on agentic benchmarks including tau-Bench, SWE-Bench, and an internal MCP-Atlas suite, and is built to work across orchestration scaffolds including OpenClaw.",
            ],
            impact: [
              "This is a full local-agent stack in one release, not just a model: quantization numbers, a bundled speculative decoding drafter, and measured speedups on named consumer hardware give practitioners concrete numbers to plan a local deployment against, rather than a generic \"runs on consumer GPUs\" claim. Apache 2.0 licensing — versus Qwen3.8-Max's new revenue-share license, released two days earlier — makes it a cleaner default for teams that want an unencumbered locally-deployable agent model, though on Qwen's own published benchmarks this week, the similarly-sized Qwen3.8-27B outperforms it on most tasks.",
              "Integrations with llama.cpp, MLX, and ExecuTorch were still \"landing in the coming days\" as of release, so day-0 support is via Hugging Face Transformers and vLLM/SGLang for server-side serving; edge-framework support is a near-term item to track.",
            ],
            source: { label: "Meta AI Research: Introducing Muse Glimmer", url: "https://research.meta.ai/blog/introducing-muse-glimmer-open-agentic-model" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "vLLM makes speculative decoding budget itself: DSpark's confidence-scheduled verification",
            whatsNew: [
              "vLLM published \"Adaptive Verification in vLLM: DSpark confidence-scheduled verification\" on August 14, 2026, landing as enable_adaptive_verification in PR #47808. Instead of fixing num_speculative_tokens (how many draft tokens to verify per step) to one value for a whole deployment, vLLM now sizes the verification budget per step from DSpark's confidence head, keeping speculative decoding on the throughput/latency Pareto frontier from concurrency 1 through 256 with a single configuration.",
            ],
            howItWorks: [
              "Speculative decoding trades decode steps for extra compute: a cheap drafter proposes several tokens, the expensive target model verifies them in parallel, and every rejected draft token is wasted compute.",
              "At batch size 1 the GPU has spare compute anyway, so an aggressive draft is nearly free; at batch size 256 draft tokens compete directly with real tokens for the same compute, and the post reports the last token of a 7-token DSpark draft block survives verification less than 10% of the time on DeepSeek-V4-Pro (versus over 70% for the first token), making a fixed-length draft an increasingly bad trade as load rises.",
              "DSpark already scores each drafted token's survival probability with a learned confidence head; vLLM's new scheduler turns those per-token scores into a global top-B selection each step (B tokens chosen by survival probability across all requests in the batch, not per request), sized by maximizing expected tokens generated per unit of step time using a cost model profiled at startup from real CUDA graph shapes.",
              "The selection runs on CPU while the GPU finishes the previous step, and a new varlen decode CUDA graph — one graph shape serving any mix of 1 to num_speculative_tokens+1 tokens per request — makes the resulting variable-length verification batches cheap to execute.",
            ],
            impact: [
              "The practical win is removing a tuning knob: instead of picking num_speculative_tokens per deployment and re-tuning as load or workload shifts, adaptive verification stays on the Pareto frontier automatically across the full concurrency range vLLM tested, matching a long fixed draft's benefit at low concurrency and a short fixed draft's benefit at high concurrency without knowing in advance which regime you are in. It currently requires DSpark's sparse-MLA/sparse-SWA/indexer attention backends on SM100 (Blackwell) hardware, and is incompatible with --enforce-eager, LoRA, pipeline parallelism, and output logprobs.",
              "For teams already running DSpark on Blackwell, this is close to a free \"on-by-default\" upgrade per the vLLM team's own framing; for everyone else it previews where speculative-decoding scheduling is headed as adaptive, confidence-driven budgets replace static configuration.",
            ],
            source: { label: "vLLM: Adaptive Verification / DSpark confidence-scheduled verification", url: "https://vllm.ai/blog/2026-08-14-dspark-adaptive-verification" },
          },
          {
            title: "NVIDIA ships a routing library alongside a purpose-built small model for it: NeMo Switchyard and Nemotron 3.5 Lightning",
            whatsNew: [
              "NVIDIA released Nemotron 3.5 Lightning (a 30B open MoE model with 3B active parameters) and NeMo Switchyard (an open-source model-routing library for multi-model agent systems) together on August 11, 2026. Lightning is built for the high-volume, specialized-task layer inside larger multi-agent systems; NVIDIA reports up to 4x output speed versus similar-sized models and 30% faster task completion than Qwen3.6-35B at comparable accuracy. Switchyard already has reported integrations or evaluations from LangChain, Cognition (Devin Desktop), Ramp, LiteLLM, Nous Research, Boomi, Cadence, Classmethod, Kong, and Siemens.",
            ],
            howItWorks: [
              "The framing is \"systems of models\": rather than one frontier model handling everything, a larger reasoning model (Nemotron 3 Ultra or similar) plans and orchestrates, while smaller specialized models like Lightning execute narrow, repeated tasks (code review, tool calls, billing questions) more cheaply. Lightning keeps the hybrid Mamba-Transformer architecture and compact size from the earlier Nemotron 3 Nano but with substantial agentic-performance gains, and ships alongside an RL dataset (Nemotron-RL-Agentic-Terminal-Pivot) used in its own post-training, released for reuse.",
              "NeMo Switchyard is the piece that decides, per step of an agent workflow, which model in a developer's mix (open, proprietary, or NVIDIA) actually handles a given request, tunable toward quality, latency, or cost priorities without requiring the application to be rewritten around a specific model. NVIDIA's own internal benchmark shows Switchyard holding frontier-level accuracy while cutting task cost to roughly a third of running Opus 4.8 alone.",
            ],
            impact: "The individually reported adoption numbers are the more interesting artifact, since they are independent measurements from separate teams applying Switchyard to their own workloads rather than NVIDIA's own benchmark suite: LangChain reports 74% lower cost across 145 multi-turn Deep Agents tasks by routing only 7% of calls to a frontier model (at a 6% accuracy tradeoff); Ramp reports matching frontier performance on SWE-Bench while cutting cost 58% and runtime 33%; Cognition reports a 28% mean cost reduction integrating Switchyard into Devin Desktop; Boomi reports 100% domain-routing accuracy while sending 59% of traffic to a faster fine-tuned model. For teams running multi-model agent stacks with ad hoc or hand-rolled routing logic today, Switchyard is a maintained, open-source alternative with real production numbers behind it rather than a research prototype, and Lightning is a concrete, open, benchmarkable option for the \"cheap specialized model\" role in that router.",
            source: { label: "NVIDIA: Nemotron 3.5 Lightning and NeMo Switchyard", url: "https://blogs.nvidia.com/blog/nemotron-lightning-switchyard-rtx-dgx/" },
          },
        ],
      },
    ],
    watching: [
      { text: "Whether Qwen3.8-27B's promised hosted API service — which the model card says will add \"1M context length by default, official built-in tools\" and is \"coming soon\" — actually launches, and at what price relative to Qwen3.8-Max's $2/$6 per Mtok.", source: { label: "Qwen3.8-27B model card", url: "https://huggingface.co/Qwen/Qwen3.8-27B" } },
      { text: "Whether Meta ships the promised llama.cpp, MLX, and ExecuTorch integrations for Muse Glimmer \"in the coming days,\" which would be the first edge-framework path for the model beyond server-side vLLM/SGLang/Transformers.", source: { label: "Meta AI Research: Introducing Muse Glimmer", url: "https://research.meta.ai/blog/introducing-muse-glimmer-open-agentic-model" } },
      { text: "Whether vLLM publishes the Kimi K3 Decode Context Parallelism benchmarking it has now described as \"in progress\" for three consecutive weeks, and whether the GLM-5.2 DCP extension lands as a follow-up post.", source: { label: "vLLM: Decode Context Parallelism", url: "https://vllm.ai/blog/2026-08-07-decode-context-parallelism" } },
    ],
  },
];
