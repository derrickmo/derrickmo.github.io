// demos/clt.jsx — Central Limit Theorem: distribution of sample means → Gaussian.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 400, BINS = 64;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const DISTS = {
  uniform: { mu: 0.5, sd: Math.sqrt(1 / 12), sample: () => Math.random() },
  exponential: { mu: 1, sd: 1, sample: () => -Math.log(1 - Math.random()) },
  bimodal: { mu: 0.5, sd: Math.sqrt(0.09 + 0.0025), sample: () => (Math.random() < 0.5 ? 0.2 : 0.8) + gauss() * 0.05 },
};
const normalPdf = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));

function CLTDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const stateRef = _useRef({ bins: new Array(BINS).fill(0), count: 0, sum: 0, sumsq: 0 });
  const rafRef = _useRef(null);
  const lastRef = _useRef(0);

  const [dist, setDist] = _useState("uniform");
  const [nn, setNn] = _useState(5);
  const [speed, setSpeed] = _useState(8);
  const [running, setRunning] = _useState(false);
  const [stats, setStats] = _useState({ count: 0, obs: 0, theo: 0 });
  const distRef = _useRef(dist), nRef = _useRef(nn), spRef = _useRef(speed);
  _useEffect(() => { distRef.current = dist; }, [dist]);
  _useEffect(() => { nRef.current = nn; }, [nn]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  const range = () => { const d = DISTS[distRef.current]; return [d.mu - 4 * d.sd, d.mu + 4 * d.sd]; };

  function reset() {
    setRunning(false);
    stateRef.current = { bins: new Array(BINS).fill(0), count: 0, sum: 0, sumsq: 0 };
    setStats({ count: 0, obs: 0, theo: +(DISTS[distRef.current].sd / Math.sqrt(nRef.current)).toFixed(3) });
    draw();
  }

  function addMeans(k) {
    const d = DISTS[distRef.current], n = nRef.current, s = stateRef.current;
    const [lo, hi] = range();
    for (let i = 0; i < k; i++) {
      let acc = 0; for (let j = 0; j < n; j++) acc += d.sample();
      const m = acc / n;
      const bi = Math.floor((m - lo) / (hi - lo) * BINS);
      if (bi >= 0 && bi < BINS) s.bins[bi]++;
      s.count++; s.sum += m; s.sumsq += m * m;
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = stateRef.current, [lo, hi] = range(), bw = (hi - lo) / BINS, total = s.count || 1;
    const max = Math.max(1, ...s.bins);
    const baseY = H - 30, top = 30;
    // bars
    const cw = W / BINS;
    for (let i = 0; i < BINS; i++) {
      const h = (s.bins[i] / max) * (baseY - top);
      ctx.fillStyle = "rgba(192,132,252,0.55)";
      ctx.fillRect(i * cw + 1, baseY - h, cw - 1, h);
    }
    // theoretical normal (scaled to same peak as a fitted normal in density)
    const d = DISTS[distRef.current], sd = d.sd / Math.sqrt(nRef.current);
    // density -> bar-height units: barHeight(density) = density*bw*total, mapped by max
    ctx.strokeStyle = "#e0e7ff"; ctx.lineWidth = 2; ctx.beginPath();
    let started = false;
    for (let xp = 0; xp <= W; xp += 2) {
      const x = lo + (xp / W) * (hi - lo);
      const dens = normalPdf(x, d.mu, sd);
      const expectedCount = dens * bw * total;
      const h = (expectedCount / max) * (baseY - top);
      const y = baseY - h;
      if (!started) { ctx.moveTo(xp, y); started = true; } else ctx.lineTo(xp, y);
    }
    ctx.stroke();
    // axis
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W, baseY); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "10px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText("sample mean", W / 2, H - 8);

    const obs = s.count > 1 ? Math.sqrt(Math.max(0, s.sumsq / s.count - (s.sum / s.count) ** 2)) : 0;
    setStats({ count: s.count, obs: +obs.toFixed(3), theo: +sd.toFixed(3) });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset();
  }, []);
  _useEffect(() => { reset(); }, [dist, nn]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = (t) => {
      if (!alive) return;
      if (t - lastRef.current > 1000 / 60) { lastRef.current = t; addMeans(spRef.current); draw(); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// BASE DISTRIBUTION" value={dist} onChange={setDist}
        options={[{ value: "uniform", label: "Uniform" }, { value: "exponential", label: "Exponential" }, { value: "bimodal", label: "Bimodal" }]}
        help="The raw population each sample is drawn from. Uniform, a skewed exponential, or a two-humped bimodal — the CLT works no matter how non-Gaussian this is." />
      <Slider label="// SAMPLE SIZE (n)" min={1} max={50} value={nn} onChange={setNn} tone="violet"
        help="How many draws are averaged into each sample mean. Larger n makes the histogram more bell-shaped and narrower — its spread shrinks as 1/√n." />
      <Slider label="// SPEED" min={1} max={40} value={speed} onChange={setSpeed} suffix=" /frame"
        help="How many sample means are drawn per frame. Visual pacing only — it does not change the statistics." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="OBSERVED σ" value={stats.obs} accent="var(--violet-lt)" />
        <StatReadout label="σ/√n" value={stats.theo} accent="#e0e7ff" />
      </div>
      <StatReadout label="SAMPLE MEANS DRAWN" value={stats.count} />
      <Legend items={[{ color: "rgba(192,132,252,0.7)", label: "MEANS HISTOGRAM" }, { color: "#e0e7ff", label: "NORMAL σ/√n" }]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Pick any base distribution — even a lopsided <b>exponential</b> or a
        two-humped <b>bimodal</b> — draw <i>n</i> samples, average them, and record
        that mean. Repeat thousands of times and the histogram of those means
        always converges to a <b>bell curve</b>. That's the Central Limit Theorem,
        and it's why the Gaussian shows up everywhere in statistics and ML.
      </DemoP>
      <DemoP>
        Two things to watch. First, the shape becomes normal regardless of how weird
        the source is (set n = 1 to see the raw distribution, then raise it). Second,
        the spread shrinks: the standard deviation of the means is <i>σ/√n</i>, so
        quadrupling the sample size only halves the error — the readouts show the
        observed σ tracking the theory. This √n law underlies error bars,
        mini-batch gradient noise, and confidence intervals alike.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The Central Limit Theorem is why the Gaussian is the default assumption across
        statistics and machine learning. The noise model in linear regression, the math
        behind least squares, Kalman filters, Gaussian processes, and the i.i.d. error
        assumptions in A/B testing all lean on it — sums and averages of many small random
        effects tend to a bell curve, so "assume normal" is usually a safe first move.
      </DemoP>
      <DemoP>
        The <i>σ/√n</i> shrinkage law is the quiet reason behind a lot of practice: error
        bars and confidence intervals on a metric, why a bigger validation set gives a more
        trustworthy accuracy number, and why estimates only improve with the <i>square
        root</i> of effort — quadrupling your data halves your uncertainty, not quarters it.
        The same √n shows up in mini-batch gradient noise, which is why larger batches give
        smoother (but diminishing-returns) updates.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Central Limit Theorem"
      subtitle="Average samples from any distribution and watch the means pile up into a Gaussian."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CLTDemo />);
