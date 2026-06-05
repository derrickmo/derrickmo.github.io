// demos/kv-cache-eviction.jsx — bounding the KV cache by evicting past tokens.
//
// During long-context generation the KV cache grows linearly with the sequence,
// so to cap memory you must DROP some past tokens' keys/values. Which ones you
// drop decides whether quality survives. This demo lays a sequence of tokens out
// by their attention mass (how much future queries attend to them) and shows,
// for a fixed cache budget, which tokens each policy keeps vs evicts:
//   - Full          : keep everything (the baseline, unbounded memory)
//   - Sliding window: keep only the most recent B tokens
//   - Sink + window : keep a few initial "attention sink" tokens + a window (StreamingLLM)
//   - H2O           : keep the recent window + the heavy-hitter tokens by attention
//
// The KEEP/EVICT logic per policy is exact. The per-token attention masses are a
// stylized but faithful model of two real findings: the first few tokens act as
// attention sinks that carry disproportionate mass (Xiao et al., StreamingLLM),
// and a small set of "heavy hitter" tokens dominate the rest (Zhang et al., H2O).
// "Retained attention" = mass kept / total mass is the quality proxy.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, SegmentedControl, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const N = 48;            // sequence length
const SINKS = 4;         // attention-sink tokens at the start
const CW = 320, CH = 170;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// per-token attention mass: sinks (front) + recency (back) + scattered heavy hitters
function buildMasses(seed) {
  const rand = rng(seed), m = new Array(N), heavy = new Array(N).fill(false);
  for (let i = 0; i < N; i++) {
    const base = 0.12 + 0.10 * rand();
    const sink = i < SINKS ? (2.3 - i * 0.45) : 0;
    const rec = 0.95 * Math.exp(-(N - 1 - i) / 6);
    const h = (i >= SINKS && i < N - 8 && rand() < 0.14) ? (0.8 + rand() * 0.8) : 0;
    if (h > 0) heavy[i] = true;
    m[i] = base + sink + rec + h;
  }
  return { m, heavy };
}

// indices kept under a policy given budget B
function keptSet(policy, B, m) {
  const keep = new Array(N).fill(false);
  if (policy === "full" || B >= N) { keep.fill(true); return keep; }
  if (policy === "window") {
    for (let i = Math.max(0, N - B); i < N; i++) keep[i] = true;
    return keep;
  }
  if (policy === "sink") {
    const s = Math.min(SINKS, B);
    for (let i = 0; i < s; i++) keep[i] = true;
    for (let i = Math.max(s, N - (B - s)); i < N; i++) keep[i] = true;
    return keep;
  }
  // h2o: recent half of the budget + heavy hitters (by mass) from the rest
  const rec = Math.max(1, Math.floor(B / 2));
  for (let i = N - rec; i < N; i++) keep[i] = true;
  const remain = B - rec;
  const older = [];
  for (let i = 0; i < N - rec; i++) older.push([m[i], i]);
  older.sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < Math.min(remain, older.length); k++) keep[older[k][1]] = true;
  return keep;
}

function KVCacheEvictionDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [policy, setPolicy] = _useState("window");
  const [budget, setBudget] = _useState(16);
  const [seed, setSeed] = _useState(3);

  const { m, heavy } = _useMemo(() => buildMasses(seed * 1013 + 7), [seed]);
  const keep = _useMemo(() => keptSet(policy, budget, m), [policy, budget, m]);

  const total = _useMemo(() => m.reduce((a, b) => a + b, 0), [m]);
  const retained = _useMemo(() => { let s = 0; for (let i = 0; i < N; i++) if (keep[i]) s += m[i]; return s / total; }, [keep, m, total]);
  const keptCount = keep.filter(Boolean).length;
  const memory = keptCount / N;
  const ppl = 1 / Math.max(0.001, retained); // relative perplexity proxy (full = 1.00x)

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const pad = 8, baseY = CH - 26, maxBar = baseY - 12;
    const bw = (CW - pad * 2) / N;
    const maxM = Math.max(...m);
    for (let i = 0; i < N; i++) {
      const x = pad + i * bw;
      const h = (m[i] / maxM) * maxBar;
      ctx.fillStyle = keep[i] ? "#a855f7" : "rgba(100,116,139,0.4)";
      ctx.fillRect(x + 0.5, baseY - h, bw - 1, h);
      // sink marker
      if (i < SINKS) { ctx.fillStyle = "#60a5fa"; ctx.fillRect(x + 0.5, baseY + 2, bw - 1, 3); }
      // heavy hitter dot
      if (heavy[i]) { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(x + bw / 2, baseY - h - 4, 1.8, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.strokeStyle = "rgba(148,163,184,0.4)"; ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(CW - pad, baseY); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "9px monospace"; ctx.textAlign = "left";
    ctx.fillText("token 0 (oldest)", pad, CH - 10);
    ctx.textAlign = "right"; ctx.fillText("newest", CW - pad, CH - 10);
  }, [m, heavy, keep]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>KV CACHE — bar height = attention mass · kept vs evicted under the policy</span>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.05 : 1.4), height: CH * (mobile ? 1.05 : 1.4), borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "kept (in cache)", color: "#a855f7" },
        { label: "evicted", color: "#64748b" },
        { label: "attention sink", color: "#60a5fa" },
        { label: "heavy hitter", color: "#fbbf24" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// EVICTION POLICY" tone="violet" value={policy} onChange={setPolicy}
        options={[
          { value: "full", label: "Full" },
          { value: "window", label: "Sliding" },
          { value: "sink", label: "Sink+win" },
          { value: "h2o", label: "H2O" },
        ]}
        help="How to choose which past tokens to drop. Full = keep everything (unbounded memory). Sliding = keep only the most recent B. Sink+window (StreamingLLM) = a few initial sink tokens + a recent window. H2O = recent window + the heavy-hitter tokens by attention." />
      <Slider label="// CACHE BUDGET" min={6} max={N} step={2} value={budget} onChange={setBudget} suffix={" / " + N} tone="violet"
        help="Max tokens whose keys/values you keep. This is the memory cap. Lower it and every bounded policy must evict more — watch which tokens each one sacrifices and what that does to retained attention." />
      <Slider label="// SEQUENCE" min={1} max={9} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample the attention pattern: where the heavy-hitter tokens fall. The sink tokens (front) and recency (back) structure are always present, as in real decoder attention." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="MEMORY" value={(memory * 100).toFixed(0) + "%"} accent="var(--violet-lt)" />
        <StatReadout label="RETAINED ATTENTION" value={(retained * 100).toFixed(0) + "%"} accent={retained > 0.9 ? "#34d399" : retained > 0.7 ? "#fbbf24" : "#f87171"} />
        <StatReadout label="PERPLEXITY (rel)" value={ppl.toFixed(2) + "x"} accent={ppl < 1.15 ? "#34d399" : ppl < 1.5 ? "#fbbf24" : "#f87171"} />
        <StatReadout label="TOKENS KEPT" value={keptCount + " / " + N} accent="var(--dim)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Every generated token has to attend back over the whole cache, so the KV
        cache grows with the sequence and quickly dominates memory in long-context
        serving. To bound it you must <b>evict</b> past tokens — and the policy is
        everything. Set a tight <b>cache budget</b> and compare: the bars are
        per-token attention mass, violet = kept, gray = evicted.
      </DemoP>
      <DemoP>
        <b>Sliding window</b> keeps only recent tokens — and throws away the
        <b> attention sinks</b> at the very front (blue ticks), which carry huge
        mass; retained attention collapses and perplexity spikes. <b>Sink + window</b>{" "}
        (StreamingLLM) keeps just those few sink tokens plus the window and almost
        fully recovers quality at the same memory. <b>H2O</b> goes further by also
        retaining the <b>heavy hitters</b> (amber) — the handful of older tokens
        that everything attends to. Same budget, very different retained attention.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        KV-cache eviction is one of the central levers of long-context LLM serving.
        StreamingLLM's discovery — that a few initial tokens become "attention
        sinks" and dropping them wrecks a sliding-window cache — and H2O's
        heavy-hitter eviction are the canonical results modeled here. The same
        memory pressure drives{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/paged-attention/`} style={{ color: "#a855f7" }}>paged
        attention</a> (don't waste cache to fragmentation) and the basic{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kv-cache/`} style={{ color: "#a855f7" }}>KV
        cache</a> trade (recompute vs store).
      </DemoP>
      <DemoP>
        It's the eviction-policy problem from operating systems (LRU vs LFU)
        transplanted into attention, where "recently used" and "frequently
        attended" are both real signals. It also connects to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/lost-in-the-middle/`} style={{ color: "#a855f7" }}>lost
        in the middle</a>: if the model barely attends to the middle of a long
        context anyway, those KV entries are exactly the cheapest to drop.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="KV-Cache Eviction"
      subtitle="Bound the KV cache by dropping past tokens. Sliding-window throws away the attention sinks and quality crashes; sink+window and H2O keep it at the same memory."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<KVCacheEvictionDemo />);
