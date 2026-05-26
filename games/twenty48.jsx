// games/twenty48.jsx — play 2048 (arrow keys / buttons) with an expectimax AI that
// can suggest the best move or take over and autoplay. Real game + real search.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, SegmentedControl, DemoButton, StatReadout, ControlGroup,
} = window;

const N = 4;
const empty = () => Array.from({ length: N }, () => new Array(N).fill(0));
const clone = (g) => g.map(r => r.slice());
const transpose = (g) => g[0].map((_, c) => g.map(r => r[c]));
const reverse = (g) => g.map(r => r.slice().reverse());

function moveLeftRow(row) {
  const xs = row.filter(v => v), out = []; let gained = 0;
  for (let i = 0; i < xs.length; i++) { if (xs[i] === xs[i + 1]) { out.push(xs[i] * 2); gained += xs[i] * 2; i++; } else out.push(xs[i]); }
  while (out.length < N) out.push(0);
  return { row: out, gained };
}
function moveLeft(g) {
  let gained = 0, moved = false;
  const ng = g.map(row => { const r = moveLeftRow(row); gained += r.gained; if (r.row.some((v, i) => v !== row[i])) moved = true; return r.row; });
  return { grid: ng, gained, moved };
}
function move(g, dir) {
  if (dir === "left") return moveLeft(g);
  if (dir === "right") { const r = moveLeft(reverse(g)); return { grid: reverse(r.grid), gained: r.gained, moved: r.moved }; }
  if (dir === "up") { const r = moveLeft(transpose(g)); return { grid: transpose(r.grid), gained: r.gained, moved: r.moved }; }
  const r = moveLeft(reverse(transpose(g))); return { grid: transpose(reverse(r.grid)), gained: r.gained, moved: r.moved };
}
const DIRS = ["left", "up", "right", "down"];
function empties(g) { const e = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] === 0) e.push([r, c]); return e; }
function spawn(g) { const e = empties(g); if (!e.length) return; const [r, c] = e[(Math.random() * e.length) | 0]; g[r][c] = Math.random() < 0.9 ? 2 : 4; }
function anyMoves(g) { return DIRS.some(d => move(g, d).moved); }

const WEIGHT = [[16, 15, 14, 13], [9, 10, 11, 12], [8, 7, 6, 5], [1, 2, 3, 4]];
function evalGrid(g) { let s = 0, e = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { s += WEIGHT[r][c] * g[r][c]; if (g[r][c] === 0) e++; } return s + e * 800; }
function expectimax(g, depth, chance) {
  if (depth <= 0) return evalGrid(g);
  if (!chance) {
    let best = -Infinity;
    for (const d of DIRS) { const m = move(g, d); if (m.moved) best = Math.max(best, expectimax(m.grid, depth, true)); }
    return best === -Infinity ? evalGrid(g) : best;
  }
  const e = empties(g); if (!e.length) return evalGrid(g);
  const sample = e.length > 6 ? e.filter((_, i) => i % 2 === 0) : e;
  let s = 0;
  for (const [r, c] of sample) for (const [v, p] of [[2, 0.9], [4, 0.1]]) { const ng = clone(g); ng[r][c] = v; s += p * expectimax(ng, depth - 1, false); }
  return s / sample.length;
}
function bestMove(g) { let best = null, bs = -Infinity; for (const d of DIRS) { const m = move(g, d); if (!m.moved) continue; const sc = expectimax(m.grid, 3, true); if (sc > bs) { bs = sc; best = d; } } return best; }

const COLORS = { 0: "rgba(13,24,52,0.5)", 2: "#1e3a8a", 4: "#1d4ed8", 8: "#3b82f6", 16: "#60a5fa", 32: "#7c3aed", 64: "#a855f7", 128: "#c084fc", 256: "#d8b4fe", 512: "#fbbf24", 1024: "#f59e0b", 2048: "#f97316" };
const colorFor = (v) => COLORS[v] || "#fb7185";

