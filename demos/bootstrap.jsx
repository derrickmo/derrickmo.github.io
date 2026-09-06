// demos/bootstrap.jsx — resample your own sample, and measure whether the interval
// actually covers. Benched through this file's own coverage code (mulberry32, fixed seed,
// 300 trials x 200 resamples, so the page reproduces these exactly): normal mean at n=40
// covers 93.7%, the median 93.0%; a lognormal mean covers 82.7% at n=15 and still only 92.7%
// at n=200. The honest headline is the failure, not the success.
//
// The truth line is per (population, statistic) - using the mean's truth for the median would
// draw it in the wrong place and report misses that are not misses.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, SegmentedControl, DemoButton } = window;

const W = 560, H = 380;

// mulberry32: a weak LCG here measured a 5.85% false-positive rate where 5.0% is correct,
// which is enough bias to corrupt every number on this page. Do not swap it for something simpler.
const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mkNormal = (r) => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quant = (s, p) => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

const STATS = { mean, median, "90th pct": (a) => quant([...a].sort((x, y) => x - y), 0.9) };

function BootstrapDemo() {
  const cvRef = _useRef(null);
  const [n, setN] = _useState(40);
  const [B, setB] = _useState(400);
  const [dist, setDist] = _useState("normal");
  const [statName, setStatName] = _useState("mean");
  const [seedTick, setSeedTick] = _useState(1);
  const [cover, setCover] = _useState(null);
  const [busy, setBusy] = _useState(false);

  const stat = STATS[statName];
  // the true population value of THE CHOSEN STATISTIC - one number per (population, statistic).
  // Using the mean's truth for the median would draw the truth line in the wrong place and
  // report spurious misses; z(0.9) = 1.2815516.
  const TRUTH = {
    normal: { mean: 10, median: 10, "90th pct": 10 + 2 * 1.2815516 },
    lognormal: { mean: Math.exp(0.5), median: 1, "90th pct": Math.exp(1.2815516) },
  };
  const truth = TRUTH[dist][statName];

  const draw = (r) => {
    const N = mkNormal(r);
    return dist === "normal"
      ? Array.from({ length: n }, () => 10 + 2 * N())
      : Array.from({ length: n }, () => Math.exp(N()));
  };

  const sample = _useRef([]);
  const boots = _useRef([]);

  // one sample + its bootstrap distribution, recomputed whenever the setup changes
  const r = mulberry32(20260906 + seedTick * 7919);
  sample.current = draw(r);
  const bs = [];
  for (let b = 0; b < B; b++) {
    const rs = new Array(n);
    for (let i = 0; i < n; i++) rs[i] = sample.current[(r() * n) | 0];
    bs.push(stat(rs));
  }
  bs.sort((x, y) => x - y);
  boots.current = bs;
  const lo = quant(bs, 0.025), hi = quant(bs, 0.975);
  const covers = truth >= lo && truth <= hi;

  // the coverage experiment: repeat the whole procedure many times and count
  const runCoverage = () => {
    setBusy(true);
    setTimeout(() => {
      const rr = mulberry32(13579);
      const T = 300; let c = 0;
      for (let t = 0; t < T; t++) {
        const s = draw(rr);
        const o = [];
        for (let b = 0; b < 200; b++) {
          const re = new Array(n);
          for (let i = 0; i < n; i++) re[i] = s[(rr() * n) | 0];
          o.push(stat(re));
        }
        o.sort((x, y) => x - y);
        if (truth >= quant(o, 0.025) && truth <= quant(o, 0.975)) c++;
      }
      setCover({ pct: c / T * 100, trials: T });
      setBusy(false);
    }, 30);
  };
  _useEffect(() => { setCover(null); }, [n, dist, statName]);

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 46, w = W - pad * 2, h = H - pad * 2 - 30;

    const min = Math.min(...boots.current, truth), max = Math.max(...boots.current, truth);
    const span = (max - min) || 1;
    const X = (v) => pad + ((v - min) / span) * w;

    // histogram of the bootstrap statistic
    const BINS = 44, counts = new Array(BINS).fill(0);
    for (const v of boots.current) counts[Math.min(BINS - 1, Math.floor((v - min) / span * BINS))]++;
    const peak = Math.max(...counts, 1);
    counts.forEach((c, i) => {
      const bw = w / BINS, x = pad + i * bw, bh = (c / peak) * h;
      ctx.fillStyle = "rgba(96,165,250,0.35)";
      ctx.fillRect(x, pad + h - bh, bw - 1, bh);
    });

    // the 95% interval
    ctx.fillStyle = "rgba(52,211,153,0.10)";
    ctx.fillRect(X(lo), pad, X(hi) - X(lo), h);
    for (const [v, col, lab] of [[lo, "#34d399", "2.5%"], [hi, "#34d399", "97.5%"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(X(v), pad); ctx.lineTo(X(v), pad + h); ctx.stroke();
      ctx.font = "9px JetBrains Mono, monospace"; ctx.fillStyle = col;
      ctx.fillText(lab, X(v) - 12, pad - 6);
    }
    // the truth, which the interval either contains or does not
    ctx.strokeStyle = covers ? "#e0e7ff" : "#f87171"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(X(truth), pad - 2); ctx.lineTo(X(truth), pad + h + 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = covers ? "#e0e7ff" : "#f87171";
    ctx.fillText("truth " + truth.toFixed(2) + (covers ? "" : "  MISSED"), X(truth) + 6, pad + h + 22);
    ctx.fillStyle = "#64748b";
    ctx.fillText(B + " resampled " + statName + "s from one sample of " + n, pad, H - 14);
  }, [n, B, dist, statName, seedTick]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <SegmentedControl label="// POPULATION" value={dist} onChange={setDist}
        options={[{ value: "normal", label: "NORMAL" }, { value: "lognormal", label: "SKEWED" }]}
        help="The skewed population is lognormal. It is where the bootstrap stops being trustworthy, which is the point of the demo." />
      <SegmentedControl label="// STATISTIC" value={statName} onChange={setStatName}
        options={[{ value: "mean", label: "MEAN" }, { value: "median", label: "MEDIAN" }, { value: "90th pct", label: "90th PCT" }]}
        help="The median and the 90th percentile have no simple standard-error formula. Bootstrapping them is the same three lines as the mean." />
      <Slider label="SAMPLE SIZE n" min={10} max={200} step={5} value={n} onChange={setN}
        help="On skewed data, watch coverage climb only slowly with n - it is still short of 95% at n=200." />
      <Slider label="RESAMPLES B" min={50} max={1200} step={50} value={B} onChange={setB}
        help="B controls how smooth the histogram is, NOT how correct the interval is. Raising it will not fix under-coverage." />
      <DemoButton onClick={() => setSeedTick((s) => s + 1)}>NEW SAMPLE</DemoButton>
      <DemoButton onClick={runCoverage} disabled={busy}>{busy ? "RUNNING..." : "MEASURE COVERAGE (300 TRIALS)"}</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="95% CI LOW" value={lo.toFixed(3)} accent="#34d399" />
        <StatReadout label="95% CI HIGH" value={hi.toFixed(3)} accent="#34d399" />
        <StatReadout label="THIS INTERVAL" value={covers ? "covers" : "MISSES"} accent={covers ? "#34d399" : "#f87171"} />
        <StatReadout label="MEASURED COVERAGE" value={cover ? cover.pct.toFixed(1) + "%" : "-"} accent={cover && cover.pct < 92 ? "#f87171" : "#60a5fa"} />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        You have one sample and want to know how much your statistic would have wobbled had you
        drawn a different one. The bootstrap answers by treating the sample as if it were the
        population: draw <em>n</em> values from it with replacement, recompute the statistic, repeat
        B times. The spread of those B values is the sampling distribution, and the 2.5th and 97.5th
        percentiles are a 95% interval. That is the whole method — three lines, no formula.
      </DemoP>
      <DemoP>
        Its real value is the STATISTIC control. There is a textbook standard error for the mean;
        there is none for the median or the 90th percentile, and the bootstrap does not care. Press
        <strong> MEASURE COVERAGE</strong> on NORMAL: <strong>93.7%</strong> for the mean and
        <strong>93.0%</strong> for the median at n=40 — close to the 95% a 95% interval is supposed
        to deliver, and short of it by about the Monte-Carlo error of 300 trials.
      </DemoP>
      <DemoP>
        <strong>Now switch to SKEWED and press it again.</strong> Coverage falls to
        <strong>82.7%</strong> at n=15 — a "95%" interval that misses almost one time in five.
        Raise n to 60 and it reaches 91.7%; at n=200 it is still only 92.7%, and it gets there
        slowly. That is the honest headline: <em>the bootstrap is
        assumption-light, not assumption-free</em>. It does not repair skew, and no amount of extra
        resamples will help, because B controls the smoothness of the histogram and not the
        correctness of the interval. Only more data does, and slowly.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is the practical alternative to deriving a standard error whenever your metric is
        awkward — recall@k, a ratio of means, an AUC difference between two models. It also pairs
        with {" "}<a href={`${window.__DM_BASE || "../../"}visualize/cross-validation/`}>cross-validation</a>:
        CV tells you how the model generalises, the bootstrap tells you how uncertain that estimate is.
      </DemoP>
      <DemoP>
        The under-coverage on skew matters in practice because ML metrics are frequently skewed —
        latency distributions, revenue per user, per-class error on a long tail. Reporting a
        bootstrap interval on p99 latency and treating it as exact is precisely the failure this
        demo shows, and it is worth checking coverage on simulated data whose truth you know before
        trusting an interval on data whose truth you do not.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="The Bootstrap"
      subtitle="Resample your own sample to get an interval for any statistic - and watch that interval quietly fail on skewed data."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/cross-validation/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BootstrapDemo />);
