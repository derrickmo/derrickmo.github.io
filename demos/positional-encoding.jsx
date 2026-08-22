// demos/positional-encoding.jsx — sinusoidal PE heatmap + RoPE rotation view.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 400;

// diverging color: -1 → cyan, 0 → dark, +1 → violet
function diverge(v) {
  const t = (v + 1) / 2;
  const neg = [34, 211, 238], mid = [10, 20, 40], pos = [192, 132, 252];
  let c;
  if (t < 0.5) { const f = t / 0.5; c = neg.map((x, i) => Math.round(x + (mid[i] - x) * f)); }
  else { const f = (t - 0.5) / 0.5; c = mid.map((x, i) => Math.round(x + (pos[i] - x) * f)); }
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function PositionalEncodingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);

  const [mode, setMode] = _useState("sin");
  const [len, setLen] = _useState(32);
  const [dim, setDim] = _useState(32);
  const [base, setBase] = _useState(10000);
  const [pos, setPos] = _useState(6);

  function drawSinusoidal(ctx) {
    const leftM = 70, topM = 40;
    const gw = W - leftM - 20, gh = H - topM - 36;
    const cw = gw / dim, ch = gh / len;
    for (let p = 0; p < len; p++) for (let d = 0; d < dim; d++) {
      const i = Math.floor(d / 2);
      const angle = p / Math.pow(base, (2 * i) / dim);
      const v = d % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
      ctx.fillStyle = diverge(v);
      ctx.fillRect(leftM + d * cw, topM + p * ch, Math.ceil(cw), Math.ceil(ch));
    }
    ctx.fillStyle = "#475569"; ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left"; ctx.fillText("DIMENSION →", leftM, 24);
    ctx.save(); ctx.translate(20, topM + gh / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.fillText("POSITION →", 0, 0); ctx.restore();
  }

  function drawRoPE(ctx) {
    // a row of frequency-band dials; each rotates at its own rate with position
    const bands = Math.min(8, Math.floor(dim / 2));
    const cols = 4, rows = Math.ceil(bands / cols);
    const cellW = (W - 40) / cols, cellH = (H - 80) / rows;
    const R = Math.min(cellW, cellH) / 2 - 22;
    ctx.fillStyle = "#475569"; ctx.font = "11px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText(`each dial = one frequency band · position = ${pos}`, W / 2, 22);
    for (let b = 0; b < bands; b++) {
      const r = Math.floor(b / cols), c = b % cols;
      const cx = 20 + c * cellW + cellW / 2, cy = 50 + r * cellH + cellH / 2;
      const theta = pos / Math.pow(base, (2 * b) / dim);
      // circle
      ctx.strokeStyle = "rgba(96,165,250,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      // trail of previous positions
      for (let q = 0; q <= pos; q++) {
        const th = q / Math.pow(base, (2 * b) / dim);
        ctx.fillStyle = `rgba(192,132,252,${0.12 + 0.5 * (q / Math.max(1, pos))})`;
        ctx.beginPath(); ctx.arc(cx + Math.cos(th) * R, cy - Math.sin(th) * R, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      // current vector
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(theta) * R, cy - Math.sin(theta) * R); ctx.stroke();
      ctx.fillStyle = "#e0e7ff"; ctx.beginPath(); ctx.arc(cx + Math.cos(theta) * R, cy - Math.sin(theta) * R, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#60a5fa"; ctx.font = "9px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText(`band ${b}`, cx, cy + R + 14);
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (mode === "sin") drawSinusoidal(ctx); else drawRoPE(ctx);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [mode, len, dim, base, pos]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// ENCODING" value={mode} onChange={setMode}
        options={[{ value: "sin", label: "Sinusoidal" }, { value: "rope", label: "RoPE" }]}
        help="Sinusoidal adds a fixed sine/cosine vector per position; RoPE rotates each query/key slice by an angle set by position, encoding relative distance. Modern LLMs use RoPE." />
      {mode === "sin"
        ? <Slider label="// SEQUENCE LENGTH" min={8} max={64} value={len} onChange={setLen}
            help="How many token positions to show (rows of the heatmap). Longer sequences reveal the slow low-frequency stripes that encode coarse position." />
        : <Slider label="// POSITION" min={0} max={48} value={pos} onChange={setPos} tone="violet"
            help="Which token position to visualize on the RoPE dials. Drag it: low-frequency bands rotate slowly, high-frequency bands fast." />}
      <Slider label="// MODEL DIM (d)" min={8} max={64} step={2} value={dim} onChange={setDim}
        help="The size of the encoding vector. Higher dimensions pack more frequency bands, giving finer-grained position information." />
      <Slider label="// BASE (θ)" min={100} max={20000} step={100} value={base} onChange={setBase}
        help="The wavelength scale. A larger base stretches frequencies to longer wavelengths — the standard lever (θ/NTK scaling) for extending a model to longer contexts." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="DIM" value={dim} />
        <StatReadout label="BASE" value={base} accent="var(--violet-lt)" />
      </div>
      {mode === "sin"
        ? <Legend items={[{ color: diverge(-1), label: "-1" }, { color: diverge(0), label: "0" }, { color: diverge(1), label: "+1" }]} />
        : <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Drag POSITION — low bands rotate slowly, high bands fast.</div>}
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Attention has no built-in sense of order, so we inject position directly.
        <b> Sinusoidal</b> encoding gives every position a fixed vector built from
        sines and cosines at geometrically spaced frequencies:
        <i> PE(pos, 2i) = sin(pos / θ^(2i/d))</i> and the cosine for the odd index.
        Left columns are high-frequency (flip every few positions); right columns
        are low-frequency (drift slowly). That mix lets the model read both fine and
        coarse position. Raise the <b>base θ</b> and the stripes stretch — longer
        wavelengths, better for long contexts.
      </DemoP>
      <DemoP>
        <b>RoPE</b> (rotary) takes the same frequency idea but <i>rotates</i> each
        2-D slice of the query/key by an angle proportional to position. Drag the
        position slider: each dial spins at its own rate. Because attention compares
        a query at position <i>m</i> with a key at position <i>n</i>, the rotation
        cancels down to a function of <i>m − n</i> — so RoPE encodes
        <em> relative</em> position, which is why modern LLMs use it.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Position encoding is the unsung fix for attention's order-blindness — without it,
        "dog bites man" and "man bites dog" look identical to a transformer. Every
        transformer needs one, and the choice has real downstream effect: it largely
        determines how gracefully a model handles sequences longer than it was trained on.
      </DemoP>
      <DemoP>
        This is an active frontier, not settled history. The field moved from fixed
        sinusoidal to learned to <b>RoPE</b> (rotary) — now standard in Llama, Mistral, and
        most open LLMs precisely because rotations encode <i>relative</i> position. The
        base-θ knob you're dragging is the same one behind context-length-extension methods
        (position interpolation, NTK-aware and YaRN scaling) that stretch a model from a few
        thousand tokens to hundreds of thousands.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      title="Positional Encoding"
      subtitle="See how sinusoidal and rotary encodings give a transformer a sense of order."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PositionalEncodingDemo />);
