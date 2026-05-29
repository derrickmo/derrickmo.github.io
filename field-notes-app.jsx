// field-notes-app.jsx — Learn ▸ Field Notes.
// A weekly digest of practitioner-grade ML developments. Newest week on top.
// Entries are dated so the feed stays bounded; older weeks can be trimmed over time.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../../";

// Each weekly entry: { date (ISO, used for sort + id), range, tldr[], sections[], watching[] }.
// A section is { header, items[] }; an item is { text, source: { label, url } }.
const WEEKS = [
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

function FieldNotesHero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 150, paddingBottom: 32, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={480} x={"75%"} y={"-15%"} opacity={0.18} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={21} />
      <HudBrackets mode="dark" inset={30} size={30} />
      <Container>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <a href={`${BASE}learn/`} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel>FIELD NOTES</MonoLabel>
        </div>
        <h1 style={{
          fontFamily: "var(--f-display)", fontWeight: 700, maxWidth: 880,
          fontSize: "clamp(40px, 5vw, 68px)", letterSpacing: "-0.025em", lineHeight: 1.0, margin: 0,
          background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        }}>What changed this week.</h1>
        <div className="t-body" style={{ color: "var(--muted)", maxWidth: 680, fontSize: 18, lineHeight: 1.6, marginTop: 16 }}>
          A weekly digest of practitioner-grade ML developments — post-training and RL, data efficiency, agentic systems, quantization and local inference, fine-tuning, and the broader field. Concrete numbers, the practitioner angle, and a source on every item. Newest week on top.
        </div>
      </Container>
    </Section>
  );
}

function SourceLink({ source }) {
  if (!source) return null;
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="t-mono-s"
       style={{ color: "var(--violet-lt)", textDecoration: "none", fontSize: 11, whiteSpace: "nowrap" }}>
      [{source.label} →]
    </a>
  );
}

function Bullet({ item, mobile }) {
  return (
    <li style={{ marginBottom: 12, listStyle: "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ color: "var(--violet-lt)", marginTop: 3, fontSize: 12 }}>▸</span>
      <span className="t-body" style={{ color: "var(--white)", opacity: 0.86, fontSize: mobile ? 14 : 15, lineHeight: 1.65 }}>
        {item.text} <SourceLink source={item.source} />
      </span>
    </li>
  );
}

function WeekCard({ week, mobile }) {
  return (
    <div id={week.date} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)", padding: mobile ? "24px 22px" : "32px 36px", display: "flex", flexDirection: "column", gap: 18 }}>
      <HudBrackets mode="dark" inset={8} size={16} />
      <div>
        <MonoLabel color="var(--violet-lt)">// WEEK OF {week.range.toUpperCase()}</MonoLabel>
        <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: mobile ? 22 : 26, letterSpacing: "-0.015em", color: "var(--white)", margin: "8px 0 0" }}>TL;DR</h2>
      </div>
      <ul style={{ margin: 0, padding: 0 }}>
        {week.tldr.map((t, i) => <Bullet key={i} item={{ text: t }} mobile={mobile} />)}
      </ul>
      {week.sections.map((s) => (
        <div key={s.header} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <MonoLabel color="var(--blue-lt)">{s.header}</MonoLabel>
          <ul style={{ margin: 0, padding: 0 }}>
            {s.items.map((it, i) => <Bullet key={i} item={it} mobile={mobile} />)}
          </ul>
        </div>
      ))}
      {week.watching && week.watching.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <MonoLabel color="var(--blue-lt)">// WORTH WATCHING</MonoLabel>
          <ul style={{ margin: 0, padding: 0 }}>
            {week.watching.map((it, i) => <Bullet key={i} item={it} mobile={mobile} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function FieldNotesList() {
  const mobile = useIsMobile();
  const weeks = [...WEEKS].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 64 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.2} />
      <Container style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 20 }}>
        {weeks.map((w) => <WeekCard key={w.date} week={w} mobile={mobile} />)}
        <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 11, marginTop: 8 }}>Published weekly. Older weeks are trimmed to keep this feed scannable.</div>
      </Container>
    </Section>
  );
}

function App() { return (<><TopNav /><FieldNotesHero /><FieldNotesList /><Footer /></>); }
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
