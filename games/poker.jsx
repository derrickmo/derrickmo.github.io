// games/poker.jsx — heads-up Kuhn poker vs an AI that trained itself toward a Nash
// equilibrium with Counterfactual Regret Minimization (CFR), live in your browser on
// load. You're Player 1. The AI even bluffs with the Jack — because game theory says so.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, DemoButton, StatReadout, ControlGroup,
} = window;

const CARD = ["J", "Q", "K"];
const TERMINAL = new Set(["pp", "bp", "pbp", "pbb", "bb"]);
const isTerminal = (h) => TERMINAL.has(h);
function payoffP1(h, hc, ac) {
  const hi = hc > ac;
  if (h === "bp") return 1;          // AI folded to your bet
  if (h === "pbp") return -1;        // you folded to AI's bet
  if (h === "pp") return hi ? 1 : -1;
  return hi ? 2 : -2;                // pbb / bb showdown
}

// ── CFR training (vanilla, Kuhn poker) ──
function trainCFR(iters) {
  const nodes = {};
  const getNode = (k) => nodes[k] || (nodes[k] = { r: [0, 0], s: [0, 0] });
  const strat = (n) => { let sum = 0; const st = [0, 0]; for (let a = 0; a < 2; a++) { st[a] = n.r[a] > 0 ? n.r[a] : 0; sum += st[a]; } for (let a = 0; a < 2; a++) st[a] = sum > 0 ? st[a] / sum : 0.5; return st; };
  function cfr(cards, h, p0, p1) {
    const plays = h.length, player = plays % 2, opp = 1 - player;
    if (plays >= 2 && isTerminal(h)) {
      const last = h[plays - 1], hi = cards[player] > cards[opp];
      if (last === "p") return h === "pp" ? (hi ? 1 : -1) : 1;
      return hi ? 2 : -2; // bb / pbb
    }
    const info = cards[player] + h, n = getNode(info), st = strat(n);
    for (let a = 0; a < 2; a++) n.s[a] += (player === 0 ? p0 : p1) * st[a];
    const util = [0, 0]; let nu = 0;
    for (let a = 0; a < 2; a++) {
      const nh = h + (a === 0 ? "p" : "b");
      util[a] = player === 0 ? -cfr(cards, nh, p0 * st[a], p1) : -cfr(cards, nh, p0, p1 * st[a]);
      nu += st[a] * util[a];
    }
    for (let a = 0; a < 2; a++) n.r[a] += (player === 0 ? p1 : p0) * (util[a] - nu);
    return nu;
  }
  for (let i = 0; i < iters; i++) {
    const c = [0, 1, 2]; for (let j = c.length - 1; j > 0; j--) { const k = (Math.random() * (j + 1)) | 0;[c[j], c[k]] = [c[k], c[j]]; }
    cfr(c.slice(0, 2), "", 1, 1);
  }
  const avg = {};
  for (const k in nodes) { const n = nodes[k], s = n.s[0] + n.s[1]; avg[k] = s > 0 ? [n.s[0] / s, n.s[1] / s] : [0.5, 0.5]; }
  return avg;
}

