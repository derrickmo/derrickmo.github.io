// games/rps.jsx — rock-paper-scissors against an AI that learns your patterns.
// It predicts your next throw from your history (order-2 Markov, backing off to
// order-1, then frequency) and plays the counter. Beat it by staying unpredictable.

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP,
  DemoButton, StatReadout, ControlGroup,
} = window;

const NAMES = ["Rock", "Paper", "Scissors"], EMO = ["✊", "✋", "✌"];
// result for player move p vs ai move a: 1 win, 0 tie, -1 loss
const result = (p, a) => p === a ? 0 : ((p - a + 3) % 3 === 1 ? 1 : -1);
const counter = (m) => (m + 1) % 3; // the move that beats m

function RPSDemo() {
  const histRef = _useRef([]);            // player's past moves
  const t1 = _useRef(Array.from({ length: 3 }, () => [0, 0, 0]));        // order-1 counts
  const t2 = _useRef(Array.from({ length: 9 }, () => [0, 0, 0]));        // order-2 counts
  const [last, setLast] = _useState(null); // {p, a, r, predicted}
  const [score, setScore] = _useState({ w: 0, l: 0, t: 0 });
  const [log, setLog] = _useState([]);     // recent results (1/0/-1)

  function predict() {
    const h = histRef.current, n = h.length;
    if (n >= 2) { const key = h[n - 2] * 3 + h[n - 1]; const row = t2.current[key]; const s = row[0] + row[1] + row[2]; if (s >= 2) return row.indexOf(Math.max(...row)); }
    if (n >= 1) { const row = t1.current[h[n - 1]]; const s = row[0] + row[1] + row[2]; if (s >= 2) return row.indexOf(Math.max(...row)); }
    return (Math.random() * 3) | 0;
  }

  function throwMove(p) {
    const predicted = predict();
    const a = counter(predicted);          // AI plays to beat its prediction of you
    const r = result(p, a);
    // learn AFTER committing the AI move
    const h = histRef.current, n = h.length;
    if (n >= 1) t1.current[h[n - 1]][p] += 1;
    if (n >= 2) t2.current[h[n - 2] * 3 + h[n - 1]][p] += 1;
    h.push(p);
    setLast({ p, a, r, predicted });
    setScore(s => ({ w: s.w + (r > 0 ? 1 : 0), l: s.l + (r < 0 ? 1 : 0), t: s.t + (r === 0 ? 1 : 0) }));
    setLog(l => [r, ...l].slice(0, 16));
  }
  function reset() {
    histRef.current = []; t1.current = Array.from({ length: 3 }, () => [0, 0, 0]); t2.current = Array.from({ length: 9 }, () => [0, 0, 0]);
    setLast(null); setScore({ w: 0, l: 0, t: 0 }); setLog([]);
  }

  const total = score.w + score.l + score.t;
  const winRate = total ? Math.round((score.w / total) * 100) : 0;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", maxWidth: 460 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, minHeight: 96 }}>
        {last ? (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, lineHeight: 1 }}>{EMO[last.p]}</div>
              <div className="t-mono-s" style={{ color: "#60a5fa", marginTop: 6 }}>YOU</div>
            </div>
            <div className="t-mono" style={{ fontSize: 16, color: last.r > 0 ? "#34d399" : last.r < 0 ? "#f87171" : "var(--muted)" }}>
              {last.r > 0 ? "WIN" : last.r < 0 ? "LOSE" : "TIE"}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, lineHeight: 1 }}>{EMO[last.a]}</div>
              <div className="t-mono-s" style={{ color: "#c084fc", marginTop: 6 }}>AI</div>
            </div>
          </>
        ) : (
          <div className="t-body" style={{ color: "var(--muted)" }}>Make your throw — the AI is watching.</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {EMO.map((e, i) => (
          <button key={i} onClick={() => throwMove(i)} title={NAMES[i]}
            style={{ width: 84, height: 84, fontSize: 38, borderRadius: 12, cursor: "pointer", background: "rgba(13,24,52,0.5)", border: "1px solid var(--border)", transition: "transform .12s, border-color .15s" }}
            onMouseEnter={e2 => { e2.currentTarget.style.borderColor = "var(--violet-lt)"; e2.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e2 => { e2.currentTarget.style.borderColor = "var(--border)"; e2.currentTarget.style.transform = "translateY(0)"; }}>
            {e}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, height: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {log.map((r, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 999, background: r > 0 ? "#34d399" : r < 0 ? "#f87171" : "var(--dim)" }} />)}
      </div>
    </div>
  );
  const controls = (
    <ControlGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatReadout label="YOU" value={score.w} accent="#34d399" />
        <StatReadout label="TIES" value={score.t} />
        <StatReadout label="AI" value={score.l} accent="#f87171" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ROUNDS" value={total} />
        <StatReadout label="YOUR WIN %" value={winRate + "%"} accent="#60a5fa" />
      </div>
      <DemoButton onClick={reset} primary>RESET</DemoButton>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Against random play you'd win ~33%. If the AI is beating that, it has found a pattern in your throws.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Rock-paper-scissors is only "random" if <i>you</i> are. This AI keeps a running
        tally of what you tend to throw after each recent sequence — an <b>order-2
        Markov model</b> (what follows each pair of moves), backing off to order-1 and
        then plain frequency when it hasn't seen enough. It predicts your next throw and
        plays the move that beats it. Try to win by going on streaks, or by "obviously"
        switching — and watch it catch on.
      </DemoP>
      <DemoP>
        Pure randomness guarantees you a 1/3 win rate that no model can beat; the moment
        you fall into a habit, the AI's win rate climbs above chance. That's the whole
        idea behind sequence models — the same machinery that powers next-token
        prediction in a language model, just with three "tokens" instead of fifty
        thousand. Humans are famously bad at being random, which is exactly the edge it
        exploits.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is a sequence model in disguise — an order-2 <b>Markov model</b> predicting
        your next move from your recent pattern, backing off to lower orders when data is
        thin. It's the same predict-the-next-token machinery as a language model, just with
        three tokens instead of fifty thousand, and the same back-off smoothing that
        classical n-gram NLP relied on.
      </DemoP>
      <DemoP>
        It also illustrates a sharp game-theory truth: the Nash-optimal RPS strategy is
        uniformly random, which guarantees a 1/3 win rate that <i>no</i> predictor can beat.
        The AI only profits because humans are notoriously bad at being random — the moment
        you fall into a habit, a model exploits it. That gap between optimal randomness and
        human predictability is exactly what side-channel attacks and adversarial models
        prey on.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · SEQUENCE MODEL" title="Rock-Paper-Scissors Mind-Reader"
      subtitle="An AI that learns your habits and predicts your next move. Stay unpredictable — it's harder than it sounds."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RPSDemo />);
