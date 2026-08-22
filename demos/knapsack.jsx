// demos/knapsack.jsx — 0/1 knapsack by dynamic programming.
//
// Maximize total value of items packed into a weight budget C, each item taken
// at most once. The DP table dp[i][c] = best value using the first i items within
// capacity c, filled by the recurrence
//   dp[i][c] = max( dp[i-1][c],  dp[i-1][c - w_i] + v_i )   (second term if w_i ≤ c).
// We animate the table filling cell by cell (highlighting the two cells each new
// value comes from), then backtrack from the bottom-right to recover which items
// were chosen — overlapping subproblems + optimal substructure made visible.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;

function KnapsackDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);
  const [C, setC] = _useState(10);
  const [Nit, setNit] = _useState(5);
  const [speed, setSpeed] = _useState(12);
  const [running, setRunning] = _useState(false);
  const [step, setStep] = _useState(0);
  const stRef = _useRef(null);

  function build() {
    const items = Array.from({ length: Nit }, () => ({ w: 1 + ((Math.random() * Math.min(6, C - 1)) | 0), v: 2 + ((Math.random() * 8) | 0) }));
    const dp = Array.from({ length: Nit + 1 }, () => new Array(C + 1).fill(0));
    const cells = []; // fill order with source info
    for (let i = 1; i <= Nit; i++) {
      for (let c = 0; c <= C; c++) {
        const skip = dp[i - 1][c];
        let take = -1, src = "skip";
        if (items[i - 1].w <= c) { take = dp[i - 1][c - items[i - 1].w] + items[i - 1].v; }
        dp[i][c] = Math.max(skip, take);
        if (take > skip) src = "take";
        cells.push({ i, c, src, w: items[i - 1].w });
      }
    }
    // backtrack chosen items
    const chosen = new Set(); let c = C;
    for (let i = Nit; i >= 1; i--) { if (dp[i][c] !== dp[i - 1][c]) { chosen.add(i - 1); c -= items[i - 1].w; } }
    stRef.current = { items, dp, cells, chosen, best: dp[Nit][C] };
    setStep(0); setRunning(false);
  }
  _useEffect(() => { build(); /* eslint-disable-next-line */ }, [C, Nit]);

  const s = stRef.current;
  const totalCells = s ? s.cells.length : 0;
  const done = step >= totalCells;

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 1000 / speed) { lastRef.current = now; setStep(v => { if (v >= totalCells) { setRunning(false); return v; } return v + 1; }); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, totalCells]);

  function draw() {
    const cv = canvasRef.current; if (!cv || !s) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "10px JetBrains Mono"; ctx.textBaseline = "middle"; ctx.textAlign = "center";

    // table geometry
    const cols = C + 1, rows = Nit + 1;
    const tx = 70, ty = 56, cw = Math.min(34, (W - tx - 16) / cols), chh = Math.min(30, (300 - ty) / rows);
    // filled set
    const filled = new Set();
    for (let k = 0; k < step; k++) { const e = s.cells[k]; filled.add(e.i * (C + 1) + e.c); }
    const cur = step > 0 && step <= totalCells ? s.cells[step - 1] : null;
    // max value for color
    const maxV = s.best || 1;
    // header
    ctx.fillStyle = "#94a3b8"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("capacity →", tx + cols * cw / 2, ty - 14);
    ctx.save(); ctx.translate(tx - 40, ty + rows * chh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("items →", 0, 0); ctx.restore();
    for (let c = 0; c <= C; c++) { ctx.fillStyle = "#64748b"; ctx.fillText(String(c), tx + c * cw + cw / 2, ty - 4); }
    for (let i = 0; i <= Nit; i++) { ctx.fillStyle = "#64748b"; ctx.fillText(i === 0 ? "∅" : String(i), tx - 12, ty + i * chh + chh / 2); }

    for (let i = 0; i <= Nit; i++) for (let c = 0; c <= C; c++) {
      const x = tx + c * cw, y = ty + i * chh, key = i * (C + 1) + c;
      const isFilled = i === 0 || filled.has(key);
      ctx.fillStyle = isFilled ? `rgba(96,165,250,${0.08 + 0.5 * (s.dp[i][c] / maxV)})` : "rgba(30,41,59,0.4)";
      if (cur && cur.i === i && cur.c === c) ctx.fillStyle = "rgba(251,191,36,0.6)";
      ctx.fillRect(x + 1, y + 1, cw - 2, chh - 2);
      if (isFilled) { ctx.fillStyle = "#e2e8f0"; ctx.font = "9px JetBrains Mono"; ctx.fillText(String(s.dp[i][c]), x + cw / 2, y + chh / 2); }
    }
    // highlight the two source cells of the current fill
    if (cur) {
      const hi = (i, c) => { if (c < 0) return; ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.strokeRect(tx + c * cw + 1, ty + i * chh + 1, cw - 2, chh - 2); };
      hi(cur.i - 1, cur.c);
      if (cur.src === "take") hi(cur.i - 1, cur.c - cur.w);
    }
    // backtrack outline at completion
    if (done) {
      let c = C;
      for (let i = Nit; i >= 1; i--) {
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.strokeRect(tx + c * cw + 1, ty + i * chh + 1, cw - 2, chh - 2);
        if (s.chosen.has(i - 1)) c -= s.items[i - 1].w;
      }
    }

    // items list
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const iy = ty + rows * chh + 28;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("ITEMS  (w = weight, v = value) · green = chosen at completion", tx - 50, iy - 6);
    s.items.forEach((it, idx) => {
      const x = tx - 50 + (idx % 5) * 96, y = iy + Math.floor(idx / 5) * 26;
      const chosen = done && s.chosen.has(idx);
      ctx.fillStyle = chosen ? "rgba(52,211,153,0.18)" : "rgba(148,163,184,0.08)";
      ctx.fillRect(x, y, 88, 20);
      ctx.fillStyle = chosen ? "#34d399" : "#cbd5e1"; ctx.font = "10px JetBrains Mono";
      ctx.fillText("#" + (idx + 1) + " w" + it.w + " v" + it.v, x + 6, y + 14);
    });
    // best value
    if (done) {
      ctx.fillStyle = "#34d399"; ctx.font = "600 22px Space Grotesk, JetBrains Mono";
      ctx.fillText("best value: " + s.best, tx - 50, iy + 26 * Math.ceil(Nit / 5) + 24);
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const chosenW = s ? [...s.chosen].reduce((a, i) => a + s.items[i].w, 0) : 0;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CAPACITY (C)" min={6} max={14} step={1} value={C} onChange={setC} tone="violet"
        help="The weight budget — the number of table columns. The DP runs in O(N·C) time and space, which is pseudo-polynomial: linear in the numeric capacity, not in its bit-length. That subtlety is why knapsack is NP-hard despite this neat table." />
      <Slider label="// ITEMS (N)" min={3} max={6} step={1} value={Nit} onChange={setNit}
        help="Number of items, each with a random weight and value — the table rows. Each row decides one item: take it or skip it, reusing the row above." />
      <Slider label="// SPEED (cells/sec)" min={2} max={40} step={2} value={speed} onChange={setSpeed}
        help="Table-fill speed. Slow it down to watch each cell take the max of 'skip this item' (cell directly above) and 'take it' (cell above, shifted left by its weight, plus its value)." />
      <DemoButton onClick={() => { if (done) setStep(0); setRunning(r => !r); }} primary>{running ? "PAUSE" : (done ? "REPLAY" : "FILL TABLE")}</DemoButton>
      <DemoButton onClick={() => setStep(v => Math.min(totalCells, v + 1))}>STEP</DemoButton>
      <DemoButton onClick={build}>NEW ITEMS</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="BEST VALUE" value={done && s ? s.best : "—"} accent="#34d399" />
        <StatReadout label="WEIGHT USED" value={done && s ? chosenW + "/" + C : "—"} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#fbbf24", label: "current cell / solution path" },
        { color: "#34d399", label: "source cells / chosen item" },
        { color: "#60a5fa", label: "filled value (brighter = higher)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Brute-forcing 0/1 knapsack means trying all 2ᴺ subsets. Dynamic programming
        does far better by noticing the subproblems overlap: the best you can do
        with the first i items and capacity c only depends on smaller versions of
        the same question. Each cell takes the max of two already-computed cells —
        "skip item i" (the cell directly above) and "take item i" (the cell above,
        shifted left by the item's weight, plus its value). Watch the green
        outlines show exactly those two sources for every cell.
      </DemoP>
      <DemoP>
        Once the table is full, the bottom-right cell holds the optimal value — but
        not which items to pack. So we backtrack (the yellow path): at each row,
        if the value changed from the row above, that item was taken; step left by
        its weight and continue. The chosen items light up green. Fill order and
        backtracking are the two halves every DP shares: compute the values
        bottom-up, then trace the decisions back down.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Dynamic programming is one of the pillars of algorithms — optimal
        substructure plus overlapping subproblems, solved once and memoized. The
        knapsack table is the canonical example, but the same pattern powers edit
        distance, sequence alignment in bioinformatics, shortest paths
        (Bellman-Ford, Floyd-Warshall), and resource allocation. It's the
        complete, exact alternative to the greedy heuristics and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/n-queens/`} style={{ color: "#a855f7" }}>backtracking</a>{" "}
        search elsewhere in this section.
      </DemoP>
      <DemoP>
        It runs through machine learning too: the Bellman equation behind{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/value-iteration/`} style={{ color: "#a855f7" }}>value
        iteration</a> is dynamic programming over states, the Viterbi algorithm
        decodes HMMs, and CTC alignment trains speech models — all the same
        "build optimal answers from optimal sub-answers" idea. The catch knapsack
        exposes: the table is O(N·C), pseudo-polynomial in the capacity, so DP is
        only practical when that dimension stays small.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Knapsack (DP)"
      subtitle="Pack the most value into a weight budget. Watch the DP table fill from its sub-answers, then backtrack to recover which items to take."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<KnapsackDemo />);
