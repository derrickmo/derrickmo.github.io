// demos/channel-capacity.jsx — Shannon's binary symmetric channel. A bit is
// flipped with probability p; the mutual information I(X;Y) between input and
// output measures how much survives, and the CAPACITY C = 1 - H(p) is the most
// you can push through reliably (achieved by a uniform input). Real exact
// information-theoretic quantities; the I-vs-input and C-vs-noise curves are
// computed from the definitions.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const log2 = z => Math.log(z) / Math.LN2;
const Hb = x => { if (x <= 0 || x >= 1) return 0; return -x * log2(x) - (1 - x) * log2(1 - x); };
// I(X;Y) for a BSC with input P(X=1)=q and crossover p
function MI(q, p) { const py1 = (1 - q) * p + q * (1 - p); return Hb(py1) - Hb(p); }

function ChannelCapacityDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [p, setP] = _useState(0.1);
  const [q, setQ] = _useState(0.5);
  const [, setTick] = _useState(0);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // ---- channel diagram (left) ----
    const ix = 70, oy0 = 70, oy1 = 180, ox = 250;
    const inR0 = 10 + (1 - q) * 26, inR1 = 10 + q * 26;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("BINARY SYMMETRIC CHANNEL", 30, 28);
    // edges
    const edge = (x1, y1, x2, y2, prob, flip) => {
      ctx.strokeStyle = flip ? `rgba(248,113,113,${0.25 + prob})` : `rgba(96,165,250,${0.25 + prob})`;
      ctx.lineWidth = 1 + prob * 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = flip ? "rgba(248,113,113,0.9)" : "rgba(96,165,250,0.8)"; ctx.font = "9px JetBrains Mono";
      ctx.fillText(prob.toFixed(2), (x1 + x2) / 2 - 8, (y1 + y2) / 2 - 4 + (flip ? 12 : -4));
    };
    edge(ix, oy0, ox, oy0, 1 - p, false); edge(ix, oy0, ox, oy1, p, true);
    edge(ix, oy1, ox, oy1, 1 - p, false); edge(ix, oy1, ox, oy0, p, true);
    const node = (x, y, r, lab, col) => { ctx.fillStyle = "#0a0e1a"; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.font = "12px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText(lab, x, y + 4); ctx.textAlign = "left"; };
    node(ix, oy0, inR0, "0", "#60a5fa"); node(ix, oy1, inR1, "1", "#a855f7");
    node(ox, oy0, 16, "0", "#94a3b8"); node(ox, oy1, 16, "1", "#94a3b8");
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
    ctx.fillText("X (input)", ix, oy1 + 44); ctx.fillText("Y (output)", ox, oy1 + 44);
    ctx.fillText(`P(X=1) = ${q.toFixed(2)}`, ix, oy0 - 30);

    // ---- I vs input-distribution curve (right top) ----
    const c = 1 - Hb(p); // capacity
    const cx = 330, cyT = 50, cw = 180, chh = 90;
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("I(X;Y) vs input P(X=1)", cx, cyT - 6);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(cx, cyT, cw, chh);
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const qq = i / 100, mi = MI(qq, p); const px = cx + qq * cw, py = cyT + chh - (mi / Math.max(c, 1e-6)) * (chh - 6) - 3; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    // current q marker
    const mi = MI(q, p), px = cx + q * cw, py = cyT + chh - (mi / Math.max(c, 1e-6)) * (chh - 6) - 3;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(52,211,153,0.4)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx + 0.5 * cw, cyT); ctx.lineTo(cx + 0.5 * cw, cyT + chh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(52,211,153,0.7)"; ctx.font = "9px JetBrains Mono"; ctx.fillText("max at 0.5", cx + 0.5 * cw - 22, cyT + chh + 12);

    // ---- capacity vs noise curve (right bottom) ----
    const cyB = 210;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText("CAPACITY  C = 1 - H(p)", cx, cyB - 6);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(cx, cyB, cw, chh);
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const pp = i / 100, cc = 1 - Hb(pp); const xx = cx + pp * cw, yy = cyB + chh - cc * (chh - 6) - 3; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    const xx = cx + p * cw, yy = cyB + chh - c * (chh - 6) - 3;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(xx, yy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono"; ctx.fillText("p=0", cx, cyB + chh + 12); ctx.fillText("0.5 (useless)", cx + cw / 2 - 18, cyB + chh + 12);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [p, q]);

  const c = 1 - Hb(p), mi = MI(q, p);
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// FLIP PROBABILITY p" min={0} max={0.5} step={0.01} value={p} onChange={setP}
        help="Noise: the chance each transmitted bit arrives flipped. p=0 is a perfect channel (capacity 1 bit); p=0.5 is useless (output is independent of input, capacity 0) - the channel is symmetric so p and 1-p behave the same." />
      <Slider label="// INPUT P(X=1) q" min={0} max={1} step={0.02} value={q} onChange={setQ}
        help="How you use the channel: the fraction of 1s you send. Mutual information is maximized by a uniform input (q=0.5); skew it and you transmit less than the channel could carry." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setQ(0.5)} primary>OPTIMAL INPUT</DemoButton>
        <DemoButton onClick={() => { setP(0.1); setQ(0.5); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="I(X;Y)" value={mi.toFixed(3) + " bits"} accent="#34d399" />
        <StatReadout label="CAPACITY C" value={c.toFixed(3) + " bits"} accent="#fbbf24" />
        <StatReadout label="% OF CAPACITY" value={c > 1e-6 ? (mi / c * 100).toFixed(0) + "%" : "-"} accent="var(--blue-lt)" />
        <StatReadout label="NOISE H(p)" value={Hb(p).toFixed(3) + " bits"} accent="#f87171" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "correct transmission (1-p)" },
        { color: "#f87171", label: "bit flip (p)" },
        { color: "#34d399", label: "mutual information" },
        { color: "#fbbf24", label: "channel capacity" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Send a bit down a noisy wire that flips it with probability <b>p</b>. How much information
        actually gets through? That's the <b>mutual information</b> I(X;Y) between what you send and
        what arrives — and the maximum of it over all ways of using the channel is its <b>capacity</b>,
        Shannon's famous C = 1 − H(p). At p = 0 a full bit survives; as noise rises capacity falls; at
        <b> p = 0.5</b> the output is pure coin-flip noise and capacity hits <b>zero</b> — no code,
        however clever, can send anything reliably.
      </DemoP>
      <DemoP>
        Two knobs, two lessons. <b>Input P(X=1)</b>: the I-vs-input curve peaks at a <b>uniform</b>
        0.5 — using the channel asymmetrically wastes it (hit OPTIMAL INPUT to sit at the peak).
        <b> Flip probability</b>: the capacity curve is C = 1 − H(p), the clean statement that the
        channel's noise <i>is</i> an entropy you must pay. Shannon's coding theorem says you can
        communicate at any rate below C with vanishing error — and nothing above it.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Channel capacity is the founding result of information theory and it quietly bounds everything
        that moves data: every modem, Wi-Fi link, SSD, QR code, and deep-space probe uses error-
        correcting codes (Hamming, LDPC, turbo, polar) to approach this limit. It is built from
        <a href={`${window.__DM_BASE || "../../"}visualize/mutual-information/`}> mutual information</a> and
        <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`}> entropy</a>, the same quantities that
        define compression and the cross-entropy loss models are trained with.
      </DemoP>
      <DemoP>
        The same capacity lens increasingly frames machine learning itself: the information-bottleneck
        view treats a network layer as a channel that must pass label-relevant information while
        discarding the rest, and "channel capacity" arguments appear in analyses of attention bandwidth,
        quantized/low-precision links, and what a finite context window can actually carry. The deep
        idea on screen — that noise sets a hard, computable ceiling on reliable information — recurs far
        beyond communication.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Channel Capacity"
      subtitle="How much information survives a noisy channel - Shannon's C = 1 - H(p), the limit no code can beat."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ChannelCapacityDemo />);