function Game2048() {
  const gridRef = _useRef(empty());
  const scoreRef = _useRef(0);
  const bestRef = _useRef(0);
  const autoRef = _useRef(null);
  const [, force] = _useState(0);
  const [score, setScore] = _useState(0);
  const [best, setBest] = _useState(0);
  const [auto, setAuto] = _useState(false);
  const [hint, setHint] = _useState(null);
  const render = () => force(x => x + 1);

  function start() { const g = empty(); spawn(g); spawn(g); gridRef.current = g; scoreRef.current = 0; setScore(0); setHint(null); render(); }
  function doMove(dir) {
    if (!dir) return;
    const m = move(gridRef.current, dir); if (!m.moved) return;
    spawn(m.grid); gridRef.current = m.grid;
    scoreRef.current += m.gained; setScore(scoreRef.current);
    if (scoreRef.current > bestRef.current) { bestRef.current = scoreRef.current; setBest(bestRef.current); }
    setHint(null); render();
  }
  function stopAuto() { if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; } setAuto(false); }
  function toggleAuto() {
    if (autoRef.current) { stopAuto(); return; }
    setAuto(true);
    autoRef.current = setInterval(() => { if (!anyMoves(gridRef.current)) { stopAuto(); return; } doMove(bestMove(gridRef.current)); }, 130);
  }

  _useEffect(() => {
    start();
    const onKey = (e) => { const map = { ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down" }; if (map[e.code]) { e.preventDefault(); doMove(map[e.code]); } };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); stopAuto(); };
  }, []);

  const g = gridRef.current;
  const over = !anyMoves(g);
  const won = g.some(r => r.some(v => v >= 2048));

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div className="t-mono" style={{ color: won ? "#fbbf24" : over ? "#f87171" : "var(--blue-lt)", fontSize: 14 }}>
        {won ? "2048! keep going" : over ? "No moves left — game over." : hint ? `AI suggests: ${hint.toUpperCase()}` : "Arrow keys / buttons to play."}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 64px)`, gridTemplateRows: `repeat(${N}, 64px)`, gap: 8, padding: 10, background: "rgba(13,24,52,0.6)", border: "1px solid var(--border)", borderRadius: 10 }}>
        {g.flatMap((row, r) => row.map((v, c) => (
          <div key={`${r}-${c}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: colorFor(v), color: v >= 512 ? "#1a1003" : "#e0e7ff", fontFamily: "var(--f-display)", fontWeight: 700, fontSize: v >= 1024 ? 18 : 24 }}>
            {v || ""}
          </div>
        )))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gridTemplateRows: "repeat(2, 36px)", gap: 6 }}>
        <span /><DemoButton onClick={() => doMove("up")}>↑</DemoButton><span />
        <DemoButton onClick={() => doMove("left")}>←</DemoButton><DemoButton onClick={() => doMove("down")}>↓</DemoButton><DemoButton onClick={() => doMove("right")}>→</DemoButton>
      </div>
    </div>
  );
  const controls = (
    <ControlGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="SCORE" value={score} accent="#60a5fa" />
        <StatReadout label="BEST" value={best} accent="#fbbf24" />
      </div>
      <DemoButton onClick={() => setHint(bestMove(gridRef.current))} primary>AI: SUGGEST MOVE</DemoButton>
      <DemoButton onClick={toggleAuto} tone="violet">{auto ? "STOP AUTOPLAY" : "AI: AUTOPLAY"}</DemoButton>
      <DemoButton onClick={() => { stopAuto(); start(); }}>NEW GAME</DemoButton>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>The AI runs expectimax — it averages over the random tile spawns instead of assuming an adversary.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        2048 isn't adversarial — there's no opponent, just the <i>random</i> 2 or 4 that
        appears after each move. So the AI uses <b>expectimax</b>, minimax's cousin for
        chance: at your turn it takes the best move, but at the random tile's "turn" it
        averages over every place a 2 or 4 could land (weighted 90/10). It searches a
        few moves deep and scores each resulting board with a heuristic that rewards
        empty cells and keeping big tiles pinned to one corner.
      </DemoP>
      <DemoP>
        Hit <b>Suggest</b> for a single hint, or <b>Autoplay</b> and watch it grind —
        the corner strategy emerges on its own because the heuristic rewards it. The
        same expectimax idea shows up anywhere you're optimizing against chance rather
        than a hostile player: backgammon, slot-style games, and risk-aware planning.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        2048 is a single-agent decision problem against chance, so it calls for
        <b> expectimax</b> — minimax's variant that, instead of a hostile opponent, averages
        over random outcomes (here the 90/10 spawn of a 2 or 4). That "max over my actions,
        expectation over the world's randomness" structure is the same one behind backgammon
        engines and the Bellman expectation used throughout decision-making under
        uncertainty.
      </DemoP>
      <DemoP>
        The corner-hoarding strategy you watch the bot adopt isn't programmed in — it
        emerges from a heuristic that rewards empty cells and monotonic rows. That's a small
        lesson in <b>reward/heuristic design</b>: shape the evaluation well and sophisticated
        behavior falls out of plain search — the same principle, and the same reward-hacking
        risk, that governs reinforcement-learning agents.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · EXPECTIMAX" title="2048 + AI Assist"
      subtitle="Play with arrow keys — or hand it to an expectimax AI that searches against the random spawns."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Game2048 />);
