// demos/instrumental-variables.jsx — recover a causal effect with an instrument.
//
// We want the causal effect β of treatment X on outcome Y. An unobserved
// confounder U pushes on BOTH X and Y, so naive OLS of Y~X is biased — it can
// even flip sign. An instrument Z is a variable that:
//   (relevance)  affects X            : X = aZ + cU + noise
//   (exclusion)  affects Y only via X : Y = βX + dU + (e·Z) + noise,  e=0 ideally
// Two-stage least squares (2SLS) / the Wald estimator isolates the part of X
// driven by Z (which is confounder-free) and reads β off that:
//   β̂_IV = Cov(Z,Y) / Cov(Z,X).
// It works when the instrument is strong (a large) and the exclusion holds
// (e=0). Weak instruments (a→0) explode the variance; exclusion violations
// (e>0) reintroduce bias β̂_IV = β + e/a.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function cov(a, b) { const ma = mean(a), mb = mean(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / a.length; }
function corr(a, b) { return cov(a, b) / Math.sqrt(cov(a, a) * cov(b, b) || 1e-9); }

const N = 400;

function IVDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [beta, setBeta] = _useState(1.0);    // true causal effect
  const [confound, setConfound] = _useState(1.2); // U → both X and Y
  const [relevance, setRelevance] = _useState(1.2); // instrument strength a
  const [exclusion, setExclusion] = _useState(0.0); // exclusion violation e (Z→Y direct)
  const [, setTick] = _useState(0);
  const dataRef = _useRef([]);

  function gen() {
    dataRef.current = Array.from({ length: N }, () => {
      const U = randn(), Z = randn();
      const X = relevance * Z + confound * U + 0.5 * randn();
      const Y = beta * X + confound * U + exclusion * Z + 0.5 * randn();
      return { Z, X, Y };
    });
  }
  _useEffect(() => { gen(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [beta, confound, relevance, exclusion]);

  const data = dataRef.current;
  // estimates
  let olsSlope = 0, ivSlope = 0, olsInt = 0, ivInt = 0, firstStage = 0, fStat = 0;
  if (data.length) {
    const Xs = data.map(d => d.X), Ys = data.map(d => d.Y), Zs = data.map(d => d.Z);
    const mX = mean(Xs), mY = mean(Ys);
    olsSlope = cov(Xs, Ys) / (cov(Xs, Xs) || 1e-9);
    olsInt = mY - olsSlope * mX;
    ivSlope = cov(Zs, Ys) / (cov(Zs, Xs) || 1e-9);
    ivInt = mY - ivSlope * mX;
    firstStage = corr(Zs, Xs);            // instrument relevance
    const r2 = firstStage * firstStage;   // first-stage R²
    fStat = (r2 / Math.max(1e-6, 1 - r2)) * (N - 2); // ≈ first-stage F
  }
  const olsBias = olsSlope - beta, ivBias = ivSlope - beta;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    const pad = 40;
    const Xs = data.map(d => d.X), Ys = data.map(d => d.Y);
    const xlo = Math.min(...Xs), xhi = Math.max(...Xs);
    const ylo = Math.min(...Ys), yhi = Math.max(...Ys);
    const PX = (x) => pad + ((x - xlo) / (xhi - xlo || 1)) * (W - 2 * pad);
    const PY = (y) => (H - 70) - ((y - ylo) / (yhi - ylo || 1)) * (H - 70 - pad);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Y vs X  ·  unobserved confounder U bends naive OLS away from the truth", pad, 22);

    // points
    ctx.fillStyle = "rgba(148,163,184,0.45)";
    data.forEach(d => { ctx.beginPath(); ctx.arc(PX(d.X), PY(d.Y), 1.8, 0, 7); ctx.fill(); });

    const line = (slope, intc, color, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(PX(xlo), PY(slope * xlo + intc)); ctx.lineTo(PX(xhi), PY(slope * xhi + intc)); ctx.stroke();
      ctx.setLineDash([]);
    };
    // true line through data mean
    const mX = mean(Xs), mY = mean(Ys);
    line(beta, mY - beta * mX, "#34d399", [5, 4]); // truth
    line(olsSlope, olsInt, "#f87171");             // biased OLS
    line(ivSlope, ivInt, "#a855f7");               // IV

    // slope readout strip
    const by = H - 50;
    ctx.font = "11px JetBrains Mono";
    ctx.fillStyle = "#34d399"; ctx.fillText("true β = " + beta.toFixed(2), pad, by);
    ctx.fillStyle = "#f87171"; ctx.fillText("OLS β̂ = " + olsSlope.toFixed(2) + "  (bias " + (olsBias >= 0 ? "+" : "") + olsBias.toFixed(2) + ")", pad, by + 16);
    ctx.fillStyle = "#a855f7"; ctx.fillText("IV β̂ = " + ivSlope.toFixed(2) + "  (bias " + (ivBias >= 0 ? "+" : "") + ivBias.toFixed(2) + ")", pad + 230, by + 16);

    // weak-instrument warning
    if (fStat < 10) {
      ctx.fillStyle = "#fbbf24"; ctx.font = "10px JetBrains Mono";
      ctx.fillText("⚠ weak instrument (F≈" + fStat.toFixed(1) + " < 10): IV estimate is noisy/biased", pad, by + 32);
    }
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
      <Slider label="// TRUE EFFECT β" min={-1} max={2} step={0.1} value={beta} onChange={setBeta} tone="violet"
        help="The causal effect of X on Y we're trying to recover. The green dashed line. IV should land on it; naive OLS generally won't." />
      <Slider label="// CONFOUNDING (U→X,Y)" min={0} max={2} step={0.1} value={confound} onChange={setConfound}
        help="Strength of the hidden common cause U pushing on both treatment and outcome. This is what biases OLS — turn it up and watch the red line peel away from the green truth while IV stays put." />
      <Slider label="// INSTRUMENT STRENGTH (Z→X)" min={0.1} max={2} step={0.1} value={relevance} onChange={setRelevance}
        help="How strongly the instrument Z moves the treatment X (relevance). Strong → IV is precise. Drag it toward 0 to create a WEAK instrument: the F-stat drops below 10 and the IV estimate goes wild." />
      <Slider label="// EXCLUSION VIOLATION (Z→Y)" min={0} max={1} step={0.05} value={exclusion} onChange={setExclusion}
        help="A forbidden direct path from Z to Y. The IV recipe assumes this is exactly 0. Nudge it up and watch IV become biased too (β̂_IV ≈ β + e/a) — the assumption you can't test from data." />
      <DemoButton onClick={() => { gen(); setTick(t => t + 1); }} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="OLS β̂" value={olsSlope.toFixed(2)} accent={Math.abs(olsBias) < 0.1 ? "#34d399" : "#f87171"} />
        <StatReadout label="IV β̂" value={ivSlope.toFixed(2)} accent={Math.abs(ivBias) < 0.1 ? "#34d399" : "#a855f7"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="FIRST-STAGE F" value={fStat.toFixed(1)} accent={fStat >= 10 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="corr(Z,X)" value={firstStage.toFixed(2)} />
      </div>
      <Legend items={[
        { color: "#34d399", label: "true β" },
        { color: "#f87171", label: "naive OLS (biased)" },
        { color: "#a855f7", label: "IV / 2SLS" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        We want the causal effect of X on Y, but a hidden confounder U stirs both,
        so the naive regression line (red) is biased — crank CONFOUNDING and watch
        it swing away from the true effect (green dashed), sometimes flipping sign.
        An instrument Z offers a way out: it perturbs X but touches Y only through X.
        IV keeps just the slice of X that Z explains — that slice is uncontaminated
        by U — and reads the effect off it: β̂ = Cov(Z,Y)/Cov(Z,X). The purple line
        snaps back onto the truth.
      </DemoP>
      <DemoP>
        Two assumptions do all the work, and the demo lets you break each. Pull
        INSTRUMENT STRENGTH toward zero and the first-stage F drops below 10 — a
        <i>weak instrument</i>, where dividing by a near-zero covariance makes IV
        wildly noisy. Raise EXCLUSION VIOLATION and Z leaks straight into Y; IV
        becomes biased again (β̂ ≈ β + e/a). Relevance you can measure from data;
        exclusion you can only argue for — which is why good instruments are rare.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Instrumental variables are the workhorse of causal inference when you can't
        randomize: think Mendelian randomization (genes as instruments), randomized
        encouragement designs, or "judge leniency" / distance-to-college natural
        experiments in economics. 2SLS is the standard estimator; the local effect
        it recovers under heterogeneity is the LATE (Imbens–Angrist). It's the
        complement to adjustment-based methods like the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/do-intervention/`} style={{ color: "#a855f7" }}>do-operator / backdoor</a> demo:
        adjustment needs you to <i>measure</i> the confounder, IV needs an
        instrument instead.
      </DemoP>
      <DemoP>
        Caveats are exactly the two assumptions: relevance is testable (report the
        first-stage F; below ~10 is the classic weak-instrument danger zone), but
        exclusion is fundamentally untestable from the data — it's a causal claim you
        defend with domain knowledge. IV also estimates effects with more variance
        than OLS, and under treatment-effect heterogeneity it answers a narrower
        question (the effect on compliers) than the population average. Related ideas
        live in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/simpsons-paradox/`} style={{ color: "#a855f7" }}>Simpson's paradox</a>.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="CAUSAL INFERENCE" title="Instrumental Variables"
      subtitle="Recover a causal effect when a hidden confounder biases the obvious regression. An instrument that moves the treatment — but not the outcome directly — lets 2SLS read the true effect. Then break relevance and exclusion to see it fail."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<IVDemo />);
