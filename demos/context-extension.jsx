// demos/context-extension.jsx — extending a RoPE model's context window.
//
// A model trained at context length L_train sees rotary positions in [0, L_train].
// Run it on a longer context and the unseen positions are out-of-distribution:
// naive extrapolation makes perplexity explode just past the training length.
// The fixes rescale how inference positions map onto the trained rotary range:
//   - none  (extrapolate)     : use raw positions -> blows up beyond L_train
//   - PI     (Chen 2023)      : linearly compress positions by L_train/L_target;
//                               bounded everywhere but a uniform resolution cost
//   - NTK-aware               : change the RoPE base so high freqs barely move and
//                               low freqs stretch -> better, no fine-tune
//   - YaRN   (Peng 2023)      : per-frequency NTK + attention scaling -> best
//
// The perplexity-vs-position curves are a STYLIZED but faithful model of the
// published behavior of each method (extrapolation cliff; PI's flat tax; NTK/YaRN
// holding low) — not a live LLM. "Usable context" = the farthest position whose
// perplexity stays under a quality threshold.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, SegmentedControl, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 330, CH = 200;
const L_TRAIN_TOK = 4096;      // displayed training length
const PPL_CAP = 6;             // clip explosion for display (relative ppl)
const THRESH = 1.5;           // "usable" if rel-ppl below this

const METHODS = [
  { id: "none", label: "None", color: "#f87171" },
  { id: "pi",   label: "PI",   color: "#fbbf24" },
  { id: "ntk",  label: "NTK",  color: "#60a5fa" },
  { id: "yarn", label: "YaRN", color: "#34d399" },
];

// relative perplexity at normalized position p in [0, s], for extension factor s.
function ppl(method, p, s) {
  const log = Math.log2(Math.max(1, s));
  if (method === "none") {
    if (p <= 1) return 1 + 0.02 * p;
    return 1 + 6.0 * (p - 1) * (p - 1);            // explodes beyond L_train
  }
  const f = p / s;                                  // 0..1 across the window
  if (method === "pi")  return 1 + 0.16 * log + 0.05 * f;          // uniform tax, grows with s
  if (method === "ntk") return 1 + 0.05 * log + 0.30 * Math.pow(f, 3) * log; // low, rises far out
  return 1 + 0.025 * log + 0.10 * Math.pow(f, 4) * log;            // yarn: best
}

function usableContext(method, s) {
  // farthest p (<= s) with ppl below threshold, sampled
  let last = 0;
  for (let i = 0; i <= 400; i++) { const p = (i / 400) * s; if (ppl(method, p, s) < THRESH) last = p; else if (p > 1) break; }
  return last;
}
function meanPpl(method, s) {
  let acc = 0; const n = 200;
  for (let i = 0; i < n; i++) { const p = ((i + 0.5) / n) * s; acc += Math.min(PPL_CAP, ppl(method, p, s)); }
  return acc / n;
}

function ContextExtensionDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [method, setMethod] = _useState("pi");
  const [factor, setFactor] = _useState(4);

  const s = factor;
  const stats = _useMemo(() => ({
    mean: meanPpl(method, s),
    usable: usableContext(method, s),
  }), [method, s]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const padL = 34, padR = 10, padT = 12, padB = 26;
    const x0 = padL, x1 = CW - padR, y0 = CH - padB, y1 = padT;
    const X = p => x0 + (p / s) * (x1 - x0);
    const Y = v => y0 + (Math.min(PPL_CAP, v) - 1) / (PPL_CAP - 1) * (y1 - y0);

    // grid + axes
    ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.lineWidth = 1;
    for (let v = 1; v <= PPL_CAP; v += 1) { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x1, Y(v)); ctx.stroke(); }
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "right";
    ctx.fillText("1x", x0 - 4, Y(1) + 3); ctx.fillText(PPL_CAP + "x", x0 - 4, Y(PPL_CAP) + 6);
    ctx.save(); ctx.translate(10, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("rel. perplexity", 0, 0); ctx.restore();

    // training length boundary
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(1), y1); ctx.lineTo(X(1), y0); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "#cbd5e1"; ctx.textAlign = "center"; ctx.fillText("L_train", X(1), y1 + 8);

    // threshold line
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x0, Y(THRESH)); ctx.lineTo(x1, Y(THRESH)); ctx.stroke(); ctx.setLineDash([]);

    // usable-context shading for selected method
    const u = stats.usable;
    if (u > 0) { ctx.fillStyle = "rgba(52,211,153,0.08)"; ctx.fillRect(x0, y1, X(u) - x0, y0 - y1); }

    // curves: faint for others, bold for selected
    for (const m of METHODS) {
      const sel = m.id === method;
      ctx.strokeStyle = sel ? m.color : "rgba(148,163,184,0.28)";
      ctx.lineWidth = sel ? 2.2 : 1;
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const p = (i / 240) * s; const xx = X(p), yy = Y(ppl(m.id, p, s)); if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke();
    }

    // x labels
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.font = "8px monospace";
    ctx.fillText("0", x0, CH - 14);
    ctx.fillText(((L_TRAIN_TOK * s) / 1024).toFixed(0) + "k tokens", x1 - 16, CH - 14);
  }, [method, s, stats]);

  const targetK = (L_TRAIN_TOK * s) / 1024;
  const usableK = (L_TRAIN_TOK * stats.usable) / 1024;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>PERPLEXITY vs POSITION — all methods (selected bold), L_train = {(L_TRAIN_TOK / 1024).toFixed(0)}k</span>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.05 : 1.4), height: CH * (mobile ? 1.05 : 1.4), borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={METHODS.map(m => ({ label: m.label, color: m.color }))} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// EXTENSION METHOD" tone="violet" value={method} onChange={setMethod}
        options={METHODS.map(m => ({ value: m.id, label: m.label }))}
        help="How inference positions are mapped onto the trained rotary range. None = use raw positions (extrapolate). PI = linearly compress them. NTK-aware = rescale the RoPE base by frequency. YaRN = per-frequency NTK plus attention scaling." />
      <Slider label="// TARGET CONTEXT" min={1} max={16} step={0.5} value={factor} onChange={setFactor}
        suffix={"x  (" + targetK.toFixed(0) + "k)"} tone="violet"
        help="How many times longer than the training length you want to run. 1x = no extension. Push it up and watch naive extrapolation explode past L_train while the rescaling methods stay bounded — at a cost that grows with the factor." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EXTENSION" value={s.toFixed(1) + "x"} accent="var(--violet-lt)" />
        <StatReadout label="MEAN PERPLEXITY" value={stats.mean.toFixed(2) + "x"} accent={stats.mean < 1.3 ? "#34d399" : stats.mean < 2 ? "#fbbf24" : "#f87171"} />
        <StatReadout label="USABLE CONTEXT" value={usableK.toFixed(0) + "k"} accent={usableK >= targetK * 0.95 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="TARGET" value={targetK.toFixed(0) + "k"} accent="var(--dim)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Rotary position embeddings encode a token's place by rotating its query and
        key vectors by an angle proportional to position. A model trained to length
        <b> L_train</b> only ever sees those rotations up to a point — so feeding it
        a longer context puts the far tokens at <b>unseen rotation angles</b>. With
        no fix (red), perplexity is flat inside the trained range and then falls off
        a cliff the instant you cross <b>L_train</b>.
      </DemoP>
      <DemoP>
        Crank the <b>target context</b> and compare. <b>Position Interpolation</b>{" "}
        squeezes all positions back into the trained range — bounded everywhere, but
        it pays a flat perplexity tax that grows with the factor. <b>NTK-aware</b>{" "}
        scaling stretches only the low-frequency dimensions, keeping fine local
        resolution, so it sits lower until the very far positions. <b>YaRN</b>{" "}
        combines both and stays nearly flat. The green shading is the usable context
        — how far you can actually go before quality crosses the threshold.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Context-length extension is how a 4k or 8k model becomes a 128k+ model
        without retraining from scratch. It rests entirely on{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/rope/`} style={{ color: "#a855f7" }}>RoPE</a>{" "}
        and the broader idea of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/positional-encoding/`} style={{ color: "#a855f7" }}>positional
        encoding</a>: because RoPE's relative structure is a smooth function of
        position, you can reparameterize it post-hoc. PI, NTK-aware scaling, and
        YaRN are the methods that shipped in real long-context releases (Llama,
        Qwen, Code Llama).
      </DemoP>
      <DemoP>
        Bigger windows aren't free even when perplexity holds: the KV cache and
        attention cost grow with length, which is why context extension is always
        paired with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kv-cache-eviction/`} style={{ color: "#a855f7" }}>KV-cache
        eviction</a> and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/paged-attention/`} style={{ color: "#a855f7" }}>paged
        attention</a>. And a low perplexity doesn't guarantee the model <i>uses</i>{" "}
        the long context well — see{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/lost-in-the-middle/`} style={{ color: "#a855f7" }}>lost
        in the middle</a>.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="Context Extension"
      subtitle="Stretch a RoPE model past its training length. Naive extrapolation falls off a cliff; PI, NTK-aware, and YaRN rescale the positions to hold quality."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ContextExtensionDemo />);
