// demos/beam-search.jsx — beam search vs greedy vs sampling, on a tiny
// hand-crafted language model. The LM is a context→distribution lookup over a
// small vocab; we draw the search frontier as a tree, then compare what each
// decoding rule keeps.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

// A toy LM. Each "context" is the last token; the model returns a dist over
// next tokens. Carefully crafted so beam search finds a high-prob sentence
// that greedy misses.
const VOCAB = ["the", "cat", "dog", "ran", "slept", "fast", "well", "."];
const LM = {
  // <s>: start
  "<s>":  { the: 0.85, cat: 0.05, dog: 0.10 },
  "the":  { cat: 0.55, dog: 0.40, ran: 0.02, slept: 0.03 },
  "cat":  { ran: 0.45, slept: 0.50, ".": 0.05 },
  "dog":  { ran: 0.65, slept: 0.25, ".": 0.10 },
  "ran":  { fast: 0.70, well: 0.20, ".": 0.10 },
  "slept": { well: 0.60, ".": 0.35, fast: 0.05 },
  "fast": { ".": 0.95, well: 0.05 },
  "well": { ".": 0.95, fast: 0.05 },
  ".":    { ".": 1.0 }, // terminal
};

function nextDist(last) { return LM[last] || { ".": 1 }; }

function greedyDecode(maxLen = 8) {
  let tok = "<s>"; const seq = []; let logp = 0;
  for (let t = 0; t < maxLen; t++) {
    const d = nextDist(tok);
    let best = null, bp = -1;
    for (const k of Object.keys(d)) if (d[k] > bp) { bp = d[k]; best = k; }
    seq.push(best); logp += Math.log(bp); tok = best;
    if (best === ".") break;
  }
  return { seq, logp };
}

function sample(d, T = 1) {
  const keys = Object.keys(d);
  const ps = keys.map(k => Math.pow(d[k], 1 / T));
  const Z = ps.reduce((s, x) => s + x, 0);
  const r = Math.random() * Z; let acc = 0;
  for (let i = 0; i < keys.length; i++) { acc += ps[i]; if (r <= acc) return keys[i]; }
  return keys[keys.length - 1];
}
function samplingDecode(T, maxLen = 8) {
  let tok = "<s>"; const seq = []; let logp = 0;
  for (let t = 0; t < maxLen; t++) {
    const d = nextDist(tok);
    const next = sample(d, T);
    seq.push(next); logp += Math.log(d[next] || 1e-6); tok = next;
    if (next === ".") break;
  }
  return { seq, logp };
}

// Beam search. Returns the final beams + a tree (node = beam at depth t).
function beamDecode(K, maxLen = 8) {
  let beams = [{ seq: [], tok: "<s>", logp: 0, done: false, parent: null }];
  const layers = [beams.slice()];
  for (let t = 0; t < maxLen; t++) {
    const cands = [];
    for (const b of beams) {
      if (b.done) { cands.push(b); continue; }
      const d = nextDist(b.tok);
      for (const k of Object.keys(d)) {
        cands.push({
          seq: b.seq.concat(k),
          tok: k,
          logp: b.logp + Math.log(d[k]),
          done: k === ".",
          parent: b,
        });
      }
    }
    cands.sort((a, b) => b.logp - a.logp);
    beams = cands.slice(0, K);
    layers.push(beams.slice());
    if (beams.every(b => b.done)) break;
  }
  beams.sort((a, b) => b.logp - a.logp);
  return { beams, layers };
}

function BeamSearchDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [beamW, setBeamW] = _useState(3);
  const [temp, setTemp] = _useState(1.0);
  const [sampleSeed, setSampleSeed] = _useState(0);

  const beam = beamDecode(beamW);
  const greedy = greedyDecode();
  // sampleSeed dep forces re-roll
  // eslint-disable-next-line no-unused-vars
  const _ = sampleSeed;
  const sampled = samplingDecode(temp);

  const W = 520, H = 460;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Build node positions: each layer is a column. Within a layer, beams stacked top→down.
    const layers = beam.layers;
    const padL = 32, padR = 28, padT = 32, padB = 32;
    const cw = (W - padL - padR) / Math.max(1, layers.length - 1);
    const rowMax = beamW;
    const rh = (H - padT - padB) / Math.max(2, rowMax);

    // Assign positions by walking layers
    const posOf = new Map();
    layers.forEach((bs, t) => {
      bs.forEach((b, idx) => {
        const y = padT + (idx + 0.5) * rh + (rowMax - bs.length) * rh / 2;
        const x = padL + t * cw;
        posOf.set(b, { x, y });
      });
    });

    // Edges
    layers.forEach((bs, t) => {
      if (t === 0) return;
      bs.forEach(b => {
        if (!b.parent) return;
        const p1 = posOf.get(b.parent), p2 = posOf.get(b);
        if (!p1 || !p2) return;
        ctx.strokeStyle = b.done ? "rgba(52,211,153,0.55)" : "rgba(96,165,250,0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      });
    });

    // Highlight top beam path
    const top = beam.beams[0];
    if (top) {
      let cur = top;
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2.4;
      while (cur && cur.parent) {
        const p1 = posOf.get(cur.parent), p2 = posOf.get(cur);
        if (p1 && p2) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        cur = cur.parent;
      }
    }

    // Nodes
    layers.forEach((bs, t) => {
      bs.forEach(b => {
        const p = posOf.get(b);
        if (!p) return;
        ctx.fillStyle = b === top ? "#fbbf24" : b.done ? "#34d399" : "#0f172a";
        ctx.strokeStyle = b === top ? "#fbbf24" : b.done ? "#34d399" : "#60a5fa";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#e2e8f0"; ctx.font = "9px JetBrains Mono";
        ctx.fillText(b.tok || "<s>", p.x + 12, p.y + 3);
        ctx.fillStyle = "#64748b"; ctx.font = "8px JetBrains Mono";
        ctx.fillText("lp=" + b.logp.toFixed(2), p.x + 12, p.y + 14);
      });
    });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, [beamW, temp, sampleSeed]);

  const top = beam.beams[0];
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// BEAM WIDTH (K)" min={1} max={5} step={1} value={beamW} onChange={setBeamW}
        help="How many partial sequences survive each step. K=1 = greedy; bigger K explores more but multiplies compute. Diminishing returns past ~5 on most LMs." />
      <Slider label="// SAMPLE TEMP (T)" min={0.4} max={2.0} step={0.05} value={temp} onChange={setTemp} tone="violet"
        help="Temperature for the sampling decoder (rightmost output). T<1 sharpens the distribution (close to greedy); T>1 flattens it (more variety, more risk of nonsense)." />
      <DemoButton onClick={() => setSampleSeed(s => s + 1)} primary>RE-SAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="BEAM logp" value={top ? top.logp.toFixed(2) : "—"} accent="#fbbf24" />
        <StatReadout label="GREEDY logp" value={greedy.logp.toFixed(2)} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "ACTIVE" },
        { color: "#34d399", label: "FINISHED" },
        { color: "#fbbf24", label: "BEST BEAM" },
      ]} />
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>GREEDY</div>
        <div className="t-body" style={{ color: "#e2e8f0", fontSize: 13 }}>{greedy.seq.join(" ")}</div>
        <div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>BEAM (K={beamW})</div>
        <div className="t-body" style={{ color: "#fbbf24", fontSize: 13 }}>{top ? top.seq.join(" ") : "—"}</div>
        <div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>SAMPLE (T={temp.toFixed(2)})</div>
        <div className="t-body" style={{ color: "#c084fc", fontSize: 13 }}>{sampled.seq.join(" ")}</div>
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Each step, a language model gives you a probability distribution over the next
        token. <b>Greedy</b> just takes the top one — fast, often suboptimal, because a
        locally-best token can lead into a low-probability dead end. <b>Beam search</b>
        keeps the top <i>K</i> running candidates by total log-probability and expands
        all of them in parallel. The yellow path is the surviving top beam; green nodes
        are finished sequences (ended with ".").
      </DemoP>
      <DemoP>
        Drop the beam width to 1 and beam search collapses into greedy. Crank the
        sampling temperature on the right and the sampled sequence drifts from "the
        cat slept well" toward unlikelier sentences — that's how creativity gets
        injected without retraining the model. Beam search is deterministic; sampling
        is the source of variety in generative LMs.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Decoding is the unsung hero of LLMs. The same model can sound smart or
        stupid depending on the strategy: <b>greedy</b> for code completion (you want
        the highest-probability token), <b>beam</b> for translation and summarization
        (when a coherent global sequence matters), <b>nucleus/top-p</b> for chat
        (variety without garbage), <b>temperature</b> for everything (the single most
        impactful knob most users never touch).
      </DemoP>
      <DemoP>
        Modern systems combine tricks: <b>constrained decoding</b> forces grammars or
        JSON schemas; <b>speculative decoding</b> uses a small draft model to propose
        K tokens that a big model verifies in parallel for big throughput gains;
        <b> length normalization</b> and <b>coverage penalties</b> stop beam search
        from preferring boringly short outputs. The underlying tree you're staring at
        is what every one of those tricks reshapes.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Beam Search Tree"
      subtitle="Greedy vs beam vs sampling on a toy language model — see the search frontier expand and prune step by step."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-nlp/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BeamSearchDemo />);
