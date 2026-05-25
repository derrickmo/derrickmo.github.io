// games/chess.jsx — full standard chess (castling, en passant, promotion,
// check/checkmate/stalemate) vs a real engine: negamax + alpha-beta with
// material + piece-square-table evaluation and capture-first move ordering.
// You play White (bottom); pawns auto-promote to a queen.

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP, SegmentedControl, DemoButton, StatReadout, ControlGroup,
} = window;

const rc = (r, c) => r * 8 + c, R = (i) => i >> 3, C = (i) => i & 7;
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const colorOf = (p) => !p ? null : (p === p.toUpperCase() ? "w" : "b");
const opp = (t) => t === "w" ? "b" : "w";
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const INIT = ("rnbqkbnr" + "pppppppp" + "........".repeat(4) + "PPPPPPPP" + "RNBQKBNR").split("").map(ch => ch === "." ? "" : ch);
const newState = () => ({ board: INIT.slice(), turn: "w", castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: null });

const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const PST = {
  P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};
const MATE = 1e6;

function isAttacked(b, r, c, by) {
  if (by === "w") { for (const dc of [-1, 1]) if (inB(r + 1, c + dc) && b[rc(r + 1, c + dc)] === "P") return true; }
  else { for (const dc of [-1, 1]) if (inB(r - 1, c + dc) && b[rc(r - 1, c + dc)] === "p") return true; }
  for (const [dr, dc] of KN) { const rr = r + dr, cc = c + dc; if (inB(rr, cc)) { const p = b[rc(rr, cc)]; if (p && p.toUpperCase() === "N" && colorOf(p) === by) return true; } }
  for (const [dr, dc] of KG) { const rr = r + dr, cc = c + dc; if (inB(rr, cc)) { const p = b[rc(rr, cc)]; if (p && p.toUpperCase() === "K" && colorOf(p) === by) return true; } }
  for (const [dr, dc] of DIAG) { let rr = r + dr, cc = c + dc; while (inB(rr, cc)) { const p = b[rc(rr, cc)]; if (p) { if (colorOf(p) === by && (p.toUpperCase() === "B" || p.toUpperCase() === "Q")) return true; break; } rr += dr; cc += dc; } }
  for (const [dr, dc] of ORTH) { let rr = r + dr, cc = c + dc; while (inB(rr, cc)) { const p = b[rc(rr, cc)]; if (p) { if (colorOf(p) === by && (p.toUpperCase() === "R" || p.toUpperCase() === "Q")) return true; break; } rr += dr; cc += dc; } }
  return false;
}
function kingSq(b, color) { const k = color === "w" ? "K" : "k"; for (let i = 0; i < 64; i++) if (b[i] === k) return i; return -1; }
function inCheck(s, color) { const k = kingSq(s.board, color); return k >= 0 && isAttacked(s.board, R(k), C(k), opp(color)); }

