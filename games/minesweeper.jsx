// games/minesweeper.jsx — play Minesweeper with an AI oracle that reads the
// revealed numbers as constraints, marks the cells it can prove safe or mined, and
// estimates a mine probability for the rest (so it can pick the least-bad guess).

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const R = 9, C = 9, MINES = 10;
const key = (r, c) => r * C + c;
const inb = (r, c) => r >= 0 && r < R && c >= 0 && c < C;
function neighbors(r, c) { const o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && inb(r + dr, c + dc)) o.push([r + dr, c + dc]); return o; }

function freshBoard() { return Array.from({ length: R * C }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 })); }
function placeMines(b, sr, sc) {
  const banned = new Set([key(sr, sc), ...neighbors(sr, sc).map(([r, c]) => key(r, c))]);
  let placed = 0;
  while (placed < MINES) { const i = (Math.random() * R * C) | 0; if (b[i].mine || banned.has(i)) continue; b[i].mine = true; placed++; }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) b[key(r, c)].adj = neighbors(r, c).filter(([nr, nc]) => b[key(nr, nc)].mine).length;
}

// AI: deterministic safe/mine + probability estimate for the rest
function analyze(b) {
  const hidden = []; for (let i = 0; i < R * C; i++) if (!b[i].revealed && !b[i].flagged) hidden.push(i);
  const flaggedCount = b.filter(c => c.flagged).length;
  const globalP = hidden.length ? Math.max(0, (MINES - flaggedCount)) / hidden.length : 0;
  const prob = {}; hidden.forEach(i => prob[i] = globalP);
  const safe = new Set(), mine = new Set();
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const cell = b[key(r, c)]; if (!cell.revealed || cell.adj === 0) continue;
    const nb = neighbors(r, c);
    const flaggedN = nb.filter(([nr, nc]) => b[key(nr, nc)].flagged).length;
    const U = nb.filter(([nr, nc]) => !b[key(nr, nc)].revealed && !b[key(nr, nc)].flagged).map(([nr, nc]) => key(nr, nc));
    if (!U.length) continue;
    const need = cell.adj - flaggedN;
    if (need <= 0) U.forEach(i => { safe.add(i); prob[i] = 0; });
    else if (need >= U.length) U.forEach(i => { mine.add(i); prob[i] = 1; });
    else U.forEach(i => { if (!safe.has(i)) prob[i] = Math.max(prob[i], need / U.length); });
  }
  safe.forEach(i => prob[i] = 0); // safe overrides
  mine.forEach(i => { if (!safe.has(i)) prob[i] = 1; });
  return { prob, safe, mine, hidden };
}

