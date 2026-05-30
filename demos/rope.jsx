// demos/rope.jsx — Rotary Position Embedding (RoPE) explorer.
//
// RoPE encodes position by rotating Q and K in 2-D pair-blocks by an angle
// theta_i(m) = m * 10000^(-2i/d). The killer property: the attention score
// q_m · k_n depends ONLY on the relative position (m - n), not on m and n
// individually. The demo shows three things at once:
//
//   - left: a 2-D vector pair (one rotation band) for Q at position m_q and
//     K at every position 0..L. The k-vectors rotate by an amount that grows
//     linearly with position.
//   - middle: the resulting attention score q·k at each position, plotted
//     as a curve. Sliding m_q just translates this curve — the relative-
//     position invariance you can SEE.
//   - right: a heatmap of attention(m, n) over all (m,n) pairs to confirm
//     the diagonal-banded structure RoPE produces.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup, Toggle,
} = window;

const W = 540, H = 460;
const SEQ = 20;       // visible sequence length

// Base frequency for the position-rotation schedule. The real RoPE uses 10000.
function theta(m, i, base) {
  // i is the rotation-band index in [0, d/2)
  return m * Math.pow(base, -2 * i / Math.max(1, 8));
}

function rotate2(vx, vy, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [c * vx - s * vy, s * vx + c * vy];
}

function ropeScore(q, k, mq, mk, base, dPairs) {
  // Sum the dot products of the rotated q and k across all rotation bands.
  // q and k each get rotated by theta(m, i, base) in pair i.
  let s = 0;
  for (let i = 0; i < dPairs; i++) {
    const [qx, qy] = rotate2(q[2 * i], q[2 * i + 1], theta(mq, i, base));
    const [kx, ky] = rotate2(k[2 * i], k[2 * i + 1], theta(mk, i, base));
    s += qx * kx + qy * ky;
  }
  return s / Math.sqrt(2 * dPairs);
}

function RopeDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [mq, setMq] = _useState(8);
  const [base, setBase] = _useState(10000);
  const [dPairs, setDPairs] = _useState(4);
  const [band, setBand] = _useState(0);

  // Random fixed Q, K vectors of dim 2*dPairs (max 8).
  const Q = _useRef([0.7, 0.4, 0.3, -0.5, 0.6, 0.2, -0.4, 0.5]).current;
  const K = _useRef([0.6, 0.5, 0.4, -0.4, 0.3, 0.6, -0.5, 0.3]).current;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // ── Left: 2-D rotation panel for the selected band ──
    const lx0 = 14, ly0 = 14, lW = 170, lH = 170;
    const cx = lx0 + lW / 2, cy = ly0 + lH / 2;
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.lineWidth = 1;
    ctx.strokeRect(lx0, ly0, lW, lH);
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("BAND " + band + " (2D)", lx0, ly0 - 4);
    // axes
    ctx.strokeStyle = "rgba(96,165,250,0.22)";
    ctx.beginPath(); ctx.moveTo(lx0, cy); ctx.lineTo(lx0 + lW, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, ly0); ctx.lineTo(cx, ly0 + lH); ctx.stroke();

    const scale = 55;
    // K rotated at every position (faint trail)
    for (let m = 0; m < SEQ; m++) {
      const [kx, ky] = rotate2(K[2 * band], K[2 * band + 1], theta(m, band, base));
      const isQpos = m === mq;
      ctx.strokeStyle = isQpos ? "#fbbf24" : "rgba(192,132,252,0.25)";
      ctx.lineWidth = isQpos ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + kx * scale, cy - ky * scale); ctx.stroke();
    }
    // Q rotated at mq
    const [qx, qy] = rotate2(Q[2 * band], Q[2 * band + 1], theta(mq, band, base));
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + qx * scale, cy - qy * scale); ctx.stroke();
    ctx.fillStyle = "#60a5fa"; ctx.beginPath(); ctx.arc(cx + qx * scale, cy - qy * scale, 4, 0, Math.PI * 2); ctx.fill();

    // ── Middle: attention score curve over k-positions ──
    const mx0 = 200, my0 = 14, mW = 200, mH = 170;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("q · k vs key position", mx0, my0 - 4);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(mx0, my0, mW, mH);
    // compute scores at each k position
    const scores = [];
    for (let n = 0; n < SEQ; n++) scores.push(ropeScore(Q, K, mq, n, base, dPairs));
    const sMax = Math.max(...scores.map(Math.abs), 1e-9);
    // zero line
    ctx.strokeStyle = "rgba(96,165,250,0.22)";
    ctx.beginPath(); ctx.moveTo(mx0, my0 + mH / 2); ctx.lineTo(mx0 + mW, my0 + mH / 2); ctx.stroke();
    // curve
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let n = 0; n < SEQ; n++) {
      const x = mx0 + (n + 0.5) * (mW / SEQ);
      const y = my0 + mH / 2 - (scores[n] / sMax) * (mH / 2 - 6);
      if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // mq marker
    {
      const x = mx0 + (mq + 0.5) * (mW / SEQ);
      ctx.strokeStyle = "rgba(96,165,250,0.6)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, my0); ctx.lineTo(x, my0 + mH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#60a5fa"; ctx.font = "9px JetBrains Mono";
      ctx.fillText("m_q=" + mq, x + 3, my0 + 10);
    }

    // ── Right: full attention(m, n) heatmap ──
    const hx0 = 420, hy0 = 14, hW = 110, hH = 170;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("attn(m,n)", hx0, hy0 - 4);
    const cs = Math.min(hW, hH) / SEQ;
    for (let m = 0; m < SEQ; m++) {
      for (let n = 0; n < SEQ; n++) {
        const s = ropeScore(Q, K, m, n, base, dPairs);
        const mag = Math.min(1, Math.abs(s) / sMax);
        ctx.fillStyle = s >= 0
          ? `rgba(96,165,250,${0.08 + 0.82 * mag})`
          : `rgba(192,132,252,${0.08 + 0.82 * mag})`;
        ctx.fillRect(hx0 + n * cs, hy0 + m * cs, cs - 0.5, cs - 0.5);
      }
    }
    ctx.strokeStyle = "rgba(96,165,250,0.25)";
    ctx.strokeRect(hx0, hy0, SEQ * cs, SEQ * cs);

    // ── Bottom: schedule of theta_i(m) for visible bands ──
    const px0 = 14, py0 = 220, pW = W - 28, pH = 200;
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("rotation angle theta_i(m) per band (low band = fast, high band = slow)", px0, py0 - 4);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(px0, py0, pW, pH);
    // zero line
    ctx.strokeStyle = "rgba(96,165,250,0.22)";
    ctx.beginPath(); ctx.moveTo(px0, py0 + pH / 2); ctx.lineTo(px0 + pW, py0 + pH / 2); ctx.stroke();
    const palette = ["#fbbf24", "#60a5fa", "#c084fc", "#34d399"];
    for (let i = 0; i < dPairs; i++) {
      ctx.strokeStyle = palette[i % palette.length];
      ctx.lineWidth = 1.6; ctx.beginPath();
      for (let m = 0; m < SEQ; m++) {
        const ang = theta(m, i, base);
        // wrap to [-pi, pi] for visibility
        const wrapped = Math.atan2(Math.sin(ang), Math.cos(ang));
        const x = px0 + (m + 0.5) * (pW / SEQ);
        const y = py0 + pH / 2 - (wrapped / Math.PI) * (pH / 2 - 6);
        if (m === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // band legend
      ctx.fillStyle = palette[i % palette.length];
      ctx.font = "9px JetBrains Mono";
      ctx.fillText("band " + i, px0 + pW - 60, py0 + 14 + i * 12);
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, [mq, base, dPairs, band]);

  // Verify the relative-position property numerically: attn(mq, n) should
  // equal attn(mq+1, n+1) up to floating point.
  const probe = Math.abs(ropeScore(Q, K, mq, mq + 3, base, dPairs) - ropeScore(Q, K, 0, 3, base, dPairs));

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// QUERY POSITION m_q" min={0} max={SEQ - 1} step={1} value={mq} onChange={setMq}
        help="Position of the query token. Slide this and watch the attention curve translate — the SHAPE stays identical, only its peak moves. That visual identity is the relative-position invariance RoPE provides for free." />
      <Slider label="// BASE freq" min={100} max={50000} step={100} value={base} onChange={setBase} tone="violet"
        help="The 10000 in theta = m * 10000^(-2i/d). Larger base = slower-rotating high bands = longer position context before aliasing. Llama uses 10000 (or 500000+ for long-context fine-tunes)." />
      <Slider label="// d (pair count)" min={1} max={4} step={1} value={dPairs} onChange={setDPairs}
        help="Number of 2-D rotation bands used. Each band rotates at its own frequency; together they form a position fingerprint. Real models use 32-64+." />
      <SegmentedControl label="// VIEW BAND" value={String(band)} onChange={(v) => setBand(parseInt(v))}
        options={Array.from({ length: dPairs }, (_, i) => ({ value: String(i), label: `${i}` }))} tone="violet"
        help="Which rotation band to draw in the 2-D panel on the left. Low bands rotate fast (high frequency) — good for nearby tokens. High bands rotate slowly — encode coarse position." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="attn(m_q, m_q+3)" value={ropeScore(Q, K, mq, mq + 3, base, dPairs).toFixed(3)} />
        <StatReadout label="| attn(m,m+3) − attn(0,3) |" value={probe.toFixed(4)} accent="#fbbf24" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "Q vector" },
        { color: "#fbbf24", label: "K at m_q" },
        { color: "#c084fc", label: "K elsewhere" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Rotary Position Embedding (RoPE) injects token position into a transformer
        by <b>rotating</b> the Q and K vectors in 2-D blocks, by an angle that grows
        linearly with position: <i>theta_i(m) = m · 10000<sup>−2i/d</sup></i>. Each
        block (band) rotates at its own frequency, and together they form a position
        "fingerprint" you can read out as relative position via a dot product.
      </DemoP>
      <DemoP>
        The magic property is in the right-hand readout: <i>attn(m, n)</i> depends
        only on <i>(m − n)</i>, not on m and n individually. Slide the query
        position <i>m_q</i> and watch the orange attention curve translate — never
        change shape. That's why RoPE generalizes beyond the training-time context
        length while learned absolute embeddings don't.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        RoPE is the positional encoding behind almost every modern open-weight LLM:
        Llama 1/2/3, Mistral, Qwen, DeepSeek, and Gemma all use it. Sinusoidal
        positional encodings (the original 2017 transformer) get added once at the
        input; RoPE acts <i>inside</i> the attention dot product, every layer. That
        recurrence is what makes the relative-position structure clean enough to
        extend with tricks like NTK-aware scaling, YaRN, and dynamic context-length
        stretching.
      </DemoP>
      <DemoP>
        The <b>base frequency</b> is the most consequential single knob: bumping it
        from 10k to 500k+ is the standard recipe behind long-context fine-tunes (32k →
        128k → 1M tokens). The high-frequency bands carry fine local position; the
        low-frequency bands carry coarse "where in the document" signal. Look at the
        bottom panel: when you crank the base, the high bands flatten and the model
        sees longer effective context before wrap-around.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRANSFORMERS" title="RoPE Explorer"
      subtitle="Rotary position embeddings — see relative-position invariance fall out of pair-wise rotations."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/transformers/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RopeDemo />);
