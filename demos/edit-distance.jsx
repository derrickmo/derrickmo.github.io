// demos/edit-distance.jsx — Levenshtein edit distance by dynamic programming.
//
// dp[i][j] = min edits to turn the first i chars of A into the first j chars of B.
// Base: dp[i][0]=i (delete all), dp[0][j]=j (insert all). Recurrence:
//   match  -> dp[i-1][j-1]
//   else   -> 1 + min( dp[i-1][j] delete, dp[i][j-1] insert, dp[i-1][j-1] substitute ).
// We fill the table cell by cell (highlighting the source cells), then backtrack
// the bottom-right corner to recover the actual edit operations and a character
// alignment. The DP paradigm applied to strings instead of a knapsack.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const PAIRS = [
  { value: "kitten", a: "kitten", b: "sitting" },
  { value: "sunday", a: "sunday", b: "saturday" },
  { value: "book", a: "book", b: "back" },
  { value: "dna", a: "GCTAA", b: "GTTAC" },
];

function EditDistanceDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);
  const [pair, setPair] = _useState("kitten");
  const [speed, setSpeed] = _useState(14);
  const [running, setRunning] = _useState(false);
  const [step, setStep] = _useState(0);
  const stRef = _useRef(null);

  function build() {
    const p = PAIRS.find(x => x.value === pair);
    const A = p.a, B = p.b, m = A.length, n = B.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    const order = [];
    for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) {
      if (i === 0) dp[i][j] = j; else if (j === 0) dp[i][j] = i;
      else if (A[i - 1] === B[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      order.push({ i, j });
    }
    // backtrack operations
    const ops = []; let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && A[i - 1] === B[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { ops.push({ op: "match", a: A[i - 1], b: B[j - 1] }); i--; j--; }
      else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.push({ op: "sub", a: A[i - 1], b: B[j - 1] }); i--; j--; }
      else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.push({ op: "del", a: A[i - 1], b: "-" }); i--; }
      else { ops.push({ op: "ins", a: "-", b: B[j - 1] }); j--; }
    }
    ops.reverse();
    stRef.current = { A, B, m, n, dp, order, ops, dist: dp[m][n] };
    setStep(0); setRunning(false);
  }
  _useEffect(() => { build(); /* eslint-disable-next-line */ }, [pair]);

  const s = stRef.current;
  const total = s ? s.order.length : 0;
  const done = step >= total;

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => { if (now - lastRef.current >= 1000 / speed) { lastRef.current = now; setStep(v => { if (v >= total) { setRunning(false); return v; } return v + 1; }); } rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, total]);

  function draw() {
    const cv = canvasRef.current; if (!cv || !s) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    const cols = s.n + 2, rows = s.m + 2;  // +1 for header chars, +1 for empty-prefix
    const cell = Math.min(40, (W - 60) / cols, 260 / rows), ox = 60, oy = 50;

    // header chars (B across top, A down left)
    ctx.font = "12px JetBrains Mono"; ctx.fillStyle = "#a855f7";
    for (let j = 0; j < s.n; j++) ctx.fillText(s.B[j], ox + (j + 2) * cell + cell / 2, oy - 10);
    ctx.fillStyle = "#34d399";
    for (let i = 0; i < s.m; i++) ctx.fillText(s.A[i], ox - 12, oy + (i + 2) * cell + cell / 2);

    const filled = new Set(); for (let k = 0; k < step; k++) { const e = s.order[k]; filled.add(e.i * (s.n + 1) + e.j); }
    const cur = step > 0 && step <= total ? s.order[step - 1] : null;
    const maxV = Math.max(s.m, s.n, 1);
    for (let i = 0; i <= s.m; i++) for (let j = 0; j <= s.n; j++) {
      const x = ox + (j + 1) * cell, y = oy + (i + 1) * cell, on = filled.has(i * (s.n + 1) + j);
      ctx.fillStyle = on ? `rgba(96,165,250,${0.12 + 0.4 * (1 - s.dp[i][j] / maxV)})` : "rgba(30,41,59,0.4)";
      if (cur && cur.i === i && cur.j === j) ctx.fillStyle = "rgba(251,191,36,0.6)";
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      if (on) { ctx.fillStyle = "#e2e8f0"; ctx.font = "11px JetBrains Mono"; ctx.fillText(String(s.dp[i][j]), x + cell / 2, y + cell / 2); }
    }
    // source-cell highlight
    if (cur && cur.i > 0 && cur.j > 0) {
      const hl = (i, j) => { ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.strokeRect(ox + (j + 1) * cell + 1, oy + (i + 1) * cell + 1, cell - 2, cell - 2); };
      hl(cur.i - 1, cur.j - 1); hl(cur.i - 1, cur.j); hl(cur.i, cur.j - 1);
    }
    if (done) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2.5; ctx.strokeRect(ox + (s.n + 1) * cell + 1, oy + (s.m + 1) * cell + 1, cell - 2, cell - 2); }

    // alignment result
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const ay = oy + (s.m + 2) * cell + 24;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("ALIGNMENT  ·  green match · amber substitute · red insert/delete", 20, ay - 6);
    if (done) {
      const colOf = (op) => op === "match" ? "#34d399" : op === "sub" ? "#fbbf24" : "#f87171";
      let x = 24; ctx.font = "16px JetBrains Mono";
      s.ops.forEach(o => {
        ctx.fillStyle = colOf(o.op);
        ctx.fillText(o.a, x, ay + 22); ctx.fillText(o.b, x, ay + 44);
        x += 18;
      });
      ctx.fillStyle = "#60a5fa"; ctx.font = "600 22px Space Grotesk, JetBrains Mono";
      ctx.fillText("edit distance: " + s.dist, 24, ay + 78);
    } else { ctx.fillStyle = "#64748b"; ctx.fillText("filling table… " + step + "/" + total, 24, ay + 20); }
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
      <SegmentedControl label="// STRINGS" tone="violet" value={pair} onChange={setPair}
        options={PAIRS.map(p => ({ value: p.value, label: p.a + "→" + p.b }))}
        help="The two strings to align. A (green, rows) is transformed into B (violet, columns). The DNA pair shows the same algorithm used for biological sequence alignment." />
      <Slider label="// SPEED (cells/sec)" min={3} max={40} step={1} value={speed} onChange={setSpeed}
        help="Table-fill speed. Slow it to watch each cell take the cheapest of its three neighbors (diagonal for match/substitute, up for delete, left for insert)." />
      <DemoButton onClick={() => { if (done) setStep(0); setRunning(r => !r); }} primary>{running ? "PAUSE" : (done ? "REPLAY" : "FILL TABLE")}</DemoButton>
      <DemoButton onClick={() => setStep(v => Math.min(total, v + 1))}>STEP</DemoButton>
      <DemoButton onClick={() => setStep(0)}>RESET</DemoButton>
      <StatReadout label="EDIT DISTANCE" value={done && s ? s.dist : "—"} accent="#60a5fa" />
      <Legend items={[
        { color: "#34d399", label: "match (free)" },
        { color: "#fbbf24", label: "substitute (+1)" },
        { color: "#f87171", label: "insert/delete (+1)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Edit distance is the fewest single-character insertions, deletions, and
        substitutions to turn one string into another. The DP table builds the
        answer from prefixes: every cell is the cheapest way to align A's first i
        characters with B's first j, computed from three already-solved neighbors —
        the diagonal (the characters match for free, or substitute for +1), the
        cell above (delete from A, +1), and the cell to the left (insert into B,
        +1). Green outlines mark exactly those three sources.
      </DemoP>
      <DemoP>
        The bottom-right cell is the answer, but the path to it is the actual edit
        script. Backtracking from that corner recovers the alignment shown below:
        green columns are matches, amber are substitutions, red are gaps
        (insert/delete). It's the same fill-then-backtrack two-step as the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knapsack/`} style={{ color: "#a855f7" }}>knapsack</a>{" "}
        table — dynamic programming applied to strings rather than items.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Levenshtein distance is a workhorse of computing: spell-checkers and
        fuzzy search rank candidates by it, diff and version-control tools compute
        it on lines, and the identical recurrence (Needleman-Wunsch / Smith-
        Waterman) aligns DNA and protein sequences in bioinformatics. It's a clean
        case of the dynamic-programming pattern — optimal substructure plus
        overlapping subproblems, O(m·n) in time and space (reducible to O(min(m,n))
        space if you only need the number).
      </DemoP>
      <DemoP>
        It generalizes far beyond characters: weighted edits give tunable
        similarity, and the same alignment DP underlies dynamic time warping for
        time series and CTC alignment when training speech and handwriting models.
        Whenever "how similar are these two sequences, and how do they line up?"
        comes up, this table is the answer — the string sibling of the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knapsack/`} style={{ color: "#a855f7" }}>knapsack DP</a>.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="DYNAMIC PROGRAMMING" title="Edit Distance"
      subtitle="The fewest insert/delete/substitute edits between two strings. Watch the DP table fill from its neighbors, then backtrack the character alignment."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<EditDistanceDemo />);
