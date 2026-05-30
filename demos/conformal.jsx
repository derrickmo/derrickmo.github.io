// demos/conformal.jsx — split conformal prediction for classification.
//
// Instead of one label, output a SET of labels guaranteed to contain the truth
// with probability >= 1 - alpha. Split conformal (LAC / threshold method):
//   1. On a calibration set, score each point s_i = 1 - softmax_true(x_i).
//   2. q̂ = the ceil((n+1)(1-alpha))/n empirical quantile of those scores.
//   3. For a new x, prediction set = { c : softmax_c(x) >= 1 - q̂ }.
// Marginal coverage P(y ∈ set) >= 1 - alpha holds for ANY model, even a bad or
// miscalibrated one — that's the distribution-free guarantee. What model quality
// buys you isn't coverage, it's small (informative) sets.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function softmax(l, temp) { const z = l.map(x => x / temp); const m = Math.max(...z); const e = z.map(v => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }

const N_CAL = 500, N_TEST = 2000, N_SHOW = 6;

function ConformalDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [alpha, setAlpha] = _useState(0.1);
  const [skill, setSkill] = _useState(3.0);
  const [temp, setTemp] = _useState(1.0);
  const [C, setC] = _useState(6);
  const [tick, setTick] = _useState(0);
  const dataRef = _useRef({ cal: [], test: [] });

  function gen() {
    const mk = (n) => Array.from({ length: n }, () => {
      const y = (Math.random() * C) | 0;
      const logits = Array.from({ length: C }, (_, c) => (c === y ? skill : 0) + 0.7 * randn());
      return { p: softmax(logits, temp), y };
    });
    dataRef.current = { cal: mk(N_CAL), test: mk(N_TEST) };
  }
  _useEffect(() => { gen(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [skill, temp, C]);

  // calibrate
  const { cal, test } = dataRef.current;
  let qhat = 1, coverage = 0, avgSize = 0, sizeHist = [];
  if (cal.length) {
    const scores = cal.map(d => 1 - d.p[d.y]).sort((a, b) => a - b);
    const idx = Math.min(scores.length - 1, Math.ceil((scores.length + 1) * (1 - alpha)) - 1);
    qhat = scores[Math.max(0, idx)];
    const thresh = 1 - qhat;
    let cov = 0, sz = 0; sizeHist = new Array(C + 1).fill(0);
    test.forEach(d => {
      let setSize = 0, inSet = false;
      for (let c = 0; c < C; c++) if (d.p[c] >= thresh) { setSize++; if (c === d.y) inSet = true; }
      if (inSet) cov++; sz += setSize; sizeHist[setSize]++;
    });
    coverage = cov / test.length; avgSize = sz / test.length;
  }
  const target = 1 - alpha, thresh = 1 - qhat;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("PREDICTION SETS  ·  filled = in set, ring = true label (green covered / red missed)", 20, 22);

    // example test items
    const cellW = (W - 40) / C, y0 = 34, rh = 26;
    for (let r = 0; r < N_SHOW && r < test.length; r++) {
      const d = test[r], y = y0 + r * rh;
      for (let c = 0; c < C; c++) {
        const x = 20 + c * cellW, inSet = d.p[c] >= thresh;
        ctx.fillStyle = inSet ? "rgba(96,165,250,0.7)" : "rgba(148,163,184,0.12)";
        ctx.fillRect(x + 1, y, cellW - 3, rh - 8);
        if (c === d.y) {
          ctx.strokeStyle = inSet ? "#34d399" : "#f87171"; ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y, cellW - 3, rh - 8);
        }
      }
    }

    // coverage gauge (zoomed 0.5..1)
    const gY = y0 + N_SHOW * rh + 16, gX = 20, gW = W - 40;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("EMPIRICAL COVERAGE  vs  target 1−α", gX, gY - 6);
    const cmap = (v) => gX + ((Math.max(0.5, v) - 0.5) / 0.5) * gW;
    ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(gX, gY + 4, gW, 16);
    ctx.fillStyle = "rgba(52,211,153,0.6)"; ctx.fillRect(gX, gY + 4, cmap(coverage) - gX, 16);
    ctx.strokeStyle = "#fbbf24"; ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cmap(target), gY); ctx.lineTo(cmap(target), gY + 24); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "10px JetBrains Mono";
    ctx.fillText((coverage * 100).toFixed(1) + "%", cmap(coverage) - 16, gY + 36);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("target " + (target * 100).toFixed(0) + "%", cmap(target) - 24, gY - 6);

    // avg set size + histogram
    const hY = gY + 64;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("SET-SIZE DISTRIBUTION  ·  smaller = more informative", 20, hY - 6);
    const maxN = Math.max(...sizeHist, 1), bw = (W - 40) / (C + 1);
    for (let s = 0; s <= C; s++) {
      const x = 20 + s * bw, bh = (sizeHist[s] / maxN) * (H - hY - 30);
      ctx.fillStyle = "rgba(168,85,247,0.6)"; ctx.fillRect(x + 2, H - 24 - bh, bw - 6, bh);
      ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText(String(s), x + bw / 2 - 3, H - 12);
    }
    ctx.fillStyle = "#c084fc"; ctx.font = "600 22px Space Grotesk, JetBrains Mono";
    ctx.fillText("avg " + avgSize.toFixed(2), W - 150, hY + 18);
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
      <Slider label="// ALPHA (miscoverage)" min={0.02} max={0.4} step={0.02} value={alpha} onChange={setAlpha} tone="violet"
        help="The error you'll tolerate: the set is guaranteed to contain the true label at least (1−α) of the time. Lower α → stronger guarantee → larger sets. The coverage knob you actually control." />
      <Slider label="// MODEL SKILL" min={0.5} max={6} step={0.5} value={skill} onChange={setSkill}
        help="How good the underlying classifier is (logit boost on the true class). Crucially, coverage stays at the target no matter what you set here — a worse model just produces bigger sets. Drop it to watch sets balloon while coverage holds." />
      <Slider label="// CONFIDENCE (temp)" min={0.3} max={2} step={0.1} value={temp} onChange={setTemp}
        help="Softmax temperature shaping how peaked the scores are. Conformal doesn't need the model to be calibrated — it recalibrates the threshold from data — so coverage is robust to this too; it mainly nudges set sizes." />
      <Slider label="// CLASSES" min={3} max={8} step={1} value={C} onChange={setC}
        help="Number of labels. More classes generally means larger prediction sets for the same α and skill." />
      <DemoButton onClick={() => { gen(); setTick(t => t + 1); }} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="COVERAGE" value={(coverage * 100).toFixed(1) + "%"} accent={Math.abs(coverage - target) < 0.03 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="TARGET" value={(target * 100).toFixed(0) + "%"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="AVG SET SIZE" value={avgSize.toFixed(2)} accent="#c084fc" />
        <StatReadout label="q̂" value={qhat.toFixed(2)} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "label in set" },
        { color: "#34d399", label: "covered" },
        { color: "#f87171", label: "missed (≤ α)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A single predicted label hides how unsure the model is. Conformal
        prediction returns a <i>set</i> instead, with a promise: the true label is
        inside at least (1−α) of the time. It earns the promise by measuring, on a
        held-out calibration set, how surprised the model is at the correct answer,
        then taking the (1−α) quantile of that surprise as a threshold q̂. Any test
        class scoring above 1−q̂ joins the set. Each row up top is a test example;
        the green ring means the truth landed in its set, red means it slipped out.
      </DemoP>
      <DemoP>
        The surprising part: drag MODEL SKILL down to near-useless and coverage
        <i>still</i> sits on the target line — the sets just swell to include
        almost every class. That's the distribution-free guarantee. Model quality
        doesn't buy coverage (the calibration step always delivers that); it buys
        small, informative sets. Tighten α and watch sets grow as the guarantee
        gets stricter — the fundamental coverage-vs-size tradeoff.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Conformal prediction (Vovk; popularized by Angelopoulos & Bates) gives
        finite-sample, distribution-free coverage with essentially no assumptions
        on the model — wrap it around any classifier or regressor and get
        guaranteed marginal coverage. That makes it a workhorse of trustworthy ML
        for high-stakes settings, and the complement to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a>:
        calibration makes a probability honest, conformal turns scores into a set
        with a hard coverage promise.
      </DemoP>
      <DemoP>
        Caveats worth knowing: the guarantee is <i>marginal</i> (averaged over the
        population), not conditional — coverage can still be uneven across
        subgroups, which motivates Mondrian/class-conditional and adaptive variants
        like APS and RAPS. It also assumes exchangeability between calibration and
        test data, so distribution shift breaks it. And the LAC method shown here is
        the simplest; richer score functions trade a bit of that simplicity for
        smaller or more balanced sets.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRUSTWORTHY ML" title="Conformal Prediction"
      subtitle="Output a label set guaranteed to contain the truth (1−α) of the time — for any model. Watch coverage hold even as the model gets worse; only set size suffers."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ConformalDemo />);
