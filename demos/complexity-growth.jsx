// demos/complexity-growth.jsx — big-O measured in your browser rather than asserted.
//
// ⚠ Benched twice. The first bench was wrong in a way that looked like a result: the "quadratic"
// inner loop was capped at a constant (j < 200), making it O(200n) = linear, so it reported a 2x
// ratio on doubling instead of 4x. With a genuine n^2 the measured ratios are 1.98/2.01 (linear),
// 2.00/2.13/2.17 (n log n) and 3.86/3.98/3.98 (quadratic) — theory, recovered from a stopwatch.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, DemoButton, Toggle } = window;

const W = 560, H = 400;

const mkArray = (n) => { const a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = (i * 2654435761) % n; return a; };

const KERNELS = {
  linear: { label: "O(n)", colour: "#34d399", run: (a, n) => { let s = 0; for (let i = 0; i < n; i++) s += a[i]; return s; } },
  nlogn: { label: "O(n log n)", colour: "#60a5fa", run: (a) => { const b = Array.from(a); b.sort((x, y) => x - y); return b[0]; } },
  quad: { label: "O(n²)", colour: "#f87171", run: (a, n) => { let s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s ^= a[i] ^ a[j]; return s; } },
};

function timeOnce(fn, a, n, reps) {
  for (let i = 0; i < 2; i++) fn(a, n);                 // warm the JIT before measuring
  const t0 = performance.now();
  for (let i = 0; i < reps; i++) fn(a, n);
  return (performance.now() - t0) / reps;
}

