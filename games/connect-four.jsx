// games/connect-four.jsx — you (blue) vs a real minimax + alpha-beta engine
// (violet). Depth = difficulty. Heuristic scores 4-cell windows + center control.

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Toggle, DemoButton, StatReadout, ControlGroup,
} = window;

const ROWS = 6, COLS = 7, HUMAN = 1, AI = 2;
const emptyBoard = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
const clone = (b) => b.map(r => r.slice());
const validCols = (b) => { const v = []; for (let c = 0; c < COLS; c++) if (b[0][c] === 0) v.push(c); return v; };
function drop(b, c, p) { for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === 0) { b[r][c] = p; return r; } return -1; }

const WINDOWS = (() => {
  const w = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 3 < COLS) w.push([[r, c], [r, c + 1], [r, c + 2], [r, c + 3]]);
    if (r + 3 < ROWS) w.push([[r, c], [r + 1, c], [r + 2, c], [r + 3, c]]);
    if (r + 3 < ROWS && c + 3 < COLS) w.push([[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]]);
    if (r + 3 < ROWS && c - 3 >= 0) w.push([[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]]);
  }
  return w;
})();
function winner(b) {
  for (const win of WINDOWS) { const v = b[win[0][0]][win[0][1]]; if (v && win.every(([r, c]) => b[r][c] === v)) return v; }
  return 0;
}
function heuristic(b) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) if (b[r][3] === AI) s += 3; else if (b[r][3] === HUMAN) s -= 3;
  for (const win of WINDOWS) {
    let ai = 0, hu = 0, e = 0;
    for (const [r, c] of win) { const v = b[r][c]; if (v === AI) ai++; else if (v === HUMAN) hu++; else e++; }
    if (ai === 4) s += 1000; else if (ai === 3 && e === 1) s += 8; else if (ai === 2 && e === 2) s += 2;
    if (hu === 4) s -= 1000; else if (hu === 3 && e === 1) s -= 10; else if (hu === 2 && e === 2) s -= 2;
  }
  return s;
}
const ORDER = [3, 2, 4, 1, 5, 0, 6];
function minimax(b, depth, alpha, beta, maxing) {
  const w = winner(b);
  if (w === AI) return { score: 1e6 + depth };
  if (w === HUMAN) return { score: -1e6 - depth };
  const valid = ORDER.filter(c => b[0][c] === 0);
  if (valid.length === 0) return { score: 0 };
  if (depth === 0) return { score: heuristic(b) };
  let best = { score: maxing ? -Infinity : Infinity, col: valid[0] };
  for (const c of valid) {
    const nb = clone(b); drop(nb, c, maxing ? AI : HUMAN);
    const r = minimax(nb, depth - 1, alpha, beta, !maxing);
    if (maxing) { if (r.score > best.score) best = { score: r.score, col: c }; alpha = Math.max(alpha, r.score); }
    else { if (r.score < best.score) best = { score: r.score, col: c }; beta = Math.min(beta, r.score); }
    if (alpha >= beta) break;
  }
  return best;
}

