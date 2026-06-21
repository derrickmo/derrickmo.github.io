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
    date: "2026-06-21",
    range: "June 15 to June 21, 2026",
    tldr: [
      "DFlash + Spec V2 is now the default speculative decoding engine in SGLang (Z Lab / Modal / SGLang, Jun 15). Block diffusion drafting plus KV injection hits >4.3x baseline throughput and 1.5x native MTP at concurrency 1 on Qwen 3.5 397B (HumanEval, 8xB200); the V2 overlap scheduler alone adds +33% (11.4 to 15.3 ktok/s, Qwen 3-8B, B200, concurrency 32).",
      "MiniMax Sparse Attention (MSA), arXiv 2606.13392, submitted Jun 11 and verified across the field this week. Two-branch block-sparse attention on GQA cuts per-token attention compute 28.4x at 1M context while matching dense GQA; co-designed kernel gives 14.2x prefill and 7.6x decode speedups on H800. Kernel open-sourced; powers MiniMax-M3.",
      "Model panels (Fusion) are becoming a live serving pattern. vLLM Semantic Router shipped a programmable Fusion routing primitive (Jun 16); OpenRouter's launch (Jun 12) reported a fused Fable 5 + GPT-5.5 panel at 69.0% on Perplexity's DRACO deep-research benchmark vs 65.3% solo Fable 5, with a budget panel within 1% of Fable 5 at ~half the cost.",
      "Watchlist resolution: Kimi K2.7's 30% reasoning-token claim is partially debunked (token cut holds, but practitioner tests report no capability gain and a KernelBench-Hard regression); EvoMem transfer gains saw no new primary and remain open; Claude Fable 5 pricing still holds.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "MiniMax Sparse Attention (MSA): block-sparse long-context attention with a co-designed kernel",
            whatsNew: "MiniMax (Xunhao Lai et al., arXiv 2606.13392) introduces MSA, a blockwise sparse attention built on Grouped Query Attention. The paper was submitted Jun 11, just before this week's window, but it was independently verified and widely analyzed this week and is the most significant long-context method the field engaged with, so it is included with that date noted. The inference kernel is open-sourced and the technique powers the production MiniMax-M3 model.",
            howItWorks: "MSA factors attention into two branches. A lightweight Index Branch scores key-value blocks and independently selects a Top-k subset of blocks per GQA group (GQA = multiple query heads share one KV head, giving group-specific sparse retrieval while keeping block-level execution efficient). The Main Branch runs exact softmax attention over only the selected blocks, so it is sparse in which blocks are read but exact within them. Unlike methods that compress the KV cache, MSA keeps KV uncompressed to preserve long-context retrieval accuracy, trading slightly higher memory for fidelity. To turn sparsity into real speedups, the GPU path uses exp-free Top-k selection (avoids the expensive exponential in index scoring) and a KV-outer sparse attention layout to keep tensor cores utilized under block-granular access.",
            impact: "On a 109B-parameter natively-multimodal MoE, MSA matches dense GQA quality while cutting per-token attention compute by 28.4x at 1M-token context. With the co-designed kernel that becomes 14.2x prefill and 7.6x decode wall-clock speedups on H800. For teams serving long-context agentic or repo-scale workloads, this is a deployable path to 1M context without the quadratic blowup, and because the kernel is open (github.com/MiniMax-AI/MSA) and the design is simple (GQA plus block Top-k) it is portable across GPUs rather than vendor-locked. The H800 numbers matter for teams on export-restricted hardware.",
            source: { label: "arXiv 2606.13392", url: "https://arxiv.org/abs/2606.13392" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "Model panels (Fusion) move from research idea to a production serving primitive",
            whatsNew: "Within a week, two primary sources made multi-model Fusion a real serving pattern. OpenRouter launched a Fusion API (Jun 12) that sends one request to a panel of models in parallel and synthesizes one answer, with a benchmark report. vLLM Semantic Router followed with its own Fusion primitive (Jun 16) that makes the panel-judge-synthesis flow a programmable, policy-controlled, traceable routing decision inside an open self-hostable router rather than a hosted black box. OpenRouter's post is dated Jun 12, just before this window; the vLLM-SR post is in-window and treats it as the external signal.",
            howItWorks: "A panel of models each answer the prompt independently (with web search and fetch enabled). A judge model reads all answers and produces structured analysis: consensus, contradictions, partial coverage, unique insights, blind spots. A final synthesis call writes one user-facing answer grounded in that analysis. vLLM-SR adds a control plane: signals describe the request, decisions choose whether a request even deserves a Fusion route (it is expensive, 2-3x normal latency), and the router records which models ran plus token accounting. It exposes three entry modes (auto routing, Fusion-only, per-request plugin override) and returns an OpenAI-compatible response while giving operators the full trace.",
            impact: "On Perplexity's DRACO deep-research benchmark (100 tasks, 10 domains, ~39 weighted criteria with negative weights for errors), OpenRouter reported a fused Fable 5 + GPT-5.5 panel (synthesized by Opus 4.8) at 69.0% vs 65.3% for solo Fable 5; a budget panel of Gemini 3 Flash + Kimi K2.6 + DeepSeek V4 Pro hit 64.7%, within 1% of solo Fable 5 at roughly half the cost. Fusing Opus 4.8 with itself scored 65.5% vs 58.8% solo (+6.7 points), showing much of the lift comes from the synthesis step, not just model diversity. Practical gotcha worth copying: when panel models had web access they surfaced the DRACO grading rubric online, so OpenRouter had to exclude those domains before final runs (pass excluded_domains / blocked_domains in your own evals). Takeaway: panels are a real quality lever for hard research-style queries but only worth the latency on requests that need it, which is exactly the routing decision vLLM-SR is built to make.",
            source: { label: "vLLM SR Fusion (Jun 16)", url: "https://vllm.ai/blog/2026-06-16-vllm-sr-fusion-api" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "DFlash + Spec V2: SGLang's new default speculative decoding engine",
            whatsNew: "Z Lab, Modal, and the SGLang team shipped DFlash, a block-diffusion speculative decoding method, integrated into SGLang's new V2 speculative decoding engine, now the default (LMSYS blog, Jun 15). They also released DFlash draft models for Qwen 3.5 397B-A17B on Hugging Face (z-lab, modal-labs, lmsys orgs).",
            howItWorks: "Speculative decoding uses a small fast draft model to propose multiple tokens the target model verifies in parallel, with no quality change. Prior methods (EAGLE series, native MTP heads in Gemma 4 / DeepSeek-V4) still draft autoregressively, one token at a time, which underuses the GPU. DFlash drafts a whole block of tokens in one forward pass via a lightweight block-diffusion model (MTP = multi-token prediction; block diffusion = denoise a block of positions jointly instead of left-to-right). Its key trick is KV injection: it extracts the target model's hidden representations of the context and injects them directly into every draft layer's KV cache, so the small drafter stays conditioned on the target's context at depth and produces higher-acceptance drafts. Spec V2 adds an overlap scheduler that hides host-device sync: host-side cleanup and KV allocation for batch N overlap with GPU work on batch N-1.",
            impact: "On Qwen 3.5 397B-A17B (BF16, HumanEval, greedy, thinking on, 8xB200), DFlash hits >4.3x baseline throughput and 1.5x native MTP at concurrency 1, and beats native MTP across GSM8K/HumanEval/MT-Bench from concurrency 1 to 32. Ablations on Qwen 3-4B show why: a 5-layer DFlash drafter matches a 5-layer EAGLE-3 drafter on acceptance length (4.2 vs 4.2 on GSM8K) but delivers higher end-to-end speedup (3.3x vs 2.1x) because parallel drafting is much cheaper; KV injection alone lifts acceptance length to 4.8 on GSM8K. The Spec V2 overlap scheduler adds +33% on its own (11.4 to 15.3 ktok/s, Qwen 3-8B, single B200, concurrency 32). For anyone serving large MoE models this is a drop-in default that cuts latency and cost, and you can train a DFlash drafter for your own target since the block-diffusion-plus-KV-injection recipe is target-agnostic.",
            source: { label: "LMSYS DFlash + Spec V2 (Jun 15)", url: "https://www.lmsys.org/blog/2026-06-15-next-generation-speculative-decoding-dflash-v2/" },
          },
        ],
      },
    ],
    watching: [
      {
        text: "Whether SGLang's >4.3x DFlash throughput and the +33% Spec V2 overlap-scheduler gain reproduce in third-party benchmarks on target models beyond Qwen 3.5 397B, and whether DFlash drafters trained on other targets land in the wild.",
        source: { label: "LMSYS DFlash + Spec V2", url: "https://www.lmsys.org/blog/2026-06-15-next-generation-speculative-decoding-dflash-v2/" },
      },
      {
        text: "Whether MSA's 14.2x prefill / 7.6x decode H800 speedups reproduce in third-party serving stacks (vLLM, SGLang) using the open kernel, rather than only MiniMax's own deployment.",
        source: { label: "MiniMax MSA kernel", url: "https://github.com/MiniMax-AI/MSA" },
      },
      {
        text: "Whether a larger public eval confirms model panels beat the best single model beyond DRACO; vLLM-SR explicitly says a broader Fusion-vs-single-model-vs-frontier-panel eval is still owed.",
        source: { label: "vLLM SR Fusion", url: "https://vllm.ai/blog/2026-06-16-vllm-sr-fusion-api" },
      },
    ],
  },
  {
    date: "2026-06-14",
    range: "June 8 to June 14, 2026",
    tldr: [
      "Claude Fable 5 (Anthropic, Jun 9): General-availability Mythos-class reasoning model. 1M context, 128k output tokens, multimodal (text/image/files). Safeguards divert some topics to Opus 4.8. Pricing $10/$50 per Mtok.",
      "Kimi K2.7 Code (Moonshot AI, Jun 12): Open-weight agentic coding model, 1T params (32B active, 384 experts), 256K context. Reduced reasoning tokens by 30% vs K2.6 while gaining +21.8% on Kimi Code Bench v2, addressing compute cost of test-time reasoning.",
      "i1: A Simple and Fully Open Recipe for Strong Text-to-Image Models (Princeton, Jun 9): 3B-param diffusion model competitive with closed frontiers. 300+ controlled experiments (700K TPU v6e hours) reveal empirical findings (equal-weight dataset mixing, larger text-encoder adapters). Fully open-sourced training code and data.",
      "EvoArena: Tracking Memory Evolution for Robust LLM Agents in Dynamic Environments (Jun 11): Benchmark suite for agents in changing environments (terminal/software/social domains). Proposes EvoMem patch-based memory. Current agents baseline 39.6% accuracy; EvoMem lifts by 1.5-6.1% across benchmarks.",
      "vLLM v0.23.0 shipped June 13, 2026; feature details not yet disclosed.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later. Primary sources here are arXiv and official lab pages.",
        items: [
          {
            title: "i1: A Simple and Fully Open Recipe for Strong Text-to-Image Models",
            whatsNew: "Princeton researchers (Zhuang Liu, Boya Zeng, et al., arXiv 2606.11289, submitted Jun 9) systematically investigate text-to-image diffusion modeling and data choices via 300+ controlled experiments totaling 700K+ TPU v6e hours, then open-source the full training recipe (code, weights, data, pipeline) for a 3B-parameter model.",
            howItWorks: "The team trains i1 using only public datasets (no proprietary data) and measure on five benchmarks (GenEval, DPG-Bench, PRISM, CVTG-2K, LongText-Bench). Key empirical findings: equal weighting is a strong default for mixing curated datasets (no need for learned blend ratios), and larger text-encoder adapters (few added parameters) improve quality more than scaling the core diffusion model. The inference recipe and training hyperparameters are published.",
            impact: "i1 matches closed frontier models on benchmark averages and outperforms the best existing fully open model by 29.5 percentage points. For practitioners training diffusion models on limited compute, the ablation results (which design choices matter most, which don't) and the reproducible recipe lower the barrier to customizing models for domain-specific tasks. The open training pipeline (data processing, training loops, inference) means no opaque secret sauce, enabling research iteration.",
            source: { label: "arXiv 2606.11289", url: "https://arxiv.org/abs/2606.11289" },
          },
          {
            title: "EvoArena: Tracking Memory Evolution for Robust LLM Agents in Dynamic Environments",
            whatsNew: "MIT-led team (Jundong Xu, et al., arXiv 2606.13681, submitted Jun 11) introduces EvoArena, a benchmark suite that models environment changes as sequences of progressive updates (e.g., software versions, changing tool APIs, updated instructions) and proposes EvoMem, a patch-based memory paradigm that tracks memory changes as structured update histories.",
            howItWorks: "Standard agent benchmarks assume a static environment. EvoArena generates three environments (terminal commands, software tools, social preferences) with time-series updates that reflect real-world drift. EvoMem records agent memory as a sequence of fine-grained patches (e.g., user prefers dark mode now set to true) rather than rewriting the full memory on every update, making rollback and audit trails cheaper. The agent can replay memory to reason about causality in environment changes.",
            impact: "Current SOTA agents (Claude Opus 4.8, GPT-5.5, etc.) achieve only 39.6% average accuracy on EvoArena, revealing a real gap. EvoMem consistently improves performance by 1.5% on EvoArena itself and transfers well: +6.1% on GAIA, +4.8% on LoCoMo, showing the memory structure generalizes beyond the benchmark. For anyone building long-horizon agents that outlive their training data distribution, memory versioning and explicit environment-change awareness move from nice-to-have to required.",
            source: { label: "arXiv 2606.13681", url: "https://arxiv.org/abs/2606.13681" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas. Primary sources are vendor announcements and the original engineering threads.",
        items: [
          {
            title: "Claude Fable 5: General Availability of Mythos-Class Reasoning",
            whatsNew: "Anthropic released Claude Fable 5 to the public on June 9, 2026, making a Mythos-class frontier reasoning model generally available. Available on the Claude API, AWS Bedrock, Google Vertex AI, and Microsoft Azure Foundry.",
            howItWorks: "Fable 5 is trained with safeguards that redirect some topics (e.g., illicit drugs, election-specific political tactics) to Claude Opus 4.8 instead of refusing the request. It supports 1 million token context window, 128,000 max output tokens, and multimodal input (text, image, PDF, file upload). Knowledge cutoff is January 2026. The model is post-trained for long-running, multi-step tasks with planning, verification loops, and tool use.",
            impact: "Practitioners can now deploy frontier reasoning capabilities in production without running a private instance. Concretely: 95% on SWE-bench Verified, 80% on SWE-bench Pro (coding tasks). At $10 per million input / $50 per million output tokens, the pricing is 2x-5x cheaper than running the top private models on the same benchmarks. The multimodal+vision capability (tables, diagrams in PDFs) unlocks document-heavy workflows (finance, legal, architecture) that were previously friction points. Safeguard design (redirect, not refuse) may reduce complexity in downstream compliance logic.",
            source: { label: "Anthropic", url: "https://www.anthropic.com/news/claude-fable-5-mythos-5" },
          },
          {
            title: "Kimi K2.7 Code: Agentic Coding Model with Reasoning Token Efficiency",
            whatsNew: "Moonshot AI released Kimi K2.7 Code, an open-weight 1-trillion-parameter agentic coding model on Hugging Face under Modified MIT license (Jun 12 2026). 32B active parameters via 384 sparse experts (mixture-of-experts), 256K context window.",
            howItWorks: "Built on Kimi K2.6 with improved instruction following, long-horizon coding task completion, and a different post-training recipe that reduces reasoning tokens (the model's internal scratchpad/planning steps) by approximately 30% versus K2.6. Benchmark improvements: +21.8% on Kimi Code Bench v2, +31.5% on MLS Bench Lite, while using fewer compute tokens per forward pass. API pricing is $0.95/$4.00 per million input/output tokens.",
            impact: "The 30% reduction in reasoning tokens directly improves time-to-first-token and total serve time for agentic workloads, with no quality loss (gains on benchmarks). For practitioners running agents that call tools or iterate on code generation, this cuts both latency (less internal computation) and cost per request. The MoE architecture with 32B active load fits a single H100 with KV cache, making it deployable on modest infrastructure compared to dense 1T-param models.",
            source: { label: "MarkTechPost", url: "https://www.marktechpost.com/2026/06/12/moonshot-ai-releases-kimi-k2-7-code-a-coding-model-reporting-21-8-on-kimi-code-bench-v2-over-k2-6/" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support. Primary sources are official release notes and project blogs.",
        items: [
          {
            title: "vLLM v0.23.0",
            whatsNew: "vLLM released v0.23.0 on June 13, 2026.",
            howItWorks: "Release notes not yet available in primary sources.",
            impact: "Feature details remain to be confirmed.",
            source: { label: "GitHub vLLM releases", url: "https://github.com/vllm-project/vllm/releases" },
          },
        ],
      },
    ],
    watching: [
      { text: "Kimi K2.7's 30% reasoning-token reduction claim while improving coding benchmarks. If consistent across diverse reasoning tasks and reproducible by the community, it shifts the cost/quality frontier for test-time compute in agentic systems.", source: { label: "MarkTechPost", url: "https://www.marktechpost.com/2026/06/12/moonshot-ai-releases-kimi-k2-7-code-a-coding-model-reporting-21-8-on-kimi-code-bench-v2-over-k2-6/" } },
      { text: "EvoMem's transfer gains (+6.1% GAIA, +4.8% LoCoMo) beyond the benchmark. If this generalizes to other agent frameworks and memory architectures, memory versioning becomes a standard ingredient in production agent systems.", source: { label: "arXiv 2606.13681", url: "https://arxiv.org/abs/2606.13681" } },
      { text: "Claude Fable 5 pricing ($10/$50 per Mtok) undercuts prior frontier models by 2-5x. Whether this pricing holds as consumption scales, and whether competitors match, will reshape the frontier model market.", source: { label: "Anthropic", url: "https://www.anthropic.com/news/claude-fable-5-mythos-5" } },
    ],
  },
  {
    date: "2026-06-07",
    range: "June 1 to June 7, 2026",
    tldr: [
      "RL Excursions during Pre-Training (Kakade group, arXiv 2606.04272, Jun 2): RL is effective on base pre-training checkpoints, not just after SFT. Targeted pre-training data composition beats model scale as a lever for RL gains, and parallel-averaging RL and SFT objectives outperforms SFT-then-RL while preserving general capabilities.",
      "NVIDIA Nemotron 3 Ultra (Jun 4): 550B total / 55B active hybrid Transformer-Mamba MoE, 1M context, NVFP4, day-0 in vLLM v0.22.0. One NVFP4 checkpoint runs on both Hopper and Blackwell. Post-trained with multi-environment RL for agent harnesses.",
      "Session-Aware Agentic Routing (SAAR, Jun 2) in vLLM Semantic Router cuts model switches 79.29% across 21,600 turns and drives tool-loop and provider-state switch violations to zero. The point: a router behind auto must know when switching mid-session is unsafe.",
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
            howItWorks: "Rather than waiting for a finished base model, they run policy optimization on partially-trained checkpoints and compare it head-to-head with SFT and the usual SFT-then-RL recipe. SFT (supervised fine-tuning) imitates demonstration data; RL optimizes a reward directly. Sharpening means RL concentrating probability mass on already-likely outputs rather than expanding what the model can produce. They also merge RL and SFT by parallel averaging, averaging the two separately-trained weight sets.",
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
            howItWorks: "It keeps the existing semantic-routing pipeline and wraps a session-control layer around the result. Two hard locks hold the previous physical model: tool-loop continuity (a tool result must return to the model that requested it) and provider-managed state (a non-portable continuation id stays on its backend). Reset boundaries (idle timeout, decision drift) reopen selection so the policy does not degrade into sticky sessions. Switch economics price the cached-input checkout delta, the input-token cost of abandoning a warm prefix cache, so switching away from a long warm session is penalized. Every decision writes a replay trace, making routing behind a logical auto model inspectable.",
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
            howItWorks: "AutoRound is a tuning-based PTQ that jointly optimizes rounding and clipping with three learnable parameters per tensor (V for rounding offset, alpha and beta for clip range), giving better low-bit accuracy than round-to-nearest while producing a static checkpoint with no inference-time quantization overhead. vLLM-Omni reads quantization_config.quant_method = auto-round from checkpoint metadata and selects the matching backend, so the serving API is identical to a normal load (no --quantization flag). Roughly 128 calibration samples and ~200 optimization iterations are usually enough to converge.",
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
];
