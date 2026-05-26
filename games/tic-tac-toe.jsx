// games/tic-tac-toe.jsx — you vs a minimax player. The full game tree is tiny, so
// "Perfect" mode is genuinely unbeatable; the AI also prefers faster wins / slower
// losses. Difficulty injects random mistakes.

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Toggle, DemoButton, StatReadout, ControlGroup,
} = window;

const HUMAN = "X", AI = "O";
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winner = (b) => { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return null; };
const full = (b) => b.every(Boolean);

function minimax(b, player, depth) {
  const w = winner(b);
  if (w === AI) return { score: 10 - depth };
  if (w === HUMAN) return { score: depth - 10 };
  if (full(b)) return { score: 0 };
  let best = player === AI ? { score: -Infinity } : { score: Infinity };
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = player;
    const r = minimax(b, player === AI ? HUMAN : AI, depth + 1);
    b[i] = null;
    if (player === AI ? r.score > best.score : r.score < best.score) best = { score: r.score, move: i };
  }
  return best;
}
function aiMove(b, mistake) {
  const empties = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  if (Math.random() < mistake) return empties[(Math.random() * empties.length) | 0];
  return minimax(b.slice(), AI, 0).move;
}

function TicTacToeDemo() {
  const [board, setBoard] = _useState(Array(9).fill(null));
  const [diff, setDiff] = _useState("hard");
  const [aiStarts, setAiStarts] = _useState(false);
  const [tally, setTally] = _useState({ w: 0, l: 0, d: 0 });
  const lockRef = _useRef(false);
  const mistake = diff === "perfect" ? 0 : diff === "hard" ? 0.18 : 0.45;
  const w = winner(board);
  const over = w || full(board);
  const status = w === HUMAN ? "You win!" : w === AI ? "AI wins." : over ? "Draw." : "Your move.";

  function finish(b) {
    const ww = winner(b);
    if (ww === HUMAN) setTally(t => ({ ...t, w: t.w + 1 }));
    else if (ww === AI) setTally(t => ({ ...t, l: t.l + 1 }));
    else if (full(b)) setTally(t => ({ ...t, d: t.d + 1 }));
  }
  function play(i) {
    if (lockRef.current || board[i] || over) return;
    const b = board.slice(); b[i] = HUMAN; setBoard(b);
    if (winner(b) || full(b)) { finish(b); return; }
    lockRef.current = true;
    setTimeout(() => {
      const mv = aiMove(b, mistake);
      if (mv != null) b[mv] = AI;
      setBoard(b.slice()); lockRef.current = false;
      if (winner(b) || full(b)) finish(b);
    }, 280);
  }
  function reset(aiFirst) {
    const b = Array(9).fill(null);
    if (aiFirst) { b[aiMove(b, mistake)] = AI; }
    setBoard(b); lockRef.current = false;
  }
  function newGame() { reset(aiStarts); }

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div className="t-mono" style={{ color: over ? (w === HUMAN ? "#34d399" : w === AI ? "#f87171" : "var(--muted)") : "var(--blue-lt)", fontSize: 15, letterSpacing: "0.06em" }}>{status}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 84px)", gridTemplateRows: "repeat(3, 84px)", gap: 8 }}>
        {board.map((c, i) => (
          <button key={i} onClick={() => play(i)} disabled={!!c || over || lockRef.current}
            style={{
              fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 40,
              color: c === HUMAN ? "#60a5fa" : c === AI ? "#c084fc" : "transparent",
              background: "rgba(13,24,52,0.5)", border: "1px solid var(--border)", borderRadius: 8,
              cursor: (!c && !over && !lockRef.current) ? "pointer" : "default", transition: "border-color .15s, background .15s",
            }}
            onMouseEnter={e => { if (!c && !over) e.currentTarget.style.borderColor = "var(--blue-lt)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            {c || "·"}
          </button>
        ))}
      </div>
      <DemoButton onClick={newGame} primary>NEW GAME</DemoButton>
    </div>
  );
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DIFFICULTY" value={diff} onChange={setDiff}
        options={[{ value: "easy", label: "Easy" }, { value: "hard", label: "Hard" }, { value: "perfect", label: "Perfect" }]}
        help="How often the AI plays optimally. Perfect searches the whole game tree (unbeatable); Easy and Hard inject random mistakes that give you a chance to win." />
      <Toggle label="// AI MOVES FIRST" checked={aiStarts} onChange={v => { setAiStarts(v); reset(v); }} tone="violet"
        help="Let the AI take the opening move (the center is strongest). Moving first is a real advantage in tic-tac-toe." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatReadout label="YOU" value={tally.w} accent="#60a5fa" />
        <StatReadout label="DRAWS" value={tally.d} />
        <StatReadout label="AI" value={tally.l} accent="#c084fc" />
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>On "Perfect", the AI searches the whole game tree — you can't win, only draw.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        This opponent plays <b>minimax</b>: it imagines every possible continuation of
        the game, assuming you'll always make <i>your</i> best reply, and picks the move
        that maximizes its worst-case outcome. Tic-tac-toe's game tree is small enough
        to search completely, so on <b>Perfect</b> the AI is provably unbeatable — the
        best any human can achieve is a draw. (It also breaks ties toward faster wins
        and slower losses via a depth term, so it punishes mistakes quickly.)
      </DemoP>
      <DemoP>
        Drop the difficulty and the AI starts injecting random mistakes — now there's
        an opening to win. This is the exact algorithm (plus alpha-beta pruning to skip
        hopeless branches) behind classic game AI like chess and checkers engines; the
        only thing that changes at scale is that you can no longer search the whole
        tree, so you cut it off and <i>estimate</i> the leaves.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Minimax is the foundational algorithm of adversarial game AI — assume a perfectly
        rational opponent, then choose the move with the best worst-case outcome. Because
        tic-tac-toe's tree is tiny it can be solved exactly, which is why <b>Perfect</b> is
        provably unbeatable; the same logic, just truncated, drives chess and checkers
        engines.
      </DemoP>
      <DemoP>
        The two ideas that scale up are here in miniature. The depth-aware scoring (prefer
        faster wins, slower losses) is a tiny <i>evaluation function</i>, and the only thing
        that changes for big games is that you can't reach the leaves — so you cut the
        search off early and estimate the position. That's the whole leap from solved games
        to heuristic engines, and eventually to learned evaluations like AlphaZero's.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · MINIMAX" title="Tic-Tac-Toe"
      subtitle="Take on a minimax engine that searches the whole game tree. Crank it to Perfect and the best you can do is a draw."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<TicTacToeDemo />);
