// demos/reservoir-sampling.jsx — Algorithm R, a uniform sample of a stream.
//
// You want k random items from a stream whose length you don't know and can't
// store. Reservoir sampling (Vitter's Algorithm R) does it in ONE pass with O(k)
// memory: keep the first k items; then for the i-th item (i>k) accept it with
// probability k/i, and if accepted, evict a uniformly random current slot. The
// magic: when the stream ends, EVERY item seen has the same probability k/n of
// being in the reservoir, no matter when it arrived. We animate one illustrative
// pass and, in the background, run thousands of silent passes to build a histogram
// of how often each stream position survives — flat at k/n for Algorithm R, and
// badly skewed for the naive "keep first/last k" shortcuts.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 460;

function ReservoirDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [k, setK] = _useState(4);
  const [N, setN] = _useState(32);
  const [method, setMethod] = _useState("reservoir");
  const [running, setRunning] = _useState(true);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);
  const frameRef = _useRef(0);

  function rng() { return Math.random(); }
  function randint(n) { return Math.floor(rng() * n); }

  function reset() {
    sim.current = { counts: new Float64Array(N), passes: 0, vi: 0, vres: [], vAcc: 0, flash: 0 };
    frameRef.current = 0;
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [k, N, method]);

  // one silent pass -> increment counts of surviving positions
  function silentPass() {
    const st = sim.current; const counts = st.counts;
    const res = new Int32Array(k).fill(-1);
    for (let i = 1; i <= N; i++) {
      if (method === "reservoir") {
        if (i <= k) res[i - 1] = i; else { const j = randint(i) + 1; if (j <= k) res[j - 1] = i; }
      } else if (method === "first") { if (i <= k) res[i - 1] = i; }
      else { res[(i - 1) % k] = i; } // keep-last
    }
    for (let s = 0; s < k; s++) if (res[s] >= 1) counts[res[s] - 1]++;
    st.passes++;
  }

  // advance the illustrative visible pass by one item
  function visibleStep() {
    const st = sim.current;
    st.vi++;
    if (st.vi > N) { st.vi = 1; st.vres = []; }
    const i = st.vi;
    let accepted = false, slot = -1;
    if (method === "reservoir") {
      if (i <= k) { st.vres[i - 1] = i; accepted = true; slot = i - 1; }
      else { const j = randint(i) + 1; if (j <= k) { st.vres[j - 1] = i; accepted = true; slot = j - 1; } }
    } else if (method === "first") { if (i <= k) { st.vres[i - 1] = i; accepted = true; slot = i - 1; } }
    else { slot = (i - 1) % k; st.vres[slot] = i; accepted = true; }
    st.vAcc = accepted ? 1 : -1; st.flash = 1; st.vslot = slot;
  }

  _useEffect(() => {
    const tick = () => {
      frameRef.current++;
      if (running) {
        for (let b = 0; b < 120; b++) silentPass();        // fast Monte-Carlo for the histogram
        if (frameRef.current % 7 === 0) visibleStep();      // slow illustrative pass
        const st = sim.current; if (st && st.flash > 0) st.flash -= 0.08;
      }
      draw(); setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, k, N, method]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;

    // ---- reservoir slots ----
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("RESERVOIR (k slots) — items currently held", 16, 20);
    const bw = 40, gap = 8, total = k * bw + (k - 1) * gap, x0 = (W - total) / 2;
    for (let s = 0; s < k; s++) {
      const x = x0 + s * (bw + gap), y = 34;
      const held = st.vres[s];
      ctx.fillStyle = "rgba(168,85,247,0.16)"; ctx.strokeStyle = "rgba(168,85,247,0.6)"; ctx.lineWidth = 1.5;
      if (st.flash > 0 && s === st.vslot) { ctx.fillStyle = st.vAcc > 0 ? "rgba(52,211,153,0.3)" : "rgba(168,85,247,0.16)"; }
      ctx.beginPath(); ctx.rect(x, y, bw, 34); ctx.fill(); ctx.stroke();
      if (held) { ctx.fillStyle = "#e2e8f0"; ctx.font = "600 13px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText(held, x + bw / 2, y + 22); ctx.textAlign = "left"; }
    }

    // ---- current item + decision ----
    const i = st.vi, p = method === "reservoir" ? Math.min(1, k / Math.max(1, i)) : (method === "first" ? (i <= k ? 1 : 0) : 1);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("STREAM", 16, 104);
    ctx.fillStyle = "#60a5fa"; ctx.font = "600 13px JetBrains Mono"; ctx.fillText("item " + i + " of " + N, 80, 104);
    if (st.flash > 0) { ctx.fillStyle = st.vAcc > 0 ? "#34d399" : "#f87171"; ctx.fillText(st.vAcc > 0 ? "ACCEPT" : "skip", 210, 104); }
    ctx.fillStyle = "#64748b"; ctx.font = "11px JetBrains Mono";
    ctx.fillText(method === "reservoir" ? `accept prob k/i = ${k}/${i} = ${p.toFixed(2)}` : (method === "first" ? "keep only the first k" : "always keep the last k"), 300, 104);

    // ---- histogram: inclusion frequency by position ----
    const hx0 = 20, hy0 = 150, hw = W - 40, hh = H - hy0 - 26;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("HOW OFTEN EACH STREAM POSITION SURVIVES  (over " + st.passes.toLocaleString() + " passes)", hx0, hy0 - 8);
    ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.strokeRect(hx0, hy0, hw, hh);
    const barW = hw / N;
    for (let p2 = 0; p2 < N; p2++) {
      const f = st.passes ? st.counts[p2] / st.passes : 0;
      const bh = f * hh;
      ctx.fillStyle = method === "reservoir" ? "rgba(168,85,247,0.8)" : "rgba(248,113,113,0.75)";
      ctx.fillRect(hx0 + p2 * barW + 0.5, hy0 + hh - bh, barW - 1, bh);
    }
    // theoretical k/N line (uniform target)
    const yTarget = hy0 + hh - (k / N) * hh;
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(hx0, yTarget); ctx.lineTo(hx0 + hw, yTarget); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#34d399"; ctx.font = "10px JetBrains Mono"; ctx.fillText("uniform target k/N = " + (k / N).toFixed(2), hx0 + hw - 150, yTarget - 5);
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("stream position 1 .. N", hx0, hy0 + hh + 14);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  // flatness metric: max deviation of freq from k/N (reservoir -> ~0)
  let flat = 0; if (st && st.passes > 50) { const tgt = k / N; let mx = 0; for (let p = 0; p < N; p++) mx = Math.max(mx, Math.abs(st.counts[p] / st.passes - tgt)); flat = mx; }
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// METHOD" value={method} onChange={setMethod}
        options={[{ value: "reservoir", label: "Algorithm R" }, { value: "first", label: "Keep first k" }, { value: "last", label: "Keep last k" }]}
        help="Reservoir = the correct one-pass uniform sampler (accept item i with prob k/i). 'Keep first k' and 'keep last k' are the tempting shortcuts — watch the histogram expose how badly they over-sample the early or late part of the stream." />
      <Slider label="// RESERVOIR SIZE  k" min={1} max={10} step={1} value={k} onChange={setK} tone="violet"
        help="How many items to keep. The uniform target each position should hit is exactly k/N — the green dashed line. Bigger k raises that line." />
      <Slider label="// STREAM LENGTH  N" min={12} max={60} step={1} value={N} onChange={setN}
        help="Total items in the stream (the algorithm never needs to know this in advance — it's only here to draw the histogram). Larger N makes late items rarer to accept (k/i shrinks) yet keeps every position equally likely overall." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => reset()}>RESET STATS</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PASSES" value={st ? st.passes.toLocaleString() : 0} accent="#a855f7" />
        <StatReadout label="MAX DEVIATION" value={st && st.passes > 50 ? flat.toFixed(3) : "—"} accent={flat < 0.03 ? "#34d399" : "#f87171"} />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "inclusion frequency" },
        { color: "#34d399", label: "uniform target k/N" },
        { color: "#f87171", label: "biased method" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Up top, items stream past one at a time and the reservoir holds k of them.
        The first k just fill the slots. After that, item i is accepted with
        probability exactly k/i — note how that shrinks as the stream grows (item 100
        in a size-4 reservoir has only a 4% chance) — and when accepted it kicks out a
        random current occupant. That's the entire algorithm: one pass, k slots, never
        storing the stream, and you never had to know how long it would be.
      </DemoP>
      <DemoP>
        The histogram is the proof. It counts, over thousands of complete passes, how
        often each stream POSITION ends up in the final sample. For Algorithm R every
        bar sits on the green k/N line — perfectly uniform, MAX DEVIATION near zero —
        so a brand-new item and the very first item are equally likely to be kept.
        Now flip METHOD to "Keep first k" and the bars collapse to a block of 1s at
        the start and 0s everywhere else; "Keep last k" does the mirror image. Both
        are O(k) memory too, but they're biased samples. Reservoir sampling is the one
        that's actually uniform — which is why it's the standard for sampling logs,
        clickstreams, and any data too big to hold.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Reservoir sampling is the canonical streaming/online algorithm: a uniform
        random sample from a stream of unknown or unbounded length in a single pass
        and constant memory. It's everywhere in big-data systems — sampling log lines,
        events, and database rows; building train/validation splits over data that
        won't fit in RAM; A/B test exposure; and it's a building block of approximate
        query engines alongside count-min sketches and HyperLogLog. The accept-with-
        decreasing-probability idea is a discrete relative of the reweighting in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/importance-sampling/`} style={{ color: "#a855f7" }}>importance sampling</a>{" "}
        and the random acceptance in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/mcmc/`} style={{ color: "#a855f7" }}>MCMC</a>.
      </DemoP>
      <DemoP>
        Caveats: basic Algorithm R gives UNWEIGHTED uniform sampling — weighted
        variants (A-Res / A-ExpJ) are needed when items have different importance, and
        time-decay or sliding-window sampling needs yet other schemes. It's a sample
        WITHOUT replacement of a fixed size; it can't grow the sample after the fact
        without re-streaming. Vitter's Algorithm L speeds it up by sampling how many
        items to skip instead of flipping a coin per item. And like any random sample,
        a size-k reservoir still has sampling error ~1/√k — it shrinks the data, it
        doesn't remove variance.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Reservoir Sampling"
      subtitle="Keep a uniform random sample of k items from a stream you can't store and whose length you don't know — in one pass, O(k) memory. The histogram proves every position survives with equal probability k/N, while the naive 'keep first/last k' shortcuts are visibly biased."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ReservoirDemo />);
