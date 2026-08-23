// demos/ransac.jsx — RANSAC line fitting against least squares.
// Real algorithm: sample two points, count inliers, keep the best consensus, refit.
// The whole lesson is the side-by-side: one outlier drags least squares, and does
// not move RANSAC at all.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 470, H = 470;
const C_IN = "#34d399", C_OUT = "#f87171", C_RANSAC = "#60a5fa", C_LS = "#c084fc";

// Seeded RNG so a run is reproducible — re-seeding is then a real experiment
// rather than a reshuffle you cannot repeat.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}

// TOTAL least squares, via the principal direction of the scatter. Fitting y = mx + c
// would be simpler and cannot represent a vertical line at all — and this demo lets
// you click points anywhere, so vertical is reachable.
function fitTLS(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { px: mx, py: my, nx: -Math.sin(theta), ny: Math.cos(theta) };
}

const distTo = (l, p) => Math.abs((p.x - l.px) * l.nx + (p.y - l.py) * l.ny);
const slopeOf = (l) => (l && Math.abs(l.ny) > 1e-9 ? -l.nx / l.ny : Infinity);

function ransac(pts, thresh, iters, seed) {
  const rand = rng(seed);
  let best = null, bestInliers = [];
  for (let i = 0; i < iters; i++) {
    const a = pts[Math.floor(rand() * pts.length)];
    const b = pts[Math.floor(rand() * pts.length)];
    if (!a || !b || a === b) continue;
    const cand = fitTLS([a, b]);
    if (!cand) continue;
    const inl = pts.filter((p) => distTo(cand, p) <= thresh);
    if (inl.length > bestInliers.length) { best = cand; bestInliers = inl; }
  }
  // Refit on the whole consensus set. The two-point hypothesis is only a proposal —
  // skipping this step is the most common way a correct-looking RANSAC underperforms.
  return { line: bestInliers.length >= 2 ? fitTLS(bestInliers) : best, inliers: bestInliers };
}

const TRUE_M = 0.8, TRUE_C = 0.05;
function genData(nTotal, outlierPct, noise, seed) {
  const rand = rng(seed), pts = [];
  const nOut = Math.round(nTotal * outlierPct / 100);
  for (let i = 0; i < nTotal - nOut; i++) {
    const x = rand() * 1.8 - 0.9;
    pts.push({ x, y: TRUE_M * x + TRUE_C + (rand() - 0.5) * noise, planted: "in" });
  }
  for (let i = 0; i < nOut; i++) pts.push({ x: rand() * 1.9 - 0.95, y: rand() * 1.9 - 0.95, planted: "out" });
  return pts;
}

function RansacDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [n, setN] = _useState(120);
  const [outlierPct, setOutlierPct] = _useState(40);
  const [thresh, setThresh] = _useState(0.06);
  const [iters, setIters] = _useState(200);
  const [showLS, setShowLS] = _useState("yes");
  const [seed, setSeed] = _useState(7);
  const dataRef = _useRef(genData(120, 40, 0.05, 7));
  const [stats, setStats] = _useState({ inliers: 0, mR: 0, mL: 0, need: 0 });

  const toPx = (x, y) => [(x + 1) / 2 * W, (1 - y) / 2 * H];

  function drawLine(ctx, line, color, dash) {
    if (!line) return;
    // Draw as a segment across the viewport using the line's direction (perp to normal).
    const dx = -line.ny, dy = line.nx, L = 4;
    const [x1, y1] = toPx(line.px - dx * L, line.py - dy * L);
    const [x2, y2] = toPx(line.px + dx * L, line.py + dy * L);
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(5,8,22,0.5)"; ctx.fillRect(0, 0, W, H);

    const pts = dataRef.current;
    const rs = ransac(pts, thresh, iters, seed);
    const ls = fitTLS(pts);
    const inSet = new Set(rs.inliers);

    // The threshold band, so the parameter is visible rather than abstract.
    if (rs.line) {
      const dx = -rs.line.ny, dy = rs.line.nx, L = 4;
      ctx.save(); ctx.fillStyle = "rgba(96,165,250,0.10)";
      ctx.beginPath();
      const corners = [
        [rs.line.px - dx * L + rs.line.nx * thresh, rs.line.py - dy * L + rs.line.ny * thresh],
        [rs.line.px + dx * L + rs.line.nx * thresh, rs.line.py + dy * L + rs.line.ny * thresh],
        [rs.line.px + dx * L - rs.line.nx * thresh, rs.line.py + dy * L - rs.line.ny * thresh],
        [rs.line.px - dx * L - rs.line.nx * thresh, rs.line.py - dy * L - rs.line.ny * thresh],
      ].map(([x, y]) => toPx(x, y));
      ctx.moveTo(corners[0][0], corners[0][1]);
      corners.slice(1).forEach((c) => ctx.lineTo(c[0], c[1]));
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    if (showLS === "yes") drawLine(ctx, ls, C_LS, [7, 5]);
    drawLine(ctx, rs.line, C_RANSAC);

    for (const p of pts) {
      const [px, py] = toPx(p.x, p.y);
      const isIn = inSet.has(p);
      ctx.fillStyle = isIn ? C_IN : C_OUT;
      ctx.globalAlpha = isIn ? 0.95 : 0.55;
      ctx.beginPath(); ctx.arc(px, py, isIn ? 3.6 : 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // How many iterations you would NEED for a 99% chance of one clean sample.
    const w = rs.inliers.length / Math.max(1, pts.length);
    const need = w > 0 && w < 1 ? Math.ceil(Math.log(0.01) / Math.log(1 - w * w)) : 1;
    setStats({
      inliers: rs.inliers.length,
      mR: slopeOf(rs.line),
      mL: slopeOf(ls),
      need: Math.min(need, 99999),
    });
  }

  function onDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 2 - 1;
    const y = 1 - (e.clientY - rect.top) / rect.height * 2;
    dataRef.current.push({ x, y, planted: "manual" });
    draw();
  }

  function reseed(next) {
    const s = next == null ? Math.floor(Math.random() * 1e6) : next;
    setSeed(s);
    dataRef.current = genData(n, outlierPct, 0.05, s);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, []);
  _useEffect(() => { dataRef.current = genData(n, outlierPct, 0.05, seed); draw(); /* eslint-disable-next-line */ }, [n, outlierPct, seed]);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [thresh, iters, showLS]);

  const fmt = (m) => (Number.isFinite(m) ? m.toFixed(3) : "vertical");
  const stage = (
    <canvas ref={canvasRef} onPointerDown={onDown}
      style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />
  );
  const controls = (
    <ControlGroup>
      <Slider label="// OUTLIERS (%)" min={0} max={70} value={outlierPct} onChange={setOutlierPct} tone="violet"
        help="What fraction of the points are pure noise rather than samples from the line. Least squares degrades from the first one. RANSAC holds all the way to 70% here, because uniform noise never forms a larger consensus than the real line - structured outliers are what break it, not the count." />
      <Slider label="// INLIER THRESHOLD" min={0.01} max={0.3} step={0.01} value={thresh} onChange={setThresh}
        help="How close a point must be to count as agreeing with a hypothesis — the shaded band. Too tight and no hypothesis gathers support; too loose and outliers are counted as inliers, which is the same as not using RANSAC." />
      <Slider label="// ITERATIONS" min={2} max={500} value={iters} onChange={setIters}
        help="How many random two-point hypotheses to try. The readout below shows how many you actually NEED for a 99% chance of drawing one outlier-free pair — beyond that you are paying for nothing." />
      <Slider label="// POINTS" min={20} max={300} value={n} onChange={setN}
        help="Total sample size. More data does NOT rescue least squares here — the bias from outliers does not average away, it is a property of the estimator." />
      <SegmentedControl label="// SHOW LEAST SQUARES" value={showLS} onChange={setShowLS}
        options={[{ value: "yes", label: "Show" }, { value: "no", label: "Hide" }]}
        help="The dashed violet line fits every point by minimizing squared distance. Squaring is what makes it fragile: one far-away point contributes enormously." />
      <DemoButton onClick={() => reseed()} primary>NEW SAMPLE</DemoButton>
      <StatReadout label="CONSENSUS (INLIERS)" value={`${stats.inliers} / ${dataRef.current.length}`} accent={C_IN} />
      <StatReadout label="RANSAC SLOPE" value={fmt(stats.mR)} accent={C_RANSAC} />
      <StatReadout label="LEAST-SQUARES SLOPE" value={fmt(stats.mL)} accent={C_LS} />
      <StatReadout label="ITERATIONS NEEDED (99%)" value={String(stats.need)} accent="#fbbf24" />
      <Legend items={[
        { color: C_IN, label: "INLIER" },
        { color: C_OUT, label: "OUTLIER" },
        { color: C_RANSAC, label: "RANSAC" },
        { color: C_LS, label: "LEAST SQUARES" },
      ]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        True slope is 0.800. Click the canvas to drop a point and watch which line moves.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Least squares minimizes the <i>squared</i> distance to every point, so a point far
        from the line contributes enormously — and it has no way to decline. One bad
        measurement tilts the whole fit. RANSAC inverts the problem: instead of fitting all
        the data at once, guess a model from the smallest possible sample (two points for a
        line), count how many points agree with it, and keep the guess with the largest
        agreeing set.
      </DemoP>
      <DemoP>
        Push <b>outliers</b> up and watch the two lines separate. The violet dashed fit
        rotates away steadily; the blue one does not move. At 60% outliers RANSAC is still
        within 0.01 of the true slope of 0.800 while least squares has drifted past 0.86 —
        and note what that means: <i>a majority of the data being wrong is survivable</i>,
        because the outliers here are unstructured and never form a bigger consensus than
        the real line. What actually breaks RANSAC is outliers with structure of their own —
        a second line, a repeated pattern — since then the largest agreeing set may not be
        the one you wanted. Then click to drop a single point far from the line: least
        squares lurches toward it, RANSAC does not move at all, because that point simply
        is not in the consensus set.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        RANSAC is the workhorse of geometric vision. Matching two photographs produces
        hundreds of candidate correspondences of which many are wrong, and RANSAC is what
        recovers the homography, the fundamental matrix, or the camera pose from them —
        structure-from-motion, panorama stitching and visual SLAM all have it in the inner
        loop. The model changes; the sample-count-keep-best skeleton does not.
      </DemoP>
      <DemoP>
        The wider idea is <b>robust estimation</b>: an estimator's breakdown point is the
        fraction of arbitrary corruption it tolerates before returning nonsense. The mean
        has a breakdown point of zero and the median has one of a half, and that is the
        same distinction you are watching here. It is why Huber loss appears in regression,
        why detection pipelines use trimmed statistics, and why the iteration count is
        <i> calculable</i> rather than guessed — the readout uses N = log(1 − p) / log(1 − w²).
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="RANSAC"
      subtitle="Fit a model to data that is mostly wrong — by sampling, counting agreement, and ignoring everything else."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RansacDemo />);
