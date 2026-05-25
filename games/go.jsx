// games/go.jsx — 7x7 Go vs a Monte-Carlo search AI. Real rules (liberties/captures,
// suicide illegal, simple ko, two-pass end, area scoring + komi). The AI evaluates
// moves with UCB-allocated random rollouts to the end and plays the best.

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const N = 7, KOMI = 4.5, BUDGET = 350, CAP = 110;     // human = Black (1), AI = White (2)
const NB = (() => { const a = []; for (let i = 0; i < N * N; i++) { const r = (i / N) | 0, c = i % N, n = []; if (r > 0) n.push(i - N); if (r < N - 1) n.push(i + N); if (c > 0) n.push(i - 1); if (c < N - 1) n.push(i + 1); a.push(n); } return a; })();
const keyOf = (b) => b.join("");

function groupOf(b, i) {
  const color = b[i], stones = [], seen = new Set([i]), libs = new Set(), st = [i];
  while (st.length) { const c = st.pop(); stones.push(c); for (const n of NB[c]) { if (b[n] === 0) libs.add(n); else if (b[n] === color && !seen.has(n)) { seen.add(n); st.push(n); } } }
  return { stones, libs: libs.size };
}
function play(b, i, color) {
  if (b[i] !== 0) return null;
  const nb = b.slice(); nb[i] = color; const opp = 3 - color;
  for (const j of NB[i]) if (nb[j] === opp) { const g = groupOf(nb, j); if (g.libs === 0) for (const s of g.stones) nb[s] = 0; }
  if (groupOf(nb, i).libs === 0) return null; // suicide
  return nb;
}
const isEye = (b, i, color) => b[i] === 0 && NB[i].every(n => b[n] === color);
function randMove(b, color) {
  const e = []; for (let i = 0; i < N * N; i++) if (b[i] === 0 && !isEye(b, i, color)) e.push(i);
  while (e.length) { const k = (Math.random() * e.length) | 0, i = e[k]; const nb = play(b, i, color); if (nb) return nb; e.splice(k, 1); }
  return null;
}
function playout(b, color) {
  let board = b, t = color, passes = 0, m = 0;
  while (passes < 2 && m < CAP) { const nb = randMove(board, t); if (nb) { board = nb; passes = 0; } else passes++; t = 3 - t; m++; }
  return score(board);
}
function score(b) {
  let black = 0, white = 0; const seen = new Set();
  for (let i = 0; i < N * N; i++) { if (b[i] === 1) black++; else if (b[i] === 2) white++; }
  for (let i = 0; i < N * N; i++) {
    if (b[i] !== 0 || seen.has(i)) continue;
    const region = [], borders = new Set(), st = [i]; seen.add(i);
    while (st.length) { const c = st.pop(); region.push(c); for (const n of NB[c]) { if (b[n] === 0) { if (!seen.has(n)) { seen.add(n); st.push(n); } } else borders.add(b[n]); } }
    if (borders.size === 1) { if (borders.has(1)) black += region.length; else white += region.length; }
  }
  return { black, white };
}
function aiSearch(b, ko) {
  const cands = [];
  for (let i = 0; i < N * N; i++) { if (b[i] !== 0 || isEye(b, i, 2)) continue; const nb = play(b, i, 2); if (nb && keyOf(nb) !== ko) cands.push({ i, board: nb, n: 0, w: 0 }); }
  cands.push({ i: "pass", board: b, n: 0, w: 0 });
  for (let total = 0; total < BUDGET; total++) {
    let best = null, bv = -1;
    for (const c of cands) { const v = c.n === 0 ? 1e6 + Math.random() : (c.w / c.n) + 1.4 * Math.sqrt(Math.log(total + 1) / c.n); if (v > bv) { bv = v; best = c; } }
    const sc = playout(best.board, 1);
    best.w += (sc.white + KOMI > sc.black) ? 1 : 0; best.n++;
  }
  let pick = cands[0]; for (const c of cands) if (c.n > pick.n) pick = c;
  return pick;
}