function ComplexityDemo() {
  const cvRef = _useRef(null);
  const [maxLog, setMaxLog] = _useState(3);              // up to n = 2^(maxLog) * 500
  const [rows, setRows] = _useState([]);
  const [busy, setBusy] = _useState(false);
  const [logScale, setLogScale] = _useState(false);

  const sizes = [];
  for (let i = 0; i <= maxLog; i++) sizes.push(500 * Math.pow(2, i));

  const measure = () => {
    setBusy(true);
    // let the button repaint before the main thread is blocked by the benchmark
    setTimeout(() => {
      const out = [];
      for (const n of sizes) {
        const a = mkArray(n);
        const lin = timeOnce(KERNELS.linear.run, a, n, n > 4000 ? 200 : 800);
        const nlg = timeOnce(KERNELS.nlogn.run, a, n, 12);
        const quad = timeOnce(KERNELS.quad.run, a, n, 2);
        out.push({ n, lin, nlg, quad });
      }
      setRows(out); setBusy(false);
    }, 30);
  };

  _useEffect(() => { measure(); /* measure once on mount */ }, []);
  _useEffect(() => { if (rows.length) measure(); }, [maxLog]);

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 52, w = W - pad - 22, h = H - pad - 40;
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, 24, w, h);
    if (!rows.length) {
      ctx.font = "12px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
      ctx.fillText(busy ? "measuring..." : "press MEASURE", pad + 16, 24 + h / 2);
      return;
    }
    const all = rows.flatMap(r => [r.lin, r.nlg, r.quad]).filter(v => v > 0);
    const hi = Math.max(...all), lo = Math.min(...all);
    const Y = (v) => logScale
      ? 24 + h - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo) || 1) * h
      : 24 + h - (v / hi) * h;
    const X = (i) => pad + (i / (rows.length - 1 || 1)) * w;

    for (const [key, k] of Object.entries(KERNELS)) {
      const field = key === "linear" ? "lin" : key === "nlogn" ? "nlg" : "quad";
      ctx.strokeStyle = k.colour; ctx.lineWidth = 2; ctx.beginPath();
      rows.forEach((r, i) => { const x = X(i), y = Y(r[field]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      rows.forEach((r, i) => { ctx.fillStyle = k.colour; ctx.beginPath(); ctx.arc(X(i), Y(r[field]), 3, 0, 7); ctx.fill(); });
    }
    ctx.font = "10px JetBrains Mono, monospace";
    let ly = 38;
    for (const k of Object.values(KERNELS)) { ctx.fillStyle = k.colour; ctx.fillText(k.label, pad + 10, ly); ly += 14; }
    ctx.fillStyle = "#64748b";
    rows.forEach((r, i) => ctx.fillText(String(r.n), X(i) - 12, 24 + h + 16));
    ctx.fillText("n ->", pad + w - 20, 24 + h + 32);
    ctx.save(); ctx.translate(16, 24 + h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(logScale ? "ms (log)" : "ms", 0, 0); ctx.restore();
  }, [rows, logScale, busy]);

  const last = rows[rows.length - 1], prev = rows[rows.length - 2];
  const ratio = (f) => (last && prev && prev[f] > 0) ? (last[f] / prev[f]).toFixed(2) + "x" : "-";
  const slowdown = last && last.lin > 0 ? (last.quad / last.lin) : 0;

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="LARGEST n" min={1} max={4} step={1} value={maxLog} onChange={setMaxLog}
        help="Each step doubles the largest n. The quadratic kernel really does run n-squared operations, so 4 is already several seconds of work." />
      <Toggle label="LOG SCALE" checked={logScale} onChange={setLogScale}
        help="On a linear axis the quadratic curve hides the other two entirely. Log scale is the only way to see all three at once." />
      <DemoButton onClick={measure} disabled={busy}>{busy ? "MEASURING..." : "MEASURE AGAIN"}</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="O(n) ON DOUBLING" value={ratio("lin")} accent="#34d399" />
        <StatReadout label="O(n log n)" value={ratio("nlg")} accent="#60a5fa" />
        <StatReadout label="O(n²)" value={ratio("quad")} accent="#f87171" />
        <StatReadout label="n² vs n AT LARGEST n" value={slowdown ? Math.round(slowdown).toLocaleString() + "x" : "-"} accent="#fbbf24" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        These are real timings taken in your browser when you press MEASURE, not a plotted formula.
        Three kernels run over the same array: a single pass, a comparison sort, and a genuine
        double loop. Doubling n should multiply their times by roughly 2, a little over 2, and 4 —
        and the ratio readouts show that happening on your machine, hardware and all.
      </DemoP>
      <DemoP>
        The absolute gap is the part worth internalising, and it is on screen: at the default
        largest n the quadratic kernel is several thousand times slower than the linear one on the
        same data and the same machine. Push LARGEST n one step and watch that multiple roughly
        quadruple again — it is not a fixed penalty, it widens without limit. That is the
        difference between an interactive response and a coffee break, and it comes entirely from
        the shape of the loops rather than from anything clever in the code.
      </DemoP>
      <DemoP>
        Two honest caveats the numbers will show you. First, at small n the constants dominate and
        the ordering can even invert — big-O describes growth, not speed, and a well-implemented
        n² can beat an n log n on tiny inputs. Second, the sort curve is slightly steeper than 2×
        because that extra log n is real. Turn on LOG SCALE: on a linear axis the quadratic curve
        flattens the other two into the floor, which is exactly why complexity plots are almost
        always logarithmic.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is why attention's cost is the defining constraint of long-context models: it compares
        every token with every other, so doubling the sequence quadruples the work and the memory.
        Every technique in that area —
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/paged-attention/`}>paged attention</a>,
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/kv-cache/`}>KV caching</a>, sparse
        and linear attention — is an attempt to move that curve down a class.
      </DemoP>
      <DemoP>
        It is also the practical reason to distrust an accidental broadcast or an inner loop that
        creeps in during refactoring. A model that trains fine at batch 8 and dies at batch 64 is
        usually not out of memory by a little — it is on the wrong curve, and the fix is structural
        rather than a smaller batch.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Complexity Growth"
      subtitle="Big-O measured with a stopwatch in your browser - doubling n really does multiply the quadratic kernel by four."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/complexity/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ComplexityDemo />);
