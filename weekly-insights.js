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
    date: "2026-07-26",
    range: "July 20 to July 26, 2026",
    tldr: [
      "Two in-window papers land on the RL and agentic direction. A systems study of reward-model scoring runtimes for RLHF (arXiv 2607.19712, Jul 22) finds ONNX Runtime beats PyTorch eager and a FastAPI server on CPU with non-overlapping confidence intervals, while torch.compile wins on GPU, and that batching strategy moves throughput more than the language or the runtime. AREX (arXiv 2607.21461, Jul 23) trains recursively self-improving deep-research agents with long-horizon RL and a learned context-compression tool.",
      "The reward-model takeaway worth internalizing: a faster scorer does not shrink RLHF step time on its own, because scoring and rollout generation contend for the same CPU and GPU, so a faster scorer mainly frees capacity that generation then uses. Do not rewrite a reward server in C++ expecting a GPU win; the measured GPU speedup came from ONNX Runtime, not the language, and torch.compile still led.",
      "Quiet release week: the two big events land just after the window. Kimi K3 open weights and the technical report are due July 27 (not out as of Sunday July 26), and the MCP 2026-07-28 spec goes final July 28. If you run remote MCP servers, this is the last week of the ten-week validation window to test against the release candidate before the text is normative.",
      "Caution on roundups: aggregators this week claim SGLang v0.5.16 and vLLM v0.26.0 shipped with DSpark integrated. Neither could be confirmed against the projects' own release pages, and the DSpark PR (#30261) they credit is still open, unreviewed, and CI-blocked. Treat the version numbers as unverified and do not re-pin on them.",
      "Watchlist resolution: all three of last week's items are still open. Kimi K3 weights not out (due Jul 27); MCP final not published (due Jul 28, SDKs still beta); SGLang PR #30261 has not moved in 20 days and no independent DSpark reproduction surfaced.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "How fast can reward models score? A systems study that says the runtime, not the language, is the lever",
            whatsNew:
              "arXiv 2607.19712 (Pulipaka, Katta, Peddireddy), submitted July 22, 2026. The authors build a native C++ reward-model inference engine on ONNX Runtime and benchmark it against PyTorch eager mode, torch.compile, and a FastAPI server, on both CPU and GPU. Correctness first: the C++ engine's output matched the PyTorch reference to 5.7e-6 on CPU and 4.2e-3 on GPU. On CPU the C++/ONNX engine beat every baseline with confidence intervals that did not overlap. On GPU it beat PyTorch eager and FastAPI, but torch.compile came out ahead.",
            howItWorks:
              "In RLHF (reinforcement learning from human feedback: you train a reward model on preference data, then use its scalar scores as the reward signal to fine-tune the policy with PPO or GRPO), reward scoring is a synchronization barrier. No policy update runs until every rollout in the group has a score, so slow scoring stalls the whole loop even though the scoring compute itself is small next to rollout generation. The paper isolates the scoring runtime and tests it in a controlled way. It traces the GPU speedup to ONNX Runtime's graph optimizations and execution provider, not to C++ as a language: the same gains appear from the runtime regardless of the host language. And it finds that batching strategy, how you group rollouts before scoring, moves throughput more than either the language or the runtime choice. All numbers come from repeated independent runs because single runs are too noisy to trust. Glosses: torch.compile is PyTorch's ahead-of-time graph compiler; ONNX Runtime is a cross-framework inference engine that runs an exported ONNX graph.",
            impact:
              "Two things to carry to your own RLHF stack. First, do not expect scoring optimizations to shrink step time in isolation. Scoring and generation fight over the same CPU and GPU, so a faster scorer mostly frees capacity that generation then consumes; measure end-to-end step time, not scorer microbenchmarks. Second, if you are tempted to rewrite your reward server in C++ for GPU throughput, this argues against it for the language alone: on GPU, torch.compile already led, and the CPU win came from ONNX Runtime, which you can adopt from Python without leaving the ecosystem. Profile your batching before you touch the runtime. This is a small systems paper, not a lab report, so treat the specific margins as setup-dependent, but the qualitative ordering (batching over runtime over language, and torch.compile strong on GPU) is the useful part.",
            source: { label: "arXiv 2607.19712", url: "https://arxiv.org/abs/2607.19712" },
          },
          {
            title: "AREX: long-horizon RL for recursively self-improving research agents",
            whatsNew:
              "arXiv 2607.21461 (Lu, Li, Luo, and 20 others including Zheng Liu and Zhicheng Dou), submitted July 23, 2026. It introduces AREX, a family of Recursively Self-Improving (RSI) deep-research agents trained with agentic mid-training plus long-horizon reinforcement learning. Two instances ship: a dense 4B model and a 122B-A10B Mixture-of-Experts model (122B total parameters, about 10B activated per token). Across BrowseComp, WideSearch, DeepSearchQA, Humanity's Last Exam, and other reasoning and tool-use benchmarks, AREX beats comparable-scale baselines and stays competitive with models that activate substantially more parameters.",
            howItWorks:
              "The method exploits a discovery-verification asymmetry: finding an answer that jointly satisfies many constraints is expensive, but checking a candidate decomposes into cheap per-constraint checks. AREX alternates an inner research loop (gather evidence, build a provisional answer) with an outer self-improvement loop (audit the answer constraint by constraint, identify unresolved claims, launch targeted follow-up research). To survive long horizons without the context growing without bound, it learns an autonomous context-update tool that compresses the interaction history into a compact state holding verified evidence and open constraints, with no external summarizer model. For training, the sparse-final-reward problem (you only learn whether the whole trajectory succeeded) is mitigated by emphasizing key steps, the moments where decisive evidence is acquired or a wrong research direction is corrected. Glosses: RSI means the agent iteratively rewrites its own answer using partially verified state; MoE routes each token to a small subset of experts so total and active parameter counts decouple (here 122B total, ~10B active); long-horizon RL is RL over trajectories that span many tool calls.",
            impact:
              "For anyone building research or tool-use agents, two transferable ideas. The learned context-update tool turns context engineering into a trained component rather than a hand-tuned summarizer prompt, which is the recurring failure point in long-horizon agents. And the key-step credit assignment is a concrete recipe for sparse-reward long-horizon RL: reward the moments that actually move the trajectory rather than only the final outcome. The 4B result matters for cost: if a dense 4B model trained this way is competitive on BrowseComp and HLE, the capability is not gated behind a frontier-size model. The abstract notes no weights or code release, so the recipe is the deliverable for now, not a checkpoint you can run.",
            source: { label: "arXiv 2607.21461", url: "https://arxiv.org/abs/2607.21461" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "MCP goes stateless on July 28: the migration to do before the validation window closes",
            whatsNew:
              "The MCP 2026-07-28 specification is scheduled to be published as final on July 28, two days after this window closes, and it is the largest revision of the protocol since launch. Date note: the release candidate was locked May 21 and the Tier-1 SDK betas shipped June 29, both before this window; the in-window event is the final publication and the close of the ten-week validation window, which makes this the last week to test your servers against the RC before the text becomes normative. This resolves last week's watchlist entry on MCP.",
            howItWorks:
              "The core change is that the protocol becomes stateless at the transport layer. The initialize/initialized handshake and the Mcp-Session-Id header are removed (SEP-2575, SEP-2567); protocol version, client info, and capabilities now travel in _meta on every request, and a new server/discover method fetches server capabilities on demand. Because every request is self-describing, any server instance can handle any request, so sticky sessions and shared session stores are no longer required and a plain round-robin load balancer works. Server-to-client prompts (elicitation) are rebuilt as Multi Round-Trip Requests: instead of holding a Server-Sent Events stream open, the server returns an InputRequiredResult with an opaque requestState, the client gathers answers and re-issues the original call, and any instance can pick up the retry. The Streamable HTTP transport now requires Mcp-Method and Mcp-Name headers so gateways and rate-limiters route on the operation without parsing the body. Glosses: stateless means the server keeps no per-connection session and all needed state rides in the request; SSE is a long-lived one-way HTTP stream.",
            impact:
              "The breaking changes are concrete and worth auditing this week. The initialize handshake and Mcp-Session-Id are gone; if your gateway routes on the session header, that routing breaks. The missing-resource error code changes from the MCP-custom -32002 to the JSON-RPC standard -32602, so any client that matches the literal -32002 needs updating. Roots, sampling, and logging are deprecated (annotation-only, they keep working for at least a year) with named replacements: tool parameters or resource URIs for roots, direct LLM provider APIs for sampling, stderr or OpenTelemetry for logging. Tool inputSchema and outputSchema move to full JSON Schema 2020-12 (oneOf/anyOf/allOf, conditionals, $ref/$defs), with the caveat that implementations must not auto-dereference external $ref URIs. Nothing breaks on July 28 for an existing v1 server, and the SDKs are still betas, but two actions are worth taking now: if you publish a library depending on the Python mcp package, add an upper bound like mcp>=1.27,<2 so the stable v2 does not surprise your users; and if you operate behind a gateway, test the stateless path (createMcpHandler in TypeScript, StreamableHTTPOptions.Stateless = true in Go, the dual-revision HTTP app in Python v2) to confirm your routing needs nothing the protocol no longer provides.",
            source: { label: "MCP 2026-07-28 release candidate", url: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "Caution: roundups claim DSpark shipped in SGLang v0.5.16, but the PR is still open and unmerged",
            whatsNew:
              "Aggregator roundups this week assert that SGLang shipped v0.5.16 and vLLM shipped v0.26.0, both crediting a merged DSpark speculative-decoding integration and quoting figures like 383.7 tok/s on DeepSeek-V4 and a fal production deployment. The one primary that could be verified live contradicts the DSpark part: SGLang PR #30261 is still open, has no approving review, and its CI has never run (the run-ci label was never added) as of July 26, 20 days after it opened on July 6. The SGLang and vLLM release pages retrieved for this digest returned stale cached snapshots (showing much older tags as latest), so the v0.5.16 and v0.26.0 version numbers could not be confirmed against a primary and are treated as unverified rather than asserted either way.",
            howItWorks:
              "DSpark is DeepSeek's load-aware speculative decoding. Speculative decoding runs a cheap drafter that proposes several future tokens which the expensive target model verifies in parallel; DSpark varies how many tokens it verifies per request based on the drafter's confidence, so the gains hold as concurrency rises instead of collapsing when verification competes with real decode work. The claim that DSpark shipped in SGLang v0.5.16 traces back to secondary roundups, not to the project's release notes or a merged PR. The verification procedure is simple: open the release tag and the PR. Here the PR is unmerged and its CI has never run, which is inconsistent with the shipped claim. Gloss: SGLang gates CI behind a maintainer-applied run-ci label, so an unlabeled PR has literally never been tested, let alone merged.",
            impact:
              "Do not upgrade or re-pin a serving deployment based on a roundup that names a version number and a feature. Pin to release tags you can open yourself. For DSpark specifically, there is still nothing to turn on in SGLang: the integration is unmerged and untested in CI, and the status is unchanged from last week. The broader operating lesson is that aggregator version cadence drifts ahead of what projects have actually tagged, so a version string in a roundup is a lead to verify, not a fact to act on. If you serve large sparse-MoE models and are tracking DSpark, keep watching PR #30261 for a merge and CI-passing benchmarks.",
            source: { label: "SGLang PR #30261", url: "https://github.com/sgl-project/sglang/pull/30261" },
          },
        ],
      },
    ],
    watching: [
      {
        text: "Whether Kimi K3 full open weights and the technical report actually publish on July 27, 2026, and whether the report substantiates the 2.5x-scaling-over-K2 claim with real architecture and training detail on Kimi Delta Attention and Attention Residuals. Carried over; resolves next week.",
        source: { label: "Kimi K3 platform docs", url: "https://platform.kimi.ai/docs/guide/kimi-k3-quickstart" },
      },
      {
        text: "Whether the MCP 2026-07-28 specification is published as final on July 28 with the stateless core intact, and whether the Tier-1 SDKs promote from beta to stable v2 on or near that date (Python mcp 2.0.0b1, TypeScript @beta, Go v1.7.0-pre.1, C# 2.0.0-preview.1 today). Carried over; resolves next week.",
        source: { label: "MCP 2026-07-28 release candidate", url: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/" },
      },
      {
        text: "Whether SGLang PR #30261 merges with CI-passing benchmarks, whether any SGLang v0.5.16 release notes materialize that actually confirm a DSpark integration, and whether anyone outside DeepSeek reproduces the 60 to 85 percent per-user generation gain. Carried over; the PR has not moved in 20 days.",
        source: { label: "SGLang PR #30261", url: "https://github.com/sgl-project/sglang/pull/30261" },
      },
    ],
  },
  {
    date: "2026-07-19",
    range: "July 13 to July 19, 2026",
    tldr: [
      "Moonshot shipped Kimi K3 on July 16: 2.8T total parameters activating 16 of 896 experts per token (about 1.8% of the pool), 1M context, native vision, built on Kimi Delta Attention plus Attention Residuals, with a claimed 2.5x scaling efficiency over K2. Live on the API now; full open weights promised by July 27. Read the API constraints before porting: reasoning_effort only accepts max, sampling parameters are fixed and must be omitted, and the K2.x thinking parameter is gone.",
      "DeepSeek's DSpark paper (arXiv 2607.05147, submitted Jul 6) is the material update to last week's tracked item. Deployed in the DeepSeek-V4 serving system under live traffic, it reports 60 to 85 percent faster per-user generation than the MTP-1 production baseline at matched throughput. The SGLang integration PR is still open, unreviewed, and CI-blocked, so there is nothing to turn on yet.",
      "GitHub Models ran its first scheduled brownout on July 16 and is fully retired on July 30. Playground, model catalog, inference API, and BYOK endpoints all go away for every customer including existing paid usage. If anything in your CI or product calls those endpoints, it already failed once this week.",
      "SGLang v0.5.15 (shipped Jul 10; the current stable release, not in-window news) tuned GLM-5.2 NVFP4 to 500+ tok/s/user on 8x B300 at batch size 1, turned Spec V2 and Breakable CUDA Graph on by default, and added a FlashKDA prefill backend for the same linear-attention family Kimi K3 is built on.",
      "Watchlist resolution: all three of last week's items remain open. MCP's stateless spec is on track for July 28 but has not landed (SDKs still beta); the DSpark PR has not moved in 13 days, though the paper behind it published with production numbers; VARL still has no code release and no generalization evidence.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "Update: DSpark, the paper behind last week's unmerged PR, with production numbers",
            whatsNew:
              "DeepSeek published DSpark as arXiv 2607.05147 (Cheng, Yu, Shao, et al., 34 authors including Wenfeng Liang), submitted Jul 6, 2026. Last week's digest tracked only SGLang PR #30261 and correctly flagged it as unmerged; the paper is the primary artifact and it carries the numbers the PR did not. Deployed inside the DeepSeek-V4 serving system under live user traffic, DSpark accelerates per-user generation speeds by 60 to 85 percent versus the established production baseline (MTP-1) at matched throughput levels. Date note: Jul 6 is outside this week's window, so this is included as the material update to an item already on the watchlist, not as in-window news. Also worth recording: as of Jul 19, PR #30261 is still open, has no approving review, and CI has never run on it because the run-ci label was never added.",
            howItWorks:
              "Speculative decoding runs a cheap drafter that proposes several future tokens, which the expensive target model then verifies in parallel; output quality is unchanged, latency drops. Recent parallel drafters emit a whole block in one forward pass, which is fast, but the tokens in that block do not condition on each other, so acceptance decays sharply toward the end of the block (the paper calls this suffix decay). DSpark attacks this on two axes. First, a semi-autoregressive architecture: a parallel backbone produces the block, and a lightweight sequential module conditions each position on the previous one, restoring intra-block dependency without paying full autoregressive cost. Second, confidence-scheduled verification: a confidence head scores each drafted token's probability of surviving verification, the product across a prefix gives that prefix's survival probability, and a scheduler converts this into a per-request verify budget using engine-specific throughput profiles. The motivating observation is that verification is not free under load, since every drafted token you verify occupies a batch slot that could have served real decode work. MTP-1, the baseline being beaten, is multi-token prediction with a single additional prediction head, DeepSeek's prior production speculative-decoding setup.",
            impact:
              "The number that matters for sizing a serving fleet is 60 to 85 percent faster per-user generation at matched throughput, measured in production rather than on an offline benchmark. The load-aware framing is the real contribution: most speculative-decoding gains published at batch size 1 evaporate as concurrency rises because verification competes with genuine decode work, and DSpark's claim is that adapting verify length per request preserves the gain under high concurrency, making previously unreachable operating points possible under strict interactivity constraints. Two caveats before planning around it. There is no third-party reproduction outside DeepSeek's own stack, and the SGLang integration remains unmerged with CI that has not run, so there is no version you can install. If you serve large sparse-attention MoE models, treat this as the direction drafters are heading, not as something to deploy this quarter.",
            source: { label: "arXiv 2607.05147", url: "https://arxiv.org/abs/2607.05147" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "Kimi K3: a 2.8T open-weight MoE lands on the API, weights promised July 27",
            whatsNew:
              "Moonshot released Kimi K3 on July 16, 2026, its flagship model and, per Moonshot, the first open-source model in the 3-trillion-parameter class. It is a Mixture-of-Experts model with roughly 2.8 trillion total parameters, a 1M-token context window, and native visual understanding, aimed at long-horizon coding and agentic knowledge work. It is live on the API as kimi-k3 now; Moonshot states full model weights will be released by July 27, 2026, with a technical report covering architecture, training, and evaluation to follow. Until those land, the architecture claims are from Moonshot's own documentation and have not been independently verified.",
            howItWorks:
              "Three architectural pieces carry the claim. Kimi Delta Attention (KDA) is a hybrid linear attention mechanism; linear attention replaces the quadratic all-pairs softmax with a recurrent-state formulation whose cost grows linearly with sequence length, which is what makes a 1M-token window tractable, and hybrid means it is interleaved with some full-attention layers to retain exact recall where it matters. Attention Residuals (AttnRes) change how information flows between layers so signal degrades less through depth. On the sparsity axis, Moonshot's Stable LatentMoE framework activates 16 of 896 experts per token, roughly 1.8% of the pool: a Mixture-of-Experts routes each token to a small subset of feed-forward experts, so total parameter count and per-token compute decouple, and 1.8% is aggressive sparsity even by current standards. Together Moonshot claims roughly 2.5x the overall scaling efficiency of K2, meaning more capability per unit of training compute. Billing is flat pay-as-you-go with no tiering by context length, with separate input rates for cache hits and misses; context caching is automatic, with no cache ID or TTL parameter, so you get hits by keeping a long prefix byte-identical across requests.",
            impact:
              "For anyone evaluating a port, the API constraints matter more than the benchmark claims and they are documented, not discovered. Thinking mode is always on and reasoning_effort currently accepts only max, so you cannot dial reasoning cost down; the K2.x thinking parameter is gone and passing it is wrong. temperature, top_p, n, presence_penalty, and frequency_penalty are fixed server-side and should be omitted entirely, which breaks any code path that sweeps sampling parameters. max_completion_tokens defaults to 131072 and can be raised to 1048576. Vision input rejects public image URLs, so you must send base64 or an ms://<file-id> reference, and content must be an array of objects rather than a serialized string. Multi-turn and tool-calling flows require returning the complete assistant message unchanged, not just content. Moonshot also flags that its official web search tool is mid-update and not recommended for production right now. The strategic read: if the weights ship on July 27 this is the largest open-weight model available, and the serving stack will need real work to run it. The linear-attention family it uses is the same one SGLang has been building kernels for, which suggests ecosystem support is being coordinated ahead of the weight drop rather than after it.",
            source: { label: "Kimi K3 platform docs", url: "https://platform.kimi.ai/docs/guide/kimi-k3-quickstart" },
          },
          {
            title: "GitHub Models: first brownout hit July 16, full retirement July 30",
            whatsNew:
              "GitHub Models is being fully retired on July 30, 2026. GitHub announced the timeline on July 1 and scheduled two short brownouts, the first on July 16 (inside this window) and the second on July 23, during which GitHub Models requests deliberately return errors. After July 30 the playground, model catalog, inference API, and bring-your-own-key (BYOK) endpoints all stop working and the UI is removed. Unlike the June step, which only closed the product to new customers, this applies to everyone including existing customers with active usage.",
            howItWorks:
              "There is no mechanism here beyond a staged deprecation, and the staging is the point. A brownout is a deliberate short outage run before a hard shutdown so that dependencies surface while there is still time to fix them. If a service of yours called GitHub Models and you did not know it, July 16 is when it told you. GitHub's stated migration paths are Azure AI Foundry for a general model catalog and GitHub Copilot for AI workflows that stay on GitHub. Note the primary says Azure AI Foundry; some secondary coverage of this changelog renamed it Microsoft Foundry.",
            impact:
              "Concretely: audit for calls to the GitHub Models inference API and any BYOK endpoint configuration, in application code and equally in CI workflows and evaluation harnesses where a free model endpoint tends to get wired in and forgotten. You have one more brownout on July 23 as a rehearsal and then a hard stop on July 30. The broader lesson for anyone building on free or promotional inference endpoints: GitHub went from closed-to-new-customers to retired-for-everyone in six weeks, and BYOK going away means even bringing your own provider key does not preserve the integration. Route inference through a provider you have a commercial relationship with, or through your own gateway, so a vendor sunset is a config change rather than a rewrite.",
            source: {
              label: "GitHub Changelog",
              url: "https://github.blog/changelog/2026-07-01-github-models-is-being-fully-retired-on-july-30-2026/",
            },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "SGLang v0.5.15: GLM-5.2 NVFP4 tuned to 500+ tok/s/user, Spec V2 and Breakable CUDA Graph now default",
            whatsNew:
              "SGLang v0.5.15 shipped July 10, 2026. Date note: that is three days before this window opened, and last week's digest (window Jul 6 to 12) did not cover it, so it is included here as the current stable release rather than as in-window news. The headline is a tuning cycle on GLM-5.2 in NVFP4 on Blackwell: 500+ tokens/sec/user on 8x B300 and 450 on 4x GB300 at batch size 1. Two performance features flip on by default in this release: Spec V2 speculative decoding and Breakable CUDA Graph.",
            howItWorks:
              "NVFP4 is NVIDIA's 4-bit floating-point format with per-block scaling factors, natively supported by Blackwell tensor cores; at 4 bits per weight it cuts weight memory roughly 4x versus BF16 and, more importantly for a single-user latency number, cuts the weight-memory traffic that dominates batch-size-1 decode. Spec V2's gain is scheduling rather than a new drafting algorithm: it makes the DSA draft-extend step CUDA-graph-capturable, drops device-to-host and host-to-device synchronizations, and fuses metadata operations, for roughly +11% end-to-end tokens/sec. Breakable CUDA Graph is now the default capture path; a CUDA graph replays a whole pre-recorded kernel sequence in one launch instead of paying per-kernel launch overhead, and breakable means the graph can be split at chosen points so dynamic control flow does not force a fall back to eager execution. Also in this release: IndexShare MTP reuses the indexer top-k across draft steps for up to 1.9x lower draft-step cost at long context; TopK V2 folds top-k selection into the page-table transform and raises runtime k to 2048; indexer prologue fusion collapses 12 kernels into 4 for about 8% faster decode at batch size 1; a FlashKDA prefill backend lands for safe-gate KDA linear attention alongside ReplaySSM buffered output-only decode; FlashMLA sparse prefill is on by default for DeepSeek-V4 for over 10% long-context throughput; and decode context parallelism arrives for MLA models including DeepSeek V3 and the Kimi K2 series.",
            impact:
              "If you serve GLM-5.2 on Blackwell, the cookbook recipes plus NVFP4 are the fastest published single-user numbers from the project and are worth benchmarking against whatever you have tuned yourself. The two default flips are the thing to actually watch on upgrade: Spec V2 and Breakable CUDA Graph are both on without you asking, which is +11% TPS and lower launch overhead when it works and a new source of capture-time failures when it does not, so re-run your correctness suite rather than trusting the version bump. The FlashKDA work is the strategically interesting piece: KDA is the same linear-attention family Kimi K3 is built on, so the serving stack is being prepared for that model class ahead of the weight release. One upgrade hazard worth calling out explicitly: this release bumps transformers to 5.12.1, a major-version dependency move and the most likely thing to break a pinned environment.",
            source: { label: "SGLang v0.5.15 release notes", url: "https://github.com/sgl-project/sglang/releases/tag/v0.5.15" },
          },
        ],
      },
    ],
    watching: [
      {
        text: "Whether Moonshot ships the full Kimi K3 weights by its stated July 27, 2026 date, and whether the accompanying technical report substantiates the 2.5x-scaling-efficiency-over-K2 claim with architecture and training detail on KDA and Attention Residuals.",
        source: { label: "Kimi K3 platform docs", url: "https://platform.kimi.ai/docs/guide/kimi-k3-quickstart" },
      },
      {
        text: "Whether the MCP 2026-07-28 specification goes final on July 28 with the stateless core intact, and whether the Tier-1 SDKs promote from beta to stable v2 on or near that date (Python targeted 2026-07-27, TypeScript 2026-07-28). Carried over from last week, still open.",
        source: { label: "MCP SDK betas", url: "https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/" },
      },
      {
        text: "Whether SGLang PR #30261 finally merges with CI-passing benchmarks, and whether anyone outside DeepSeek reproduces the paper's 60 to 85 percent per-user generation gain. Carried over from last week; the PR has not moved in 13 days.",
        source: { label: "SGLang PR #30261", url: "https://github.com/sgl-project/sglang/pull/30261" },
      },
    ],
  },
  {
    date: "2026-07-12",
    range: "July 6 to July 12, 2026",
    tldr: [
      "MCP is going stateless. The 2026-07-28 spec release candidate removes protocol-level sessions and the initialize handshake; Tier-1 SDK betas (Python v2, TypeScript v2, Go, C#) are out to test before the spec goes final Jul 28. If you run MCP servers behind a load balancer, you can drop sticky sessions and use plain round-robin.",
      "VARL (arXiv 2607.01181, MIT, submitted Jul 1) adds an adversarial human-demonstration discriminator on top of RLVR to fight the diversity collapse, unnatural style, and reward hacking that pure verifiable-reward RL causes. It reports more diverse, more human-like outputs while preserving RLVR accuracy.",
      "SGLang has an OPEN (not merged) PR (#30261, opened Jul 6) for DSpark, confidence-scheduled speculative decoding with semi-autoregressive block drafting, aimed at DeepSeek V4. Aggregators reported it as 'merged Jul 12'; the primary shows it open, unreviewed, and CI-blocked. Treat it as a proposal, not a shipped feature.",
      "Watchlist resolution: last week's three items (DFlash reproduction beyond Qwen 3.5 397B, MSA H800 speedups reproducing in third-party stacks, Fusion beating the best single model beyond DRACO) are all still open with no new primary this week.",
      "This is the first digest since June 21; the task did not run for three Sundays, so the window is the last 7 days.",
    ],
    sections: [
      {
        header: "// ACADEMIC RESEARCH",
        intro: "New methods and results from papers and labs: the techniques that tend to show up in production six months later.",
        items: [
          {
            title: "VARL: adding human demonstrations back into RL with verifiable rewards",
            whatsNew: "Mehul Damani, Isha Puri, Idan Shenfeld, and Jacob Andreas (MIT, arXiv 2607.01181) propose VARL (Verifiable and Adversarial Reinforcement Learning). It was submitted Jul 1, just before this week's window, but it is the strongest RL-post-training result the field engaged with this week and is squarely in the direction that matters here, so it is included with that date noted. RLVR (reinforcement learning with verifiable rewards) trains on tasks with an objective pass/fail signal, such as code that runs or a math answer that checks out. VARL targets the known failure modes of pure RLVR: diversity collapse, unnatural-sounding responses, and reward hacking, which come from optimizing only what a checker can score.",
            howItWorks: "VARL keeps the verifiable reward but adds a second, learned reward from an adversarial generator-discriminator setup. A discriminator is trained to tell the policy's outputs apart from a set of human demonstrations; the policy (generator) is trained with RL to maximize both task accuracy and the adversarial reward (fooling the discriminator). This lets you specify soft, non-verifiable properties (style, structure, tone) by supplying demonstrations rather than by writing a reward function for them. The verifiable term keeps correctness from regressing while the adversarial term pulls the output distribution toward the human one. The paper reports that in some cases this yields human-like policies with superhuman task performance.",
            impact: "For anyone doing RL post-training, this is a concrete recipe for the 'correct but robotic / mode-collapsed' problem that RLVR is known to cause. Instead of hand-crafting a style reward (itself hackable), you provide demonstrations and let a discriminator supply the soft signal while the verifiable reward protects accuracy. The headline evaluation is story generation, where VARL improves win rate and produces more diverse, more human-like text; the open question is how well the discriminator signal transfers to code and math style constraints, and whether training code is released.",
            source: { label: "arXiv 2607.01181", url: "https://arxiv.org/abs/2607.01181" },
          },
        ],
      },
      {
        header: "// INDUSTRY PRACTICES",
        intro: "How teams are actually building, deploying, and buying: product and workflow shifts, pricing, and deployment gotchas.",
        items: [
          {
            title: "MCP goes stateless: the 2026-07-28 release candidate and Tier-1 SDK betas",
            whatsNew: "The Model Context Protocol is shipping its biggest revision since launch. The 2026-07-28 specification release candidate makes the protocol stateless, and beta releases of all four Tier-1 SDKs (Python v2, TypeScript v2, Go, C#) are now available so server authors can test against the new revision before it goes final on July 28, 2026. The SDK-betas announcement is dated Jun 29 and the RC announcement earlier, both just before this week's window; the practitioner-relevant window right now is the four-week testing period leading into the July 28 final, so it is included and dated honestly.",
            howItWorks: "The stateless core (SEP-2575, SEP-2567) removes protocol-level sessions and the Mcp-Session-Id header from the Streamable HTTP transport, and removes the initialize / notifications-initialized handshake. Every request is now self-describing: it carries its protocol version, client identity, and client capabilities in _meta, and capabilities are fetched via a new server/discover method instead of a handshake. Because any server instance can answer any request, you can scale MCP servers with a plain round-robin load balancer instead of sticky sessions plus shared session storage. Related changes: Multi Round-Trip Requests (MRTR, SEP-2322) let a tool return InputRequiredResult to ask the user something mid-call and have the client retry with the answer, replacing the need for a long-lived stream; routable transport headers (Mcp-Method, Mcp-Name; SEP-2243) let gateways and rate limiters route without parsing request bodies; authorization is hardened (iss validation per RFC 9207, application_type in Dynamic Client Registration so desktop/CLI clients stop getting defaulted to 'web' and having their localhost redirects rejected); and standard JSON-RPC error codes replace MCP-custom ones (a missing resource now returns -32602, not the old -32002).",
            impact: "If you operate MCP servers behind a gateway or load balancer, the stateless path removes the two things that made horizontal scaling painful: sticky routing and shared session state. The migration is opt-in and non-breaking today; existing clients and servers keep working, and nothing switches off on July 28 (that date is only when the normative text is published). Concrete migration gotchas: Python and TypeScript SDKs jump to a new major version (v2), so pin exact beta versions (for example set an upper bound mcp>=1.27,<2 so a stable v2 does not surprise your users); a Python v2 server answers both revisions from one endpoint, while TypeScript and Go make serving 2026-07-28 an explicit opt-in on the transport (Go: StreamableHTTPOptions.Stateless = true); and if your client matches on the literal -32002 error code, update it. Net for builders: simpler, cheaper horizontal scaling of MCP servers, at the cost of a real but well-documented SDK migration.",
            source: { label: "MCP SDK betas (Jun 29)", url: "https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/" },
          },
        ],
      },
      {
        header: "// NEW FRAMEWORKS",
        intro: "Releases in the serving and runtime stack you build on: engines, kernels, and hardware support.",
        items: [
          {
            title: "SGLang DSpark: an open (not merged) PR for confidence-scheduled speculative decoding",
            whatsNew: "SGLang has an open pull request (#30261, opened Jul 6, 2026) titled '[Spec] Add DSpark: confidence-scheduled speculative decoding.' It proposes DSpark, described as semi-autoregressive block drafting with confidence-scheduled, variable-length verification, tied to issue #29488 (DSpark support for DeepSeek V4). Correction to the aggregator signal: several roundups reported DSpark as 'merged Jul 12.' The primary contradicts that. As of this writing the PR is open, unmerged, has no approving review, and is CI-blocked (missing the run-ci label, so tests have not even run). It is a proposal, not a shipped feature.",
            howItWorks: "Speculative decoding uses a cheap drafter to propose several future tokens that the target model verifies in parallel, with no quality change. Two ideas in the title: semi-autoregressive block drafting means the drafter emits a block of tokens per step rather than one at a time (like DFlash's block drafting, but 'semi' because it retains some left-to-right dependence inside the block instead of fully denoising it in parallel); confidence-scheduled, variable-length verify means the number of drafted tokens accepted per step is not fixed but adapts to the drafter's confidence, so easy spans verify long blocks and hard spans fall back to short ones. The PR carries labels for DeepSeek V4, Blackwell (SM100/SM120), NPU, and JIT kernels, indicating the target hardware and model surface.",
            impact: "Two takeaways. First, the mechanism: confidence-scheduled variable-length acceptance is the logical next step past fixed-block drafters like DFlash, and it targets DeepSeek V4, which matters for teams serving large sparse-attention MoE models. Second, and more actionable now: do not plan around DSpark yet. Because the PR is unmerged and CI has not run, there are no verified benchmark numbers and no guarantee it lands as described. This is a clean example of why you check the primary: an aggregator 'merged' claim, when opened, was an unreviewed bot PR with red CI. Track the PR for a merge plus CI-passing benchmarks before adopting.",
            source: { label: "SGLang PR #30261 (Jul 6)", url: "https://github.com/sgl-project/sglang/pull/30261" },
          },
        ],
      },
    ],
    watching: [
      {
        text: "Whether the MCP 2026-07-28 specification ships as final on July 28 with the stateless core intact (sessions and the initialize handshake removed as in the RC), and whether the Tier-1 SDKs promote from beta to stable v2 on or near that date.",
        source: { label: "MCP 2026-07-28 RC", url: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/" },
      },
      {
        text: "Whether SGLang PR #30261 (DSpark, confidence-scheduled speculative decoding for DeepSeek V4) actually merges and lands CI-passing benchmark numbers, given it is currently open, unreviewed, and CI-blocked.",
        source: { label: "SGLang PR #30261", url: "https://github.com/sgl-project/sglang/pull/30261" },
      },
      {
        text: "Whether VARL's adversarial-discriminator signal generalizes past story generation to code and math style constraints, and whether the authors release training code.",
        source: { label: "arXiv 2607.01181", url: "https://arxiv.org/abs/2607.01181" },
      },
    ],
  },
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