function ConnectFourDemo() {
  const [board, setBoard] = _useState(emptyBoard());
  const [diff, setDiff] = _useState("hard");
  const [aiStarts, setAiStarts] = _useState(false);
  const [tally, setTally] = _useState({ w: 0, l: 0, d: 0 });
  const lockRef = _useRef(false);
  const depth = diff === "easy" ? 2 : diff === "hard" ? 4 : 6;
  const w = winner(board);
  const over = w !== 0 || validCols(board).length === 0;
  const status = w === HUMAN ? "You win!" : w === AI ? "AI wins." : over ? "Draw." : "Drop a disc.";

  function finish(b) { const ww = winner(b); if (ww === HUMAN) setTally(t => ({ ...t, w: t.w + 1 })); else if (ww === AI) setTally(t => ({ ...t, l: t.l + 1 })); else if (validCols(b).length === 0) setTally(t => ({ ...t, d: t.d + 1 })); }
  function aiPlay(b) {
    const col = minimax(b, depth, -Infinity, Infinity, true).col;
    if (col != null) drop(b, col, AI);
    setBoard(clone(b)); lockRef.current = false;
    if (winner(b) || validCols(b).length === 0) finish(b);
  }
  function playCol(c) {
    if (lockRef.current || over || board[0][c] !== 0) return;
    const b = clone(board); drop(b, c, HUMAN); setBoard(b);
    if (winner(b) || validCols(b).length === 0) { finish(b); return; }
    lockRef.current = true; setTimeout(() => aiPlay(b), 260);
  }
  function reset(aiFirst) { const b = emptyBoard(); lockRef.current = false; if (aiFirst) { drop(b, 3, AI); } setBoard(b); }

  const cell = (v) => v === HUMAN ? "#60a5fa" : v === AI ? "#c084fc" : "rgba(5,8,22,0.7)";
  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div className="t-mono" style={{ color: over ? (w === HUMAN ? "#34d399" : w === AI ? "#c084fc" : "var(--muted)") : "var(--blue-lt)", fontSize: 15 }}>{status}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 6, padding: 12, background: "rgba(13,24,52,0.6)", border: "1px solid var(--border)", borderRadius: 10 }}>
        {Array.from({ length: COLS }).map((_, c) => (
          <button key={c} onClick={() => playCol(c)} disabled={over || lockRef.current || board[0][c] !== 0}
            style={{ display: "flex", flexDirection: "column", gap: 6, background: "transparent", border: "none", padding: 0, cursor: (over || board[0][c] !== 0) ? "default" : "pointer" }}
            onMouseEnter={e => { if (!over && board[0][c] === 0 && !lockRef.current) e.currentTarget.style.opacity = 0.8; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = 1; }}>
            {Array.from({ length: ROWS }).map((__, r) => (
              <span key={r} style={{ width: 34, height: 34, borderRadius: 999, background: cell(board[r][c]), border: "1px solid rgba(96,165,250,0.25)", display: "block" }} />
            ))}
          </button>
        ))}
      </div>
      <DemoButton onClick={() => reset(aiStarts)} primary>NEW GAME</DemoButton>
    </div>
  );
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DIFFICULTY" value={diff} onChange={setDiff}
        options={[{ value: "easy", label: "Easy" }, { value: "hard", label: "Hard" }, { value: "expert", label: "Expert" }]} />
      <Toggle label="// AI MOVES FIRST" checked={aiStarts} onChange={v => { setAiStarts(v); reset(v); }} tone="violet" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatReadout label="YOU" value={tally.w} accent="#60a5fa" />
        <StatReadout label="DRAWS" value={tally.d} />
        <StatReadout label="AI" value={tally.l} accent="#c084fc" />
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Difficulty = search depth (Easy 2, Hard 4, Expert 6 plies). Alpha-beta prunes the rest.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The AI here plays <b>minimax with alpha-beta pruning</b>: it builds the game
        tree a few moves deep, assumes you'll always answer with your best reply, and
        picks the column that maximizes its worst-case outcome. The tree is far too big
        to search to the end (unlike tic-tac-toe), so it stops at a fixed
        <b> depth</b> and <i>estimates</i> the leftover positions with a heuristic —
        scoring every 4-in-a-row window by who's closer to completing it, plus a bonus
        for the center column.
      </DemoP>
      <DemoP>
        <b>Alpha-beta</b> is the speed trick: once a branch is proven worse than one
        already found, it's abandoned unsearched — which (with good move ordering, here
        center-out) lets the same depth run far faster. Crank the difficulty to
        <b> Expert</b> and you're facing a 6-ply look-ahead; it rarely misses a forced
        win or an open three. This is the exact family of algorithms behind classic
        chess and checkers engines.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · MINIMAX + ALPHA-BETA" title="Connect Four vs AI"
      subtitle="A real game-tree search with alpha-beta pruning. Tune the depth and try to force a win."
      stage={stage} controls={controls} explainer={explainer}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ConnectFourDemo />);
