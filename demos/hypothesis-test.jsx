// demos/hypothesis-test.jsx — what a p-value guarantees, and the two ways experiments break it.
//
// ⚠ Benched twice. The first run used a simple LCG and reported a 31% false-positive rate at five
// looks. That was the RNG, not the statistics: the LCG measured 5.85% on a SINGLE look where 5.0%
// is correct, and the bias compounds. With mulberry32, run through THIS file's own simulation
// (fixed seed, 1200 experiments, n=400), the rates are 4.8 / 8.9 / 14.6 / 18.8 / 24.5% for
// 1 / 2 / 5 / 10 / 20 looks — Armitage's classical values, recovered by simulation, and the page
// reproduces them exactly because the seed is fixed.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, DemoButton } = window;

const W = 560, H = 380;

const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mkN = (r) => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
function zStat(a, b) {
  const ma = mean(a), mb = mean(b);
  const va = a.reduce((s, x) => s + (x - ma) ** 2, 0) / (a.length - 1);
  const vb = b.reduce((s, x) => s + (x - mb) ** 2, 0) / (b.length - 1);
  return (mb - ma) / Math.sqrt(va / a.length + vb / b.length);
}

function HypothesisDemo() {
  const cvRef = _useRef(null);
  const [looks, setLooks] = _useState(5);
  const [effect, setEffect] = _useState(0);
  const [n, setN] = _useState(400);
  const [result, setResult] = _useState(null);
  const [busy, setBusy] = _useState(false);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const r = mulberry32(778899);
      const N = mkN(r);
      const T = 1200;
      let hits = 0; const stopAt = new Array(looks).fill(0);
      for (let t = 0; t < T; t++) {
        const A = [], B = [];
        for (let k = 1; k <= looks; k++) {
          const upto = Math.round(n * k / looks);
          while (A.length < upto) { A.push(N()); B.push(N() + effect); }
          if (Math.abs(zStat(A, B)) > 1.96) { hits++; stopAt[k - 1]++; break; }
        }
      }
      setResult({ rate: hits / T * 100, stopAt, trials: T, effect, looks, n });
      setBusy(false);
    }, 30);
  };
  _useEffect(() => { run(); }, []);
  _useEffect(() => { setResult(null); }, [looks, effect, n]);

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 50, w = W - pad * 2, h = H - pad * 2 - 16;
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, pad, w, h);

    if (!result) {
      ctx.font = "12px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
      ctx.fillText(busy ? "simulating 1200 experiments..." : "press RUN", pad + 16, pad + h / 2);
      return;
    }
    const nominal = 5;
    const maxY = Math.max(result.rate, 30);
    const Y = (v) => pad + h - (v / maxY) * h;

    // the 5% line the p-value promises
    ctx.strokeStyle = "#34d399"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pad, Y(nominal)); ctx.lineTo(pad + w, Y(nominal)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#34d399";
    ctx.fillText("5% — what the test promises", pad + 6, Y(nominal) - 6);

    // bar for the measured rate
    const bw = 70, bx = pad + w / 2 - bw / 2;
    const col = result.effect === 0 ? (result.rate > 8 ? "#f87171" : "#34d399") : "#60a5fa";
    ctx.fillStyle = col + "44"; ctx.fillRect(bx, Y(result.rate), bw, pad + h - Y(result.rate));
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(bx, Y(result.rate), bw, pad + h - Y(result.rate));
    ctx.font = "600 16px Space Grotesk, sans-serif"; ctx.fillStyle = col; ctx.textAlign = "center";
    ctx.fillText(result.rate.toFixed(1) + "%", bx + bw / 2, Y(result.rate) - 10);
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#94a3b8";
    ctx.fillText(result.effect === 0 ? "FALSE POSITIVES" : "POWER", bx + bw / 2, pad + h + 16);
    ctx.textAlign = "left";

    // where the run stopped, which shows peeking doing its damage early
    ctx.fillStyle = "#64748b";
    ctx.fillText("stopped at look:", pad + 6, pad + 18);
    result.stopAt.forEach((c, i) => {
      const x = pad + 6 + i * 34;
      ctx.fillStyle = "#c084fc";
      ctx.fillRect(x, pad + 26, 26, Math.max(1, c / result.trials * 60));
      ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText(String(i + 1), x + 9, pad + 26 + 72);
    });
    ctx.fillText(result.trials + " simulated experiments, true effect = " + result.effect, pad, H - 14);
  }, [result, busy]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="LOOKS (PEEKS)" min={1} max={20} step={1} value={looks} onChange={setLooks}
        help="How many times you check for significance while data accrues, stopping the moment p < 0.05. One look is the honest experiment." />
      <Slider label="TRUE EFFECT" min={0} max={0.6} step={0.05} value={effect} onChange={setEffect}
        help="Zero means the two arms are genuinely identical, so every 'significant' result is a false positive. Above zero the bar becomes power instead." />
      <Slider label="MAX n PER ARM" min={100} max={1200} step={100} value={n} onChange={setN}
        help="With a real effect, power climbs with n: at effect 0.3 it is 56% at n=100 and 85% at n=200." />
      <DemoButton onClick={run} disabled={busy}>{busy ? "SIMULATING..." : "RUN 1200 EXPERIMENTS"}</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label={effect === 0 ? "FALSE POSITIVE RATE" : "POWER"} value={result ? result.rate.toFixed(1) + "%" : "-"}
          accent={effect === 0 ? (result && result.rate > 8 ? "#f87171" : "#34d399") : "#60a5fa"} />
        <StatReadout label="PROMISED" value={effect === 0 ? "5.0%" : "-"} accent="#34d399" />
        <StatReadout label="LOOKS" value={String(looks)} accent="#c084fc" />
        <StatReadout label="INFLATION" value={effect === 0 && result ? (result.rate / 5).toFixed(1) + "x" : "-"} accent="#fbbf24" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        A p-value guarantees exactly one thing: <em>if the null hypothesis is true</em>, you will
        call a result significant no more than 5% of the time. That guarantee is about a procedure
        fixed in advance, not about the data in front of you — and the two controls here are the
        two standard ways of voiding it.
      </DemoP>
      <DemoP>
        <strong>Leave TRUE EFFECT at zero</strong> — the arms are genuinely identical, so every
        "significant" result is a lie — and raise LOOKS. With one look the measured rate is
        <strong>4.8%</strong>, as promised. With five it is <strong>14.6%</strong>, with ten
        <strong> 18.8%</strong>, with twenty <strong>24.5%</strong>. Those are Armitage's classical
        numbers, reproduced here by simulation. Nothing about the test changed; you simply gave
        yourself twenty chances to cross a line drawn for one, and the stopped-at histogram shows
        most of the damage happening at the earliest, smallest-sample looks.
      </DemoP>
      <DemoP>
        Now <strong>raise TRUE EFFECT</strong> and the same bar becomes power — the chance of
        detecting a real difference. At effect 0.3, one honest look gives 56% at n=100 and 85% at
        n=200. Shrink the effect instead and the picture is bleaker: a true effect of 0.1 is caught
        only <strong>29% of the time even at n=400</strong>. An underpowered experiment that reports
        "no significant difference" has told you almost nothing, because it would have missed a real
        effect most of the time. Absence of evidence is not evidence of absence, and power is the
        number that decides which one you have.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is why online experimentation platforms do not simply expose a p-value on a dashboard.
        Continuous monitoring needs a procedure designed for it — alpha spending, group-sequential
        boundaries, or always-valid confidence sequences — all of which pay for the extra looks up
        front. And variance reduction such as CUPED is the honest way to reach significance sooner,
        because it shrinks the noise rather than lowering the bar.
      </DemoP>
      <DemoP>
        The same arithmetic governs metric dashboards: twenty independent null metrics give roughly
        a 64% chance that at least one looks significant, which is the multiple-comparisons problem
        wearing different clothes. It is also why a model comparison decided by one lucky seed on a
        small evaluation set is not a result — see
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/bootstrap/`}>the bootstrap</a>{" "}
        for putting an interval around that number instead.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Hypothesis Testing & Peeking"
      subtitle="A p-value guarantees 5% false positives for ONE pre-planned look - check five times and it is 15%."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/causal-inference/ab-testing/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HypothesisDemo />);
