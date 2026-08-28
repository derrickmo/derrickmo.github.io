// demos/count-min-sketch.jsx — Count-Min Sketch frequency estimation.
//
// You can't store a counter per item when the stream has millions of distinct
// keys. The Count-Min Sketch keeps a tiny d×w table of counters: each arriving
// item is hashed by d independent hash functions, one per row, and the chosen
// counter in every row is incremented. To QUERY an item's frequency, read the d
// counters it hashes to and take the MINIMUM — because every collision can only
// ADD to a counter, the true count is never above any of them, and the smallest
// is the tightest (over)estimate. So it never underestimates; the error comes from
// collisions and shrinks as you widen the table (w) or add rows (d). We stream a
// skewed key distribution, show the counter heatmap, and compare estimate vs truth.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 470, M = 24;
const PRIME = 2147483647;

function CountMinDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [w, setW] = _useState(12);
  const [d, setD] = _useState(3);
  const [skew, setSkew] = _useState(0.8);
  const [probe, setProbe] = _useState(0);
  const [running, setRunning] = _useState(true);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function reset() {
    const r = rng(12345);
    // zipf-ish cdf over M items, exponent grows with skew
    const s = skew * 1.6; const wgt = []; let tot = 0;
    for (let i = 0; i < M; i++) { const ww = 1 / Math.pow(i + 1, s); wgt.push(ww); tot += ww; }
    const cdf = []; let acc = 0; for (let i = 0; i < M; i++) { acc += wgt[i] / tot; cdf.push(acc); }
    // d hash functions (a,b) per row
    const A = [], Bc = []; for (let rr = 0; rr < d; rr++) { A.push(1 + Math.floor(r() * (PRIME - 1))); Bc.push(Math.floor(r() * PRIME)); }
    const table = Array.from({ length: d }, () => new Float64Array(w));
    const trueC = new Float64Array(M);
    // Carry w and d ON the sketch. The render body reads estimate(st, probe), but reset()
    // runs in an effect -- AFTER render -- so on the render where d has just changed, the
    // new d was being applied to the previous table: st.A[row] came back undefined, the
    // hash became NaN, and st.table[row][NaN] blanked the page. A self-describing sketch
    // cannot go out of step with itself.
    sim.current = { r, cdf, A, Bc, table, trueC, total: 0, w, d };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [w, d, skew]);

  const hashOf = (st, row, x) => ((st.A[row] * x + st.Bc[row]) % PRIME) % st.w;

  function addBatch(n) {
    const st = sim.current; if (!st) return; const { r, cdf } = st;
    for (let b = 0; b < n; b++) {
      const u = r(); let x = 0; while (x < M - 1 && u > cdf[x]) x++;
      st.trueC[x]++; st.total++;
      for (let row = 0; row < st.d; row++) st.table[row][hashOf(st, row, x)]++;
    }
  }
  function estimate(st, x) { let m = Infinity; for (let row = 0; row < st.d; row++) m = Math.min(m, st.table[row][hashOf(st, row, x)]); return m; }

  _useEffect(() => {
    const tick = () => {
      if (running) { addBatch(40); }
      draw(); setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, w, d, skew, probe]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;

    // ---- counter heatmap ----
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText(`SKETCH TABLE  ${d} rows x ${w} counters  =  ${d * w} ints (vs ${M} true keys)`, 16, 20);
    const gx = 18, gy = 34, cw = (W - 36) / w, ch = 26;
    let maxc = 1; for (let row = 0; row < d; row++) for (let c = 0; c < w; c++) maxc = Math.max(maxc, st.table[row][c]);
    const probeCols = []; for (let row = 0; row < d; row++) probeCols.push(hashOf(st, row, probe));
    for (let row = 0; row < d; row++) for (let c = 0; c < w; c++) {
      const v = st.table[row][c] / maxc;
      ctx.fillStyle = `rgba(168,85,247,${0.12 + 0.8 * v})`;
      ctx.fillRect(gx + c * cw + 0.5, gy + row * (ch + 3), cw - 1, ch);
      if (probeCols[row] === c) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.strokeRect(gx + c * cw + 1, gy + row * (ch + 3) + 1, cw - 2, ch - 2); }
    }
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("amber = the cells item #" + probe + " hashes to (one per row)", gx, gy + d * (ch + 3) + 12);

    // ---- probe comparison ----
    const py = gy + d * (ch + 3) + 30;
    const est = estimate(st, probe), tru = st.trueC[probe];
    const err = est - tru;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("QUERY item #" + probe + "  -  estimate = MIN of its " + d + " counters", 16, py);
    const counts = []; for (let row = 0; row < d; row++) counts.push(st.table[row][probeCols[row]]);
    ctx.font = "11px JetBrains Mono"; ctx.fillStyle = "#cbd5e1";
    ctx.fillText("counters: [ " + counts.map(c => c | 0).join(", ") + " ]   ->  min = " + (est | 0), 16, py + 18);

    // bars: true vs estimate
    const by = py + 36, bx = 16, bw = W - 200, maxv = Math.max(est, tru, 1) * 1.1;
    ctx.fillStyle = "#34d399"; ctx.fillRect(bx, by, (tru / maxv) * bw, 16); ctx.fillStyle = "#e2e8f0"; ctx.font = "10px JetBrains Mono"; ctx.fillText("true " + (tru | 0), bx + (tru / maxv) * bw + 6, by + 13);
    ctx.fillStyle = "#a855f7"; ctx.fillRect(bx, by + 22, (est / maxv) * bw, 16); ctx.fillStyle = "#e2e8f0"; ctx.fillText("estimate " + (est | 0), bx + (est / maxv) * bw + 6, by + 35);

    // full spectrum: estimate-vs-true for all items (mini)
    const sx = 16, sy = by + 64, sw = W - 32, sh = H - sy - 16;
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText("ALL KEYS: true (green) vs estimate (violet), sorted by frequency", sx, sy - 6);
    ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.strokeRect(sx, sy, sw, sh);
    const order = Array.from({ length: M }, (_, i) => i).sort((a, b) => st.trueC[b] - st.trueC[a]);
    let mxAll = 1; for (let i = 0; i < M; i++) mxAll = Math.max(mxAll, estimate(st, i));
    const colW = sw / M;
    for (let i = 0; i < M; i++) {
      const it = order[i], e = estimate(st, it), t = st.trueC[it];
      ctx.fillStyle = "rgba(168,85,247,0.5)"; ctx.fillRect(sx + i * colW + 1, sy + sh - (e / mxAll) * sh, colW - 2, (e / mxAll) * sh);
      ctx.fillStyle = "#34d399"; ctx.fillRect(sx + i * colW + 1, sy + sh - (t / mxAll) * sh, colW - 2, 2);
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const est = st ? estimate(st, probe) : 0, tru = st ? st.trueC[probe] : 0;
  // average relative overestimate across observed keys
  let avgErr = 0, cnt = 0; if (st && st.total > 50) { for (let i = 0; i < M; i++) if (st.trueC[i] > 0) { avgErr += (estimate(st, i) - st.trueC[i]) / st.trueC[i]; cnt++; } avgErr = cnt ? avgErr / cnt : 0; }
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// WIDTH  w (counters/row)" min={4} max={40} step={1} value={w} onChange={setW} tone="violet"
        help="Counters per hash row. Wider = fewer collisions = tighter estimates (error ~ total/w), at the cost of more memory. This is the main accuracy dial." />
      <Slider label="// DEPTH  d (hash rows)" min={1} max={6} step={1} value={d} onChange={setD}
        help="Number of independent hash functions / rows. Taking the MIN over more rows makes it exponentially unlikely that ALL of an item's counters were inflated by collisions, so more rows tighten the worst case." />
      <Slider label="// KEY SKEW (Zipf)" min={0} max={1} step={0.05} value={skew} onChange={setSkew}
        help="How skewed the stream is. At 0 all keys are equally frequent; near 1 a few 'heavy hitters' dominate. Count-Min is most accurate exactly for the heavy hitters (their true count dwarfs the collision noise). Resets the sketch." />
      <Slider label="// QUERY ITEM #" min={0} max={M - 1} step={1} value={probe} onChange={setProbe}
        help="Which key to look up. Lower indices are more frequent (under skew). Compare its estimate to its true count, and notice the estimate is never below the truth." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => reset()}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ESTIMATE / TRUE" value={st ? `${est | 0} / ${tru | 0}` : "—"} accent="#a855f7" />
        <StatReadout label="AVG OVEREST." value={st && st.total > 50 ? "+" + Math.round(avgErr * 100) + "%" : "—"} accent={avgErr < 0.2 ? "#34d399" : "#fbbf24"} />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "estimate" },
        { color: "#34d399", label: "true count" },
        { color: "#fbbf24", label: "queried cells" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The grid is the entire data structure — d rows of w counters, far smaller than
        a counter per key. Every item that streams in lights up exactly one cell per
        row (its hash positions) and bumps them. To look an item up, you read just
        those d amber cells and take the smallest. Why the minimum? Two different keys
        can collide into the same counter, and a collision only ever ADDS, so each
        counter is an over-count; the smallest of the d is the one least polluted, and
        it's still guaranteed ≥ the true count. The estimate bar never drops below the
        true bar — Count-Min never underestimates.
      </DemoP>
      <DemoP>
        The bottom strip shows every key: violet estimates against green true counts,
        sorted by frequency. The heavy hitters on the left are nailed (their real
        count swamps any collision noise), which is exactly what you want for "top-k"
        and frequency-cap problems. The error lives in the rare keys on the right,
        where a few collisions can double their tiny counts. Widen w to spread keys out
        (collisions and AVG OVEREST. drop), or add rows d so it's unlikely ALL of a
        key's counters got hit — both shrink the error, trading memory for accuracy. A
        sketch a thousandth the size of the exact table still ranks the popular items
        correctly.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The Count-Min Sketch is a cornerstone probabilistic data structure for
        streaming analytics: approximate frequency counts and "heavy hitters" in
        sublinear memory, with a one-sided error bound (overestimate ≤ ε·total with
        probability 1−δ for w≈e/ε, d≈ln 1/δ). It powers network traffic monitoring,
        trending-item and top-k queries, frequency capping in ad systems, and NLP
        feature counting over massive corpora. It sits in the same streaming toolbox as{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/reservoir-sampling/`} style={{ color: "#a855f7" }}>reservoir sampling</a>{" "}
        (uniform samples), Bloom filters (set membership), and HyperLogLog (distinct
        counts) — all trading exactness for tiny, fixed memory.
      </DemoP>
      <DemoP>
        Caveats: it OVERestimates (Count-Min); the related Count-Sketch is unbiased but
        two-sided. Accuracy is relative to the total stream mass, so low-frequency keys
        are noisy and the structure shines on skewed data with clear heavy hitters.
        Deletions need a conservative variant, the hash functions should be pairwise-
        independent for the bounds to hold, and it gives frequencies, not the identities
        of the heavy hitters (pair it with a heap or use its conservative-update
        variant). Choosing w and d is the usual accuracy-vs-memory budget.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Count-Min Sketch"
      subtitle="Estimate item frequencies in a massive stream using a tiny d×w table of hashed counters. Each item bumps one counter per row; a query takes the minimum, so collisions only ever overestimate. Widen the table or add rows to tighten the bound."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CountMinDemo />);