function PokerDemo() {
  const avgRef = _useRef(null);
  const [ready, setReady] = _useState(false);
  const [hand, setHand] = _useState(null);          // {hc, ac, history, done, net}
  const [chips, setChips] = _useState(0);
  const [hands, setHands] = _useState(0);

  function newHand() {
    const c = [0, 1, 2]; for (let j = 2; j > 0; j--) { const k = (Math.random() * (j + 1)) | 0;[c[j], c[k]] = [c[k], c[j]]; }
    setHand({ hc: c[0], ac: c[1], history: "", done: false, net: 0 });
  }
  _useEffect(() => { avgRef.current = trainCFR(40000); setReady(true); newHand(); }, []);

  function aiAct(history, ac) { const st = avgRef.current[ac + history] || [0.5, 0.5]; return Math.random() < st[1] ? "b" : "p"; }
  function act(a) {
    if (!hand || hand.done) return;
    let h = hand.history + a;
    while (!isTerminal(h) && h.length % 2 === 1) h += aiAct(h, hand.ac); // AI is P2 (odd positions)
    if (isTerminal(h)) {
      const net = payoffP1(h, hand.hc, hand.ac);
      setChips(c => c + net); setHands(n => n + 1);
      setHand({ ...hand, history: h, done: true, net });
    } else setHand({ ...hand, history: h });
  }

  const sg = (k) => avgRef.current ? Math.round((avgRef.current[k] || [0, 0])[1] * 100) : 0;
  if (!ready || !hand) return (
    <DemoLayout topic="GAME · GAME THEORY" title="Heads-Up Poker" subtitle="Training a CFR strategy…" tone="blue"
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY"
      stage={<div className="t-mono" style={{ color: "var(--muted)" }}>Solving the game…</div>} controls={<div />} />
  );

  const turnHuman = !hand.done && hand.history.length % 2 === 0;
  const labels = hand.history === "" ? ["Check", "Bet"] : ["Fold", "Call"];
  const actionWord = (a, i) => a === "p" ? (i === 0 ? "checks" : "folds") : (i === 0 ? "bets" : "calls");

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: 420 }}>
      <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="t-mono-s" style={{ color: "#c084fc", marginBottom: 6 }}>AI</div>
          <div style={{ width: 60, height: 84, borderRadius: 8, border: "1px solid var(--border-violet)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 34, color: hand.done ? "#c084fc" : "var(--dim)", background: hand.done ? "rgba(168,85,247,0.10)" : "rgba(13,24,52,0.7)" }}>{hand.done ? CARD[hand.ac] : "?"}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="t-mono-s" style={{ color: "#60a5fa", marginBottom: 6 }}>YOU</div>
          <div style={{ width: 60, height: 84, borderRadius: 8, border: "1px solid var(--blue-lt)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 34, color: "#60a5fa", background: "rgba(59,130,246,0.10)" }}>{CARD[hand.hc]}</div>
        </div>
      </div>
      <div className="t-mono-s" style={{ color: "var(--muted)", minHeight: 18 }}>
        {hand.history.split("").map((a, i) => `${i % 2 === 0 ? "You" : "AI"} ${actionWord(a, hand.history.slice(0, i).length === 0 || hand.history[i - 1] !== "b" ? 0 : 1)}`).join(" · ") || "Your move."}
      </div>
      {hand.done ? (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="t-mono" style={{ fontSize: 16, color: hand.net > 0 ? "#34d399" : hand.net < 0 ? "#f87171" : "var(--muted)" }}>
            {hand.net > 0 ? `You win +${hand.net}` : hand.net < 0 ? `You lose ${hand.net}` : "Split"}
          </div>
          <DemoButton onClick={newHand} primary>NEXT HAND</DemoButton>
        </div>
      ) : turnHuman ? (
        <div style={{ display: "flex", gap: 10 }}>
          <DemoButton onClick={() => act("p")}>{labels[0]}</DemoButton>
          <DemoButton onClick={() => act("b")} primary>{labels[1]}</DemoButton>
        </div>
      ) : <div className="t-mono-s" style={{ color: "var(--dim)" }}>…</div>}
    </div>
  );
  const controls = (
    <ControlGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="YOUR CHIPS" value={(chips > 0 ? "+" : "") + chips} accent={chips >= 0 ? "#34d399" : "#f87171"} />
        <StatReadout label="HANDS" value={hands} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13,24,52,0.4)" }}>
        <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10 }}>// THE AI'S LEARNED STRATEGY</span>
        <span className="t-small" style={{ color: "var(--muted)", fontSize: 12 }}>Opens betting with K: <b style={{ color: "var(--white)" }}>{sg("2")}%</b></span>
        <span className="t-small" style={{ color: "var(--muted)", fontSize: 12 }}>Bluffs (bets the J): <b style={{ color: "var(--white)" }}>{sg("0")}%</b></span>
        <span className="t-small" style={{ color: "var(--muted)", fontSize: 12 }}>Calls a bet with Q: <b style={{ color: "var(--white)" }}>{sg("1pb") || sg("1b")}%</b></span>
      </div>
      <DemoButton onClick={newHand}>NEW HAND</DemoButton>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Trained with 40,000 CFR iterations on load. Over many hands the AI is unexploitable — you can't beat it long-run.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Kuhn poker is the smallest interesting poker — a 3-card deck (J, Q, K), one card
        each, one round of betting — small enough to <i>solve</i> exactly, yet it still
        has bluffing. This AI taught itself by <b>Counterfactual Regret Minimization
        (CFR)</b>: it plays the game against itself tens of thousands of times, and after
        each one asks "for every decision, how much do I regret <i>not</i> having played
        each other action?" It then shifts toward the actions it regretted not taking.
        Average those strategies and they provably converge to a <b>Nash equilibrium</b>.
      </DemoP>
      <DemoP>
        The result is genuinely game-theoretic behavior — notice it <b>bluffs with the
        Jack</b> a precise fraction of the time and sometimes <i>doesn't</i> bet the
        King, exactly the unexploitable mix the math prescribes. You can win individual
        hands (it's still a card game), but over many hands you can't beat it. CFR is the
        same algorithm — scaled up massively — behind the bots that solved heads-up
        limit hold'em and beat pros at no-limit.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · GAME THEORY (CFR)" title="Heads-Up Poker"
      subtitle="A poker AI that trained itself to a Nash equilibrium with counterfactual regret — bluffs and all."
      stage={stage} controls={controls} explainer={explainer}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PokerDemo />);