function genPseudo(s) {
  const b = s.board, turn = s.turn, m = [];
  const add = (from, to, flag, promo) => m.push({ from, to, flag: flag || "normal", promo });
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || colorOf(p) !== turn) continue;
    const r = R(i), c = C(i), t = p.toUpperCase();
    if (t === "P") {
      const dir = turn === "w" ? -1 : 1, start = turn === "w" ? 6 : 1, promoR = turn === "w" ? 0 : 7;
      const r1 = r + dir;
      if (inB(r1, c) && b[rc(r1, c)] === "") {
        if (r1 === promoR) add(i, rc(r1, c), "promo", "Q"); else add(i, rc(r1, c), "normal");
        if (r === start && b[rc(r + 2 * dir, c)] === "") add(i, rc(r + 2 * dir, c), "double");
      }
      for (const dc of [-1, 1]) {
        const cc = c + dc; if (!inB(r1, cc)) continue;
        const tp = b[rc(r1, cc)];
        if (tp && colorOf(tp) !== turn) { if (r1 === promoR) add(i, rc(r1, cc), "promo", "Q"); else add(i, rc(r1, cc), "normal"); }
        if (s.ep !== null && rc(r1, cc) === s.ep) add(i, s.ep, "ep");
      }
    } else if (t === "N") {
      for (const [dr, dc] of KN) { const rr = r + dr, cc = c + dc; if (!inB(rr, cc)) continue; const tp = b[rc(rr, cc)]; if (!tp || colorOf(tp) !== turn) add(i, rc(rr, cc)); }
    } else if (t === "K") {
      for (const [dr, dc] of KG) { const rr = r + dr, cc = c + dc; if (!inB(rr, cc)) continue; const tp = b[rc(rr, cc)]; if (!tp || colorOf(tp) !== turn) add(i, rc(rr, cc)); }
      const hr = turn === "w" ? 7 : 0, o = opp(turn);
      if (r === hr && c === 4 && !isAttacked(b, hr, 4, o)) {
        const kR = turn === "w" ? s.castle.wK : s.castle.bK, qR = turn === "w" ? s.castle.wQ : s.castle.bQ;
        const rook = turn === "w" ? "R" : "r";
        if (kR && b[rc(hr, 5)] === "" && b[rc(hr, 6)] === "" && b[rc(hr, 7)] === rook && !isAttacked(b, hr, 5, o) && !isAttacked(b, hr, 6, o)) add(i, rc(hr, 6), "castleK");
        if (qR && b[rc(hr, 1)] === "" && b[rc(hr, 2)] === "" && b[rc(hr, 3)] === "" && b[rc(hr, 0)] === rook && !isAttacked(b, hr, 3, o) && !isAttacked(b, hr, 2, o)) add(i, rc(hr, 2), "castleQ");
      }
    } else {
      const dirs = t === "B" ? DIAG : t === "R" ? ORTH : DIAG.concat(ORTH);
      for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (inB(rr, cc)) { const tp = b[rc(rr, cc)]; if (!tp) add(i, rc(rr, cc)); else { if (colorOf(tp) !== turn) add(i, rc(rr, cc)); break; } rr += dr; cc += dc; } }
    }
  }
  return m;
}
function apply(s, mv) {
  const b = s.board.slice(), piece = b[mv.from], color = colorOf(piece);
  const fr = R(mv.from), tr = R(mv.to), tc = C(mv.to);
  b[mv.to] = piece; b[mv.from] = "";
  let ep = null;
  if (mv.flag === "double") ep = rc((fr + tr) / 2, C(mv.from));
  if (mv.flag === "ep") b[rc(color === "w" ? tr + 1 : tr - 1, tc)] = "";
  if (mv.promo) b[mv.to] = color === "w" ? "Q" : "q";
  if (mv.flag === "castleK") { if (color === "w") { b[rc(7, 5)] = "R"; b[rc(7, 7)] = ""; } else { b[rc(0, 5)] = "r"; b[rc(0, 7)] = ""; } }
  if (mv.flag === "castleQ") { if (color === "w") { b[rc(7, 3)] = "R"; b[rc(7, 0)] = ""; } else { b[rc(0, 3)] = "r"; b[rc(0, 0)] = ""; } }
  const castle = { ...s.castle };
  if (piece === "K") { castle.wK = castle.wQ = false; } if (piece === "k") { castle.bK = castle.bQ = false; }
  const touch = (i) => { if (i === rc(7, 7)) castle.wK = false; if (i === rc(7, 0)) castle.wQ = false; if (i === rc(0, 7)) castle.bK = false; if (i === rc(0, 0)) castle.bQ = false; };
  touch(mv.from); touch(mv.to);
  return { board: b, turn: opp(s.turn), castle, ep };
}
function genMoves(s) {
  const out = [];
  for (const mv of genPseudo(s)) { const ns = apply(s, mv); const k = kingSq(ns.board, s.turn); if (k >= 0 && !isAttacked(ns.board, R(k), C(k), opp(s.turn))) out.push(mv); }
  return out;
}
function evaluate(b) {
  let s = 0;
  for (let i = 0; i < 64; i++) { const p = b[i]; if (!p) continue; const t = p.toUpperCase(); if (colorOf(p) === "w") s += VAL[t] + PST[t][i]; else s -= VAL[t] + PST[t][i ^ 56]; }
  return s;
}
function order(s, moves) { return moves.map(m => ({ m, k: s.board[m.to] ? VAL[s.board[m.to].toUpperCase()] : 0 })).sort((a, b) => b.k - a.k).map(x => x.m); }
function negamax(s, depth, alpha, beta) {
  const moves = genMoves(s);
  if (moves.length === 0) return inCheck(s, s.turn) ? -MATE - depth : 0;
  if (depth <= 0) return s.turn === "w" ? evaluate(s.board) : -evaluate(s.board);
  let best = -Infinity;
  for (const mv of order(s, moves)) { const sc = -negamax(apply(s, mv), depth - 1, -beta, -alpha); if (sc > best) best = sc; if (best > alpha) alpha = best; if (alpha >= beta) break; }
  return best;
}
function bestMove(s, depth) {
  const moves = order(s, genMoves(s)); let best = moves[0], bs = -Infinity;
  for (const mv of moves) { const sc = -negamax(apply(s, mv), depth - 1, -Infinity, Infinity); if (sc > bs) { bs = sc; best = mv; } }
  return best;
}

