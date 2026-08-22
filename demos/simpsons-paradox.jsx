// demos/simpsons-paradox.jsx — Simpson's paradox / confounding.
//
// Within every subgroup, more X means more Y (positive slope). But a confounder
// shifts the groups so that groups with higher X sit at lower Y overall — and the
// POOLED regression over all points slopes the opposite way. Aggregating reverses
// the conclusion. CONFOUNDING STRENGTH controls how far the groups are pulled
// apart; turn it up and the pooled (gray) line flips sign while the per-group
// (colored) lines stay positive. The fix is to condition on the group.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const GCOL = ["#60a5fa", "#a855f7", "#fbbf24", "#34d399"];
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function lsSlope(pts) {
  const n = pts.length; if (n < 2) return 0;
  let mx = 0, my = 0; pts.forEach(p => { mx += p.x; my += p.y; }); mx /= n; my /= n;
  let cov = 0, vx = 0; pts.forEach(p => { cov += (p.x - mx) * (p.y - my); vx += (p.x - mx) ** 2; });
  return vx ? cov / vx : 0;
}

function SimpsonsDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [conf, setConf] = _useState(1.0);
  const [wslope, setWslope] = _useState(0.8);
  const [G, setG] = _useState(3);
  const [showGroups, setShowGroups] = _useState(true);
  const [, force] = _useState(0);
  const ptsRef = _useRef([]);

  function gen() {
    const pts = [];
    for (let g = 0; g < G; g++) {
      const off = (g - (G - 1) / 2);
      const mx = off * 1.0 * conf, my = -off * 1.2 * conf;   // confounder: higher-X group sits lower in Y
      for (let i = 0; i < 36; i++) {
        const x = mx + 0.5 * randn();
        const y = my + wslope * (x - mx) + 0.35 * randn();
        pts.push({ x, y, g });
      }
    }
    ptsRef.current = pts; force(x => x + 1);
  }
  _useEffect(() => { gen(); /* eslint-disable-next-line */ }, [conf, wslope, G]);

  const pts = ptsRef.current;
  const pooledSlope = pts.length ? lsSlope(pts) : 0;
  const groupSlopes = Array.from({ length: G }, (_, g) => lsSlope(pts.filter(p => p.g === g)));
  const avgWithin = groupSlopes.reduce((a, b) => a + b, 0) / G;
  const flip = Math.sign(pooledSlope) !== Math.sign(avgWithin) && Math.abs(pooledSlope) > 0.05;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    const R = 2.6, px = 40, py = 40, pw = W - 80, ph = 300;
    const sx = (x) => px + ((x + R) / (2 * R)) * pw, sy = (y) => py + ph - ((y + R) / (2 * R)) * ph;
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = "#94a3b8"; ctx.fillText("X →", px + pw - 30, py + ph + 14); ctx.save(); ctx.translate(px - 22, py + 20); ctx.fillText("Y", 0, 0); ctx.restore();

    // points
    pts.forEach(p => {
      ctx.fillStyle = showGroups ? GCOL[p.g] : "rgba(148,163,184,0.6)";
      ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    });
    // per-group regression lines
    if (showGroups) {
      for (let g = 0; g < G; g++) {
        const gp = pts.filter(p => p.g === g); if (gp.length < 2) continue;
        let mx = 0, my = 0; gp.forEach(p => { mx += p.x; my += p.y; }); mx /= gp.length; my /= gp.length;
        const sl = groupSlopes[g];
        const xs = Math.min(...gp.map(p => p.x)), xe = Math.max(...gp.map(p => p.x));
        ctx.strokeStyle = GCOL[g]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx(xs), sy(my + sl * (xs - mx))); ctx.lineTo(sx(xe), sy(my + sl * (xe - mx))); ctx.stroke();
      }
    }
    // pooled regression line
    let mx = 0, my = 0; pts.forEach(p => { mx += p.x; my += p.y; }); mx /= pts.length; my /= pts.length;
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(sx(-R), sy(my + pooledSlope * (-R - mx))); ctx.lineTo(sx(R), sy(my + pooledSlope * (R - mx))); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#e2e8f0"; ctx.fillText("pooled (ignores group)", px + 8, py + 16);

    // verdict
    const vy = py + ph + 36;
    ctx.font = "11px JetBrains Mono";
    ctx.fillStyle = pooledSlope >= 0 ? "#34d399" : "#f87171";
    ctx.fillText("pooled slope: " + (pooledSlope >= 0 ? "+" : "") + pooledSlope.toFixed(2) + (pooledSlope >= 0 ? "  (X↑ → Y↑)" : "  (X↑ → Y↓)"), px, vy);
    ctx.fillStyle = avgWithin >= 0 ? "#34d399" : "#f87171";
    ctx.fillText("within-group slope: " + (avgWithin >= 0 ? "+" : "") + avgWithin.toFixed(2), px, vy + 18);
    if (flip) { ctx.fillStyle = "#fbbf24"; ctx.font = "600 13px JetBrains Mono"; ctx.fillText("⚠ the conclusion REVERSES when you account for the group", px, vy + 40); }
    else { ctx.fillStyle = "#34d399"; ctx.fillText("pooled and within-group agree (no paradox)", px, vy + 40); }
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
      <Slider label="// CONFOUNDING STRENGTH" min={0} max={1.6} step={0.1} value={conf} onChange={setConf} tone="violet"
        help="How far the confounder pulls the groups apart (higher-X groups pushed to lower Y). At 0 there's no paradox; turn it up and the pooled line flips to the opposite sign of the within-group lines — the paradox appears." />
      <Slider label="// WITHIN-GROUP SLOPE" min={-1} max={1.5} step={0.1} value={wslope} onChange={setWslope}
        help="The true relationship inside each group. Keep it positive and crank confounding to get the classic reversal; the per-group colored lines always reflect this slope." />
      <Slider label="// GROUPS" min={2} max={4} step={1} value={G} onChange={setG}
        help="Number of confounding subgroups (e.g., severity levels, departments, batches). More groups make the staircase of group means — and thus the misleading pooled trend — clearer." />
      <Toggle label="// SHOW GROUPS" checked={showGroups} onChange={setShowGroups}
        help="Off: see the data as a naive analyst would — one gray cloud and the pooled trend. On: reveal the subgroups and their real (opposite) within-group trends. Toggling is the whole 'aha'." />
      <DemoButton onClick={gen} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="POOLED" value={(pooledSlope >= 0 ? "+" : "") + pooledSlope.toFixed(2)} accent={pooledSlope >= 0 ? "#34d399" : "#f87171"} />
        <StatReadout label="WITHIN" value={(avgWithin >= 0 ? "+" : "") + avgWithin.toFixed(2)} accent={avgWithin >= 0 ? "#34d399" : "#f87171"} />
      </div>
      <StatReadout label="PARADOX" value={flip ? "REVERSED" : "consistent"} accent={flip ? "#fbbf24" : "#34d399"} />
      <Legend items={[
        { color: "#e2e8f0", label: "pooled trend" },
        { color: "#60a5fa", label: "group trends" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Every colored cluster slopes <i>up</i>: inside each group, more X means more
        Y. Yet the dashed pooled line — the trend you'd report if you ignored the
        groups — slopes <i>down</i>. That's Simpson's paradox: a confounder (the
        thing that defines the groups) shifts the clusters so that groups with high
        X happen to sit at low Y, and naively pooling everything inverts the
        relationship. Toggle SHOW GROUPS off to see exactly the misleading picture
        a careless analysis would produce.
      </DemoP>
      <DemoP>
        Drag CONFOUNDING STRENGTH from 0 upward and watch the pooled slope cross
        zero and flip sign while the within-group slopes never move — the paradox
        switches on. The lesson isn't that statistics lie; it's that the right
        analysis depends on the causal story. If the group is a confounder you must
        condition on it (the within-group trend is correct); the aggregate answer
        is the wrong one to act on.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Simpson's paradox is the most famous face of confounding, the central
        problem of causal inference: an observed correlation can be created,
        erased, or reversed by a lurking variable. It's why "correlation isn't
        causation" has teeth — and why real studies adjust for confounders
        (stratification, regression controls) or randomize to break the
        confounder's link to treatment. Famous real cases: the Berkeley admissions
        "bias" that reversed by department, and treatment-vs-severity in medicine.
      </DemoP>
      <DemoP>
        It connects directly to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/fairness/`} style={{ color: "#a855f7" }}>fairness</a>{" "}
        (an aggregate disparity can flip within subgroups) and to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/regression/`} style={{ color: "#a855f7" }}>regression</a>{" "}
        (which estimate you trust depends on what you control for). The formal tools
        — causal graphs, the back-door criterion, and the do-operator — exist
        precisely to decide which variables to condition on so the number you report
        means what you think it means.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Simpson's Paradox"
      subtitle="Every subgroup trends up, the pooled data trends down. See how a confounder reverses the conclusion — and why you have to condition on it."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SimpsonsDemo />);