function GoDemo() {
  const boardRef = _useRef(new Array(N * N).fill(0));
  const koRef = _useRef(null), passRef = _useRef(0), overRef = _useRef(false), resRef = _useRef("");
  const lockRef = _useRef(false);
  const [, force] = _useState(0); const [thinking, setThinking] = _useState(false);
  const render = () => force(x => x + 1);

  function endGame() { overRef.current = true; const s = score(boardRef.current); const w = s.white + KOMI; resRef.current = w > s.black ? `AI wins ${w} – ${s.black}` : `You win ${s.black} – ${w}`; }
  function aiTurn() {
    const pick = aiSearch(boardRef.current, koRef.current);
    if (pick.i === "pass") { passRef.current++; koRef.current = null; if (passRef.current >= 2) endGame(); }
    else { koRef.current = keyOf(boardRef.current); boardRef.current = pick.board; passRef.current = 0; }
    lockRef.current = false; setThinking(false); render();
  }
  function humanPlay(i) {
    if (overRef.current || lockRef.current || boardRef.current[i] !== 0) return;
    const nb = play(boardRef.current, i, 1); if (!nb) return;
    if (koRef.current && keyOf(nb) === koRef.current) return;
    koRef.current = keyOf(boardRef.current); boardRef.current = nb; passRef.current = 0; render();
    lockRef.current = true; setThinking(true); setTimeout(aiTurn, 50);
  }
  function humanPass() {
    if (overRef.current || lockRef.current) return;
    passRef.current++; koRef.current = null;
    if (passRef.current >= 2) { endGame(); render(); return; }
    render(); lockRef.current = true; setThinking(true); setTimeout(aiTurn, 50);
  }
  function reset() { boardRef.current = new Array(N * N).fill(0); koRef.current = null; passRef.current = 0; overRef.current = false; resRef.current = ""; lockRef.current = false; setThinking(false); render(); }

  const b = boardRef.current, s = score(b);
  const status = overRef.current ? resRef.current : thinking ? "AI is thinking…" : "Your move (you are Blue).";

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div className="t-mono" style={{ color: overRef.current ? "#fbbf24" : "var(--blue-lt)", fontSize: 14 }}>{status}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 40px)`, gridTemplateRows: `repeat(${N}, 40px)`, background: "rgba(120,90,40,0.10)", border: "1px solid var(--border)", borderRadius: 6, padding: 6 }}>
        {b.map((v, i) => (
          <button key={i} onClick={() => humanPlay(i)} disabled={overRef.current || lockRef.current || v !== 0}
            style={{ width: 40, height: 40, padding: 0, background: "transparent", border: "1px solid rgba(96,165,250,0.18)", cursor: (overRef.current || v !== 0) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {v !== 0 && <span style={{ width: 28, height: 28, borderRadius: 999, background: v === 1 ? "#60a5fa" : "#c084fc", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={humanPass}>PASS</DemoButton>
        <DemoButton onClick={reset} primary>NEW GAME</DemoButton>
      </div>
    </div>
  );
  const controls = (
    <ControlGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="YOUR AREA" value={s.black} accent="#60a5fa" />
        <StatReadout label="AI AREA + KOMI" value={(s.white + KOMI)} accent="#c084fc" />
      </div>
      <Legend items={[{ color: "#60a5fa", label: "YOU (BLACK)" }, { color: "#c084fc", label: "AI (WHITE)" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>7x7, komi {KOMI}. Captures, ko, and suicide rules apply. Two passes end the game (area scoring). The AI runs {BUDGET} random rollouts per move.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Go's rules are tiny but its search space dwarfs chess — far too big for the
        alpha-beta approach, and there's no simple "material count" to evaluate a
        position. The breakthrough was <b>Monte-Carlo search</b>: instead of evaluating
        a position with a formula, you <i>play it out at random to the end</i> many
        times and see who tends to win. This AI does exactly that — for each candidate
        move it runs hundreds of random rollouts, using <b>UCB</b> to spend more
        rollouts on the moves that look promising, then plays the one with the best
        record.
      </DemoP>
      <DemoP>
        It plays real Go: stones with no liberties are captured, suicide and ko are
        illegal, and the game ends on two passes with area scoring (plus komi for
        White). It's only a mini board with light rollouts, so it's a casual opponent —
        but it's the same Monte-Carlo Tree Search idea that, married to deep neural
        networks, became AlphaGo and finally cracked the game humans thought computers
        couldn't.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · MONTE-CARLO SEARCH" title="Go 7x7"
      subtitle="Real Go on a small board against a Monte-Carlo rollout AI — the idea that, scaled up, became AlphaGo."
      stage={stage} controls={controls} explainer={explainer}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GoDemo />);