const GLYPH = { P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔", p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };

function ChessDemo() {
  const sRef = _useRef(newState());
  const [, force] = _useState(0);
  const [sel, setSel] = _useState(null);
  const [diff, setDiff] = _useState("medium");
  const [thinking, setThinking] = _useState(false);
  const lockRef = _useRef(false);
  const render = () => force(x => x + 1);
  const depth = diff === "easy" ? 2 : diff === "medium" ? 3 : 4;

  const s = sRef.current;
  const moves = genMoves(s);
  const over = moves.length === 0;
  const checked = inCheck(s, s.turn);
  const status = over ? (checked ? (s.turn === "w" ? "Checkmate — AI wins." : "Checkmate — you win!") : "Stalemate — draw.")
    : thinking ? "AI is thinking…" : checked ? "Check!" : (s.turn === "w" ? "Your move (White)." : "AI to move.");
  const targets = sel != null ? moves.filter(m => m.from === sel).map(m => m.to) : [];

  function aiTurn() {
    setThinking(true);
    setTimeout(() => {
      const mv = bestMove(sRef.current, depth);
      if (mv) sRef.current = apply(sRef.current, mv);
      setThinking(false); lockRef.current = false; render();
    }, 60);
  }
  function clickSquare(i) {
    if (over || lockRef.current || s.turn !== "w") return;
    if (sel != null && targets.includes(i)) {
      const mv = moves.find(m => m.from === sel && m.to === i);
      sRef.current = apply(s, mv); setSel(null); lockRef.current = true; render();
      setTimeout(aiTurn, 120);
      return;
    }
    const p = s.board[i];
    if (p && colorOf(p) === "w") setSel(i); else setSel(null);
  }
  function reset() { sRef.current = newState(); setSel(null); setThinking(false); lockRef.current = false; render(); }

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div className="t-mono" style={{ color: over ? (s.turn === "w" ? "#f87171" : "#34d399") : checked ? "#fbbf24" : "var(--blue-lt)", fontSize: 14 }}>{status}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 42px)", gridTemplateRows: "repeat(8, 42px)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
        {s.board.map((p, i) => {
          const r = R(i), c = C(i), light = (r + c) % 2 === 0;
          const isSel = sel === i, isTarget = targets.includes(i);
          let bg = light ? "rgba(96,165,250,0.16)" : "rgba(13,24,52,0.7)";
          if (isSel) bg = "rgba(251,191,36,0.35)";
          return (
            <button key={i} onClick={() => clickSquare(i)}
              style={{ width: 42, height: 42, padding: 0, border: "none", background: bg, cursor: (over || s.turn !== "w") ? "default" : "pointer", position: "relative", fontSize: 28, lineHeight: "42px", color: colorOf(p) === "w" ? "#eaf0ff" : "#c084fc", textShadow: colorOf(p) === "w" ? "0 1px 2px rgba(0,0,0,0.6)" : "none" }}>
              {p ? GLYPH[p] : ""}
              {isTarget && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}><span style={{ width: p ? 38 : 12, height: p ? 38 : 12, borderRadius: 999, border: p ? "2px solid rgba(52,211,153,0.8)" : "none", background: p ? "transparent" : "rgba(52,211,153,0.7)" }} /></span>}
            </button>
          );
        })}
      </div>
      <DemoButton onClick={reset} primary>NEW GAME</DemoButton>
    </div>
  );
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DIFFICULTY (search depth)" value={diff} onChange={setDiff}
        options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="YOU PLAY" value="White" accent="#60a5fa" />
        <StatReadout label="EVAL (centipawns)" value={(evaluate(s.board) / 100).toFixed(1)} accent="#c084fc" />
      </div>
      <DemoButton onClick={reset}>NEW GAME</DemoButton>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Click a piece, then a highlighted square. Castling, en passant, and promotion (auto-queen) all work. "Hard" (4-ply) may pause to think.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        This is a full chess engine running in your tab — legal move generation for
        every piece (including castling, en passant, and promotion), plus check,
        checkmate and stalemate detection. The opponent searches the game tree with
        <b> negamax + alpha-beta pruning</b>: it looks several plies ahead, assumes
        you'll always reply with your best move, and keeps the line that's best for it
        — pruning branches that can't beat one it already found.
      </DemoP>
      <DemoP>
        Because the tree is astronomically large, it stops at a fixed depth and
        <i> evaluates</i> the leaf positions with <b>material values plus piece-square
        tables</b> — the same eval that nudges knights toward the center and king safety
        in the opening (the EVAL readout shows it in centipawns, +ve = White better).
        Move ordering (captures first) makes the pruning bite harder. It's the classic
        Shannon-type engine — the foundation everything from early Deep Blue to modern
        alpha-beta engines is built on.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · NEGAMAX + ALPHA-BETA" title="Chess"
      subtitle="Full-rules chess against a real search engine — material + piece-square evaluation, a few plies deep."
      stage={stage} controls={controls} explainer={explainer}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ChessDemo />);