function MinesweeperDemo() {
  const boardRef = _useRef(freshBoard());
  const placedRef = _useRef(false);
  const [, force] = _useState(0);
  const [over, setOver] = _useState(false);
  const [won, setWon] = _useState(false);
  const [flagMode, setFlagMode] = _useState(false);
  const [showProb, setShowProb] = _useState(false);
  const render = () => force(x => x + 1);

  function start() { boardRef.current = freshBoard(); placedRef.current = false; setOver(false); setWon(false); render(); }
  function revealFlood(r, c) {
    const b = boardRef.current, stack = [[r, c]];
    while (stack.length) { const [cr, cc] = stack.pop(); const cell = b[key(cr, cc)]; if (cell.revealed || cell.flagged) continue; cell.revealed = true; if (cell.adj === 0) neighbors(cr, cc).forEach(([nr, nc]) => { if (!b[key(nr, nc)].revealed) stack.push([nr, nc]); }); }
  }
  function checkWin() { const b = boardRef.current; if (b.every(c => c.mine || c.revealed)) { setWon(true); setOver(true); } }
  function reveal(r, c) {
    if (over) return; const b = boardRef.current, cell = b[key(r, c)];
    if (cell.flagged || cell.revealed) return;
    if (!placedRef.current) { placeMines(b, r, c); placedRef.current = true; }
    if (cell.mine) { b.forEach(x => { if (x.mine) x.revealed = true; }); setOver(true); render(); return; }
    revealFlood(r, c); render(); checkWin();
  }
  function toggleFlag(r, c) { if (over) return; const cell = boardRef.current[key(r, c)]; if (cell.revealed) return; cell.flagged = !cell.flagged; render(); }
  function onCell(r, c) { if (flagMode) toggleFlag(r, c); else reveal(r, c); }
  function aiHint() {
    if (over || !placedRef.current) { if (!placedRef.current) reveal((R / 2) | 0, (C / 2) | 0); return; }
    const { prob, safe } = analyze(boardRef.current);
    let target = null;
    if (safe.size) target = safe.values().next().value;
    else { let bp = Infinity; for (const k in prob) if (prob[k] < bp) { bp = prob[k]; target = +k; } }
    if (target != null) reveal((target / C) | 0, target % C);
  }
  function aiFlag() {
    if (over) return; const { mine } = analyze(boardRef.current); let n = 0;
    mine.forEach(i => { const cell = boardRef.current[i]; if (!cell.flagged) { cell.flagged = true; n++; } }); render();
  }

  const b = boardRef.current;
  const analysis = (showProb && placedRef.current && !over) ? analyze(b) : null;
  const flags = b.filter(c => c.flagged).length;
  const NUMCOL = ["", "#60a5fa", "#34d399", "#fbbf24", "#fb7185", "#c084fc", "#22d3ee", "#e0e7ff", "#94a3b8"];

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div className="t-mono" style={{ color: won ? "#34d399" : over ? "#f87171" : "var(--blue-lt)", fontSize: 14 }}>
        {won ? "Cleared! Every safe cell found." : over ? "Boom. Try again." : `Mines: ${MINES}  ·  Flags: ${flags}`}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${C}, 30px)`, gridTemplateRows: `repeat(${R}, 30px)`, gap: 2, padding: 8, background: "rgba(13,24,52,0.6)", border: "1px solid var(--border)", borderRadius: 8 }}
        onContextMenu={e => e.preventDefault()}>
        {b.map((cell, i) => {
          const r = (i / C) | 0, c = i % C;
          const p = analysis ? analysis.prob[i] : undefined;
          let bg = cell.revealed ? "rgba(5,8,22,0.5)" : "rgba(96,165,250,0.14)";
          if (!cell.revealed && analysis && p !== undefined) bg = p === 0 ? "rgba(52,211,153,0.30)" : p === 1 ? "rgba(248,113,113,0.35)" : `rgba(251,191,36,${0.08 + 0.4 * p})`;
          return (
            <button key={i} onClick={() => onCell(r, c)} onContextMenu={e => { e.preventDefault(); toggleFlag(r, c); }}
              style={{ width: 30, height: 30, padding: 0, borderRadius: 3, border: "1px solid rgba(96,165,250,0.18)", background: bg, cursor: over ? "default" : "pointer", fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: 13, color: cell.revealed ? NUMCOL[cell.adj] : "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {cell.revealed ? (cell.mine ? "✷" : (cell.adj || "")) : (cell.flagged ? "⚑" : (analysis && p !== undefined && p !== 0 && p !== 1 ? Math.round(p * 100) : ""))}
            </button>
          );
        })}
      </div>
      <DemoButton onClick={start} primary>NEW GAME</DemoButton>
    </div>
  );
  const controls = (
    <ControlGroup>
      <Toggle label="// FLAG MODE (tap to flag)" checked={flagMode} onChange={setFlagMode} tone="violet" />
      <Toggle label="// SHOW AI PROBABILITIES" checked={showProb} onChange={setShowProb} />
      <DemoButton onClick={aiHint} primary>AI: SAFEST MOVE</DemoButton>
      <DemoButton onClick={aiFlag} tone="violet">AI: FLAG CERTAIN MINES</DemoButton>
      <Legend items={[{ color: "rgba(52,211,153,0.6)", label: "PROVABLY SAFE" }, { color: "rgba(248,113,113,0.6)", label: "PROVABLY MINE" }, { color: "rgba(251,191,36,0.6)", label: "RISKY (%)" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Right-click (or Flag mode) to flag. Turn on probabilities to see the AI's read.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Every revealed number is a <b>constraint</b>: "exactly this many of my hidden
        neighbours are mines." The AI reads them all at once. Two rules are pure logic
        and need no guessing — if a number already touches enough flags, its other
        neighbours are <span style={{ color: "#34d399" }}>provably safe</span>; if its
        remaining unknowns exactly equal the mines it still needs, they're
        <span style={{ color: "#f87171" }}> provably mines</span>. Turn on
        <b> probabilities</b> and hit <b>AI: safest move</b> to watch it work.
      </DemoP>
      <DemoP>
        When logic runs out, you're forced to <i>guess</i> — and that's where the
        estimated <span style={{ color: "#fbbf24" }}>mine probability</span> per cell
        comes in: the AI plays the least-likely-to-explode square. This constraint-plus-
        probability reasoning is exactly how Minesweeper "solvers" work, and it's a tiny
        version of the constraint satisfaction and Bayesian inference used all over AI.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · CONSTRAINT + PROBABILITY" title="Minesweeper Oracle"
      subtitle="An AI that proves which cells are safe, flags the certain mines, and plays the odds on the rest."
      stage={stage} controls={controls} explainer={explainer}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MinesweeperDemo />);
