// demos/dtw.jsx — Dynamic Time Warping: align two series that are the same shape
// at different speeds.
//
// Euclidean distance compares the two series point-by-point (lockstep) — so a tiny
// time shift makes two identical shapes look completely different. DTW instead
// finds the cheapest nonlinear ALIGNMENT, allowing one axis to stretch or compress
// to match the other. It's a dynamic program on a cost matrix:
//   D[i][j] = (A_i - B_j)² + min(D[i-1][j], D[i][j-1], D[i-1][j-1])
// then backtrack from the corner to recover the warping path. A Sakoe-Chiba band
// restricts how far the path may stray from the diagonal (faster, but too tight
// blocks the true alignment). All exact DP.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, StatReadout, ControlGroup, useIsMobile,
} = window;

const N = 40;
const CW = 210, CH = 210;
const MX = 42, MY = 38, MS = 150; // matrix box

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const shape = t => Math.exp(-((t - 0.32) * (t - 0.32)) / 0.018) - 0.85 * Math.exp(-((t - 0.72) * (t - 0.72)) / 0.03);

function DTWDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [warp, setWarp] = _useState(0.12);
  const [noise, setNoise] = _useState(0.04);
  const [band, setBand] = _useState(N); // Sakoe-Chiba radius

  const data = _useMemo(() => {
    const rand = rng(99);
    const A = new Float64Array(N), B = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      A[i] = shape(t) + noise * (rand() * 2 - 1);
      const tw = Math.min(1, Math.max(0, t + warp * Math.sin(2 * Math.PI * t)));
      B[i] = shape(tw) + noise * (rand() * 2 - 1);
    }
    // DTW DP with band
    const INF = 1e18;
    const D = Array.from({ length: N }, () => new Float64Array(N).fill(INF));
    const cost = (i, j) => { const d = A[i] - B[j]; return d * d; };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (Math.abs(i - j) > band) continue;
      const c = cost(i, j);
      if (i === 0 && j === 0) { D[i][j] = c; continue; }
      let best = INF;
      if (i > 0) best = Math.min(best, D[i - 1][j]);
      if (j > 0) best = Math.min(best, D[i][j - 1]);
      if (i > 0 && j > 0) best = Math.min(best, D[i - 1][j - 1]);
      D[i][j] = c + best;
    }
    // backtrack
    const path = []; let i = N - 1, j = N - 1, blocked = D[i][j] >= INF;
    if (!blocked) {
      while (i > 0 || j > 0) {
        path.push([i, j]);
        if (i === 0) j--; else if (j === 0) i--;
        else { const a = D[i - 1][j], b = D[i][j - 1], c = D[i - 1][j - 1]; if (c <= a && c <= b) { i--; j--; } else if (a <= b) i--; else j--; }
      }
      path.push([0, 0]); path.reverse();
    }
    const dtwDist = blocked ? Infinity : Math.sqrt(D[N - 1][N - 1] / path.length);
    let eucl = 0; for (let k = 0; k < N; k++) { const d = A[k] - B[k]; eucl += d * d; } eucl = Math.sqrt(eucl / N);
    return { A, B, D, path, dtwDist, eucl, blocked, INF };
  }, [warp, noise, band]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const cell = MS / N;
    // accumulated-cost heatmap
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const v = data.D[i][j]; if (v < data.INF) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    const sp = (hi - lo) || 1;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = data.D[i][j]; const x = MX + i * cell, y = MY + (N - 1 - j) * cell;
      if (v >= data.INF) { ctx.fillStyle = "rgba(20,28,50,0.9)"; }
      else { const t = (v - lo) / sp; ctx.fillStyle = `rgba(${Math.round(30 + 60 * t)},${Math.round(20 + 30 * t)},${Math.round(60 + 150 * (1 - t))},1)`; }
      ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
    }
    // warping path
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.beginPath();
    data.path.forEach(([i, j], k) => { const x = MX + i * cell + cell / 2, y = MY + (N - 1 - j) * cell + cell / 2; if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    // diagonal (lockstep / Euclidean) reference
    ctx.strokeStyle = "rgba(148,163,184,0.4)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(MX, MY + MS); ctx.lineTo(MX + MS, MY); ctx.stroke(); ctx.setLineDash([]);
    // top series A (along x)
    const tay0 = 4, tah = 28;
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = 0; i < N; i++) { const x = MX + i * cell + cell / 2, y = tay0 + tah / 2 - data.A[i] * tah / 2.4; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = "#60a5fa"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("A", MX, tay0 + 7);
    // left series B (along y)
    const lbx0 = 4, lbw = 30;
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let j = 0; j < N; j++) { const y = MY + (N - 1 - j) * cell + cell / 2, x = lbx0 + lbw / 2 + data.B[j] * lbw / 2.4; if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = "#34d399"; ctx.fillText("B", lbx0, MY + 7);
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.fillText("warping path", MX + MS / 2, CH - 4);
  }, [data]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.2 : 1.6), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>gold = optimal alignment · dashed = lockstep diagonal · dark = outside the band</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// TIME WARP" min={0} max={0.22} step={0.01} value={warp} onChange={setWarp} tone="violet"
        help="How much series B's time axis is stretched/compressed relative to A (they're the same underlying shape). More warp bends the optimal path away from the diagonal and blows up the lockstep Euclidean distance while DTW stays low." />
      <Slider label="// NOISE" min={0} max={0.2} step={0.01} value={noise} onChange={setNoise}
        help="Random noise added to both series. DTW aligns shape, so a little noise barely moves the path; a lot starts to fool the cheapest-path search." />
      <Slider label="// BAND RADIUS" min={2} max={N} step={1} value={band} onChange={setBand} tone="blue"
        suffix={band >= N ? " (none)" : ""}
        help="Sakoe-Chiba constraint: the path may stray at most this far from the diagonal. Tightening it speeds DTW and prevents pathological warps — but set it below the true warp and the optimal alignment is blocked, so the distance jumps." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="DTW DISTANCE" value={data.blocked ? "blocked" : data.dtwDist.toFixed(3)} accent={data.blocked ? "#f87171" : "#34d399"} />
        <StatReadout label="EUCLIDEAN" value={data.eucl.toFixed(3)} accent="#fbbf24" />
        <StatReadout label="PATH LENGTH" value={data.blocked ? "—" : data.path.length} accent="var(--violet-lt)" />
        <StatReadout label="BAND" value={band >= N ? "off" : "±" + band} accent="var(--dim)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Two recordings of the same gesture, word, or heartbeat are rarely at the same
        speed. <b>Euclidean</b> distance compares them position-by-position, so even a
        small time shift makes identical shapes look wildly different (watch the amber
        readout balloon as you add warp). <b>DTW</b> instead searches for the cheapest
        way to <i>align</i> them — letting time stretch and compress — and reports the
        residual mismatch.
      </DemoP>
      <DemoP>
        The heatmap is the accumulated-cost matrix; the gold <b>warping path</b> from
        corner to corner is the optimal alignment, found by the same min-of-three
        dynamic program as edit distance. When B runs slower than A the path bends
        above the diagonal (one A-point matches several B-points) and back below where
        it runs faster. The <b>band radius</b> trades speed for freedom: a wide band
        finds any warp; tighten it past the true warp and the path is fenced off — the
        distance jumps and the corner goes unreachable.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        DTW is the standard elastic distance for time series: speech and gesture
        recognition, signature verification, ECG and sensor matching, and the
        DTW-kNN classifier that's a famously strong baseline. It's the continuous-
        valued sibling of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/edit-distance/`} style={{ color: "#a855f7" }}>edit
        distance</a> — same matrix, same backtrack — and another member of the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knapsack/`} style={{ color: "#a855f7" }}>dynamic
        programming</a> family.
      </DemoP>
      <DemoP>
        It's the alignment tool behind a lot of sequence work: comparing audio frames
        (often <a href={`${window.__DM_BASE || "../../"}visualize/mfcc/`} style={{ color: "#a855f7" }}>MFCC</a>{" "}
        vectors rather than raw samples), clustering or averaging time series, and
        anomaly detection in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/forecasting/`} style={{ color: "#a855f7" }}>forecasting</a>.
        The same "monotonic alignment under a band" structure reappears in CTC and in
        attention-based sequence alignment for modern speech models.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Dynamic Time Warping"
      subtitle="Align two series at different speeds. DTW finds the cheapest nonlinear warp between them — where rigid Euclidean distance fails on the smallest time shift."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DTWDemo />);
