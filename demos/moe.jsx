// demos/moe.jsx — Mixture of Experts: sparse routing / conditional computation.
//
// A router scores each incoming token over N experts and sends it to only the
// top-k, so the network can hold a huge number of parameters while activating
// just k/N of them per token. Tokens come in a few "types"; a fixed type→expert
// affinity (the learned router stand-in) makes each type prefer certain experts,
// so specialization emerges — visible in the type×expert routing heatmap. The
// catch is LOAD IMBALANCE: a few experts hog most tokens while others starve,
// wasting capacity. A load-balancing penalty nudges the router toward even use.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, T = 4;
const TYPE_COL = ["#60a5fa", "#a855f7", "#fbbf24", "#34d399"];
function softmax(z) { const m = Math.max(...z); const e = z.map(v => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }

function MoEDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);
  const [N, setN] = _useState(8);
  const [topk, setTopk] = _useState(2);
  const [balance, setBalance] = _useState(0.0);
  const [speed, setSpeed] = _useState(12);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);
  const st = _useRef(null);

  function build() {
    // fixed affinity: each type peaks on a couple of experts
    const A = Array.from({ length: T }, (_, t) => Array.from({ length: N }, (_, i) => {
      const center = (t / T) * N;
      return 2.2 * Math.exp(-((i - center) ** 2) / 2.2) + (Math.random() - 0.5) * 0.5;
    }));
    st.current = { A, load: new Float64Array(N), route: Array.from({ length: T }, () => new Float64Array(N)), typeCount: new Float64Array(T), total: 0, cur: null };
    force(x => x + 1);
  }
  _useEffect(() => { build(); /* eslint-disable-next-line */ }, [N]);

  function step() {
    const s = st.current; if (!s) return;
    const t = (Math.random() * T) | 0;
    const meanLoad = s.total ? s.load.reduce((a, b) => a + b, 0) / N : 0;
    const logits = s.A[t].map((v, i) => v + (Math.random() - 0.5) * 0.4 - balance * (s.load[i] - meanLoad) / Math.max(1, meanLoad));
    const probs = softmax(logits);
    const idx = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p).slice(0, topk).map(o => o.i);
    idx.forEach(i => { s.load[i] += 1; s.route[t][i] += 1; });
    s.typeCount[t] += 1; s.total += 1; s.cur = { t, idx, probs };
  }

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => { if (now - lastRef.current >= 1000 / speed) { lastRef.current = now; step(); force(x => x + 1); } rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, topk, balance]);

  const s = st.current;
  const maxLoad = s ? Math.max(...s.load, 1) : 1;
  const meanLoad = s && s.total ? s.load.reduce((a, b) => a + b, 0) / N : 0;
  const imbalance = meanLoad ? maxLoad / meanLoad : 1;
  const activePct = (topk / N) * 100;

  function draw() {
    const cv = canvasRef.current; if (!cv || !s) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("EXPERTS  ·  bar = cumulative load · glow = active for the current token", 20, 22);

    const ew = (W - 40) / N, ex = 20, etop = 40, ebot = 200;
    const active = new Set(s.cur ? s.cur.idx : []);
    for (let i = 0; i < N; i++) {
      const x = ex + i * ew, bh = (s.load[i] / maxLoad) * (ebot - etop - 16);
      ctx.fillStyle = active.has(i) ? "rgba(52,211,153,0.85)" : "rgba(96,165,250,0.45)";
      ctx.fillRect(x + 3, ebot - bh, ew - 6, bh);
      if (active.has(i)) { ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.strokeRect(x + 2, ebot - bh - 1, ew - 4, bh + 1); }
      ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText("E" + i, x + ew / 2, ebot + 12); ctx.textAlign = "left";
    }
    // current token + routing lines
    if (s.cur) {
      const tx = ex, ty = 224;
      ctx.fillStyle = TYPE_COL[s.cur.t];
      ctx.beginPath(); ctx.arc(tx + 8, ty, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText("token (type " + s.cur.t + ") → top-" + topk, tx + 22, ty + 4);
      s.cur.idx.forEach(i => {
        const exX = ex + i * ew + ew / 2;
        ctx.strokeStyle = TYPE_COL[s.cur.t]; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tx + 8, ty - 6); ctx.lineTo(exX, ebot + 2); ctx.stroke(); ctx.globalAlpha = 1;
      });
    }

    // routing heatmap: types x experts
    const hy = 250, hh = 96, ch = hh / T;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("SPECIALIZATION  ·  how often each token type routes to each expert", 20, hy - 6);
    for (let t = 0; t < T; t++) {
      ctx.fillStyle = TYPE_COL[t]; ctx.font = "9px JetBrains Mono"; ctx.fillText("t" + t, 6, hy + t * ch + ch / 2 + 3);
      const tot = s.typeCount[t] || 1;
      for (let i = 0; i < N; i++) {
        const frac = s.route[t][i] / tot;
        ctx.fillStyle = `rgba(168,85,247,${Math.min(1, frac * 1.3)})`;
        ctx.fillRect(ex + i * ew + 2, hy + t * ch + 1, ew - 4, ch - 2);
      }
    }

    // metrics
    const my = hy + hh + 28;
    ctx.fillStyle = "#60a5fa"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText(activePct.toFixed(0) + "%", 20, my);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("active params (k/N)", 20, my + 16);
    ctx.fillStyle = imbalance < 1.5 ? "#34d399" : imbalance < 2.5 ? "#fbbf24" : "#f87171"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText(imbalance.toFixed(2) + "×", 200, my);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("load imbalance (max/mean)", 200, my + 16);
    ctx.fillStyle = "#64748b"; ctx.fillText("tokens routed: " + s.total, 20, my + 40);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// EXPERTS (N)" min={4} max={10} step={1} value={N} onChange={setN} tone="violet"
        help="Total experts in the layer. More experts = more total parameters and capacity, but (at fixed top-k) the same compute per token — that's the whole MoE bargain: scale parameters without scaling per-token cost." />
      <Slider label="// TOP-K" min={1} max={4} step={1} value={topk} onChange={setTopk}
        help="How many experts each token actually uses. Active compute is k/N of the dense equivalent. k=1 (Switch Transformer) is cheapest; k=2 is the common choice; higher k trades efficiency for a bit more quality and smoother routing." />
      <Slider label="// LOAD BALANCING" min={0} max={2} step={0.1} value={balance} onChange={setBalance}
        help="Strength of the penalty that steers tokens away from already-overloaded experts. At 0, popular experts hog the tokens and others starve (high imbalance, wasted capacity); raise it and the load bars even out — the job of the auxiliary load-balancing loss in real MoEs." />
      <Slider label="// SPEED (tokens/sec)" min={2} max={60} step={2} value={speed} onChange={setSpeed}
        help="Token routing speed. Let it run to accumulate the load distribution and the specialization heatmap." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "STREAM TOKENS"}</DemoButton>
      <DemoButton onClick={() => { step(); force(x => x + 1); }}>STEP</DemoButton>
      <DemoButton onClick={build}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ACTIVE" value={activePct.toFixed(0) + "%"} accent="#60a5fa" />
        <StatReadout label="IMBALANCE" value={imbalance.toFixed(2) + "×"} accent={imbalance < 1.5 ? "#34d399" : imbalance < 2.5 ? "#fbbf24" : "#f87171"} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "expert load" },
        { color: "#34d399", label: "active expert" },
        { color: "#a855f7", label: "routing frequency" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A dense layer runs every parameter on every token. A Mixture of Experts
        layer holds many parallel expert sub-networks but a small router sends each
        token to only the top-k of them — so you can pack in a huge parameter count
        while the <i>active</i> compute per token stays at k/N. Stream tokens and
        watch: each token (colored by its type) lights up its chosen experts, and
        the load bars and specialization heatmap fill in. Different token types
        learn to prefer different experts — that's the specialization MoE buys.
      </DemoP>
      <DemoP>
        The failure mode is load imbalance. With LOAD BALANCING at 0, a few experts
        attract most tokens while others sit idle — the imbalance metric climbs,
        and the starved experts are dead capacity. Turn balancing up and the router
        is pushed to spread tokens evenly; the bars level out and imbalance drops
        toward 1×. Real MoEs add exactly this as an auxiliary loss (plus a capacity
        limit per expert), because a router left alone collapses onto a few experts.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Mixture of Experts is how the largest models scale parameters without
        scaling cost per token — the architecture behind Switch Transformer,
        GLaM, Mixtral, and the sparse frontier LLMs. It belongs to the same
        efficiency toolkit as{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/quantization/`} style={{ color: "#a855f7" }}>quantization</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/pruning/`} style={{ color: "#a855f7" }}>pruning</a>,
        but works by <i>conditional computation</i> rather than shrinking the model:
        spend parameters generously, activate them sparsely.
      </DemoP>
      <DemoP>
        The engineering is all in the routing. Top-k gating (Shazeer et al.) is
        non-differentiable in the selection, so it's trained with the gate
        probabilities plus a load-balancing loss; capacity factors cap tokens per
        expert (overflow is dropped); and at scale the experts are sharded across
        devices, making routing a communication problem as much as a modeling one.
        The tradeoff this demo makes tangible: huge capacity and specialization,
        paid for with the constant fight against imbalance and routing overhead.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="EFFICIENCY" title="Mixture of Experts (MoE)"
      subtitle="Route each token to a few of many experts — scale parameters, not per-token compute. Watch specialization emerge, and fight the load-imbalance failure."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MoEDemo />);
