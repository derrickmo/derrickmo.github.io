// games/wordle.jsx — guess the word; an AI solver races you using information
// theory: it always plays the guess that maximizes expected information (entropy),
// shrinking the candidate set as fast as possible.

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP, DemoButton, StatReadout, ControlGroup,
} = window;

const WORDS = ("about above abuse adobe agent alarm album alert alike alive allow alone angel anger angle apple apply arena argue arise array aside asset audio audit avoid award aware basic beach begin being bench birth black blade blame blank blast blend blind block board brain brand brave bread break brick brief bring broad brown brush build chain chair chaos charm chart chase cheap check chess chest chief child claim class clean clear click cliff climb clock close cloud coach coast count court cover crack craft crash cream crime cross crowd crown dance death depth doubt dozen draft drama dream dress drink drive eager early earth empty enjoy enter equal error event every exact exist extra faith false fault fiber field fight final flame flash fleet float floor focus force forth forty found frame fresh front fruit ghost giant given glass globe glory grace grade grand grant grass great green greet group guard guess guest guide heart heavy honor horse hotel house human ideal image index inner input issue joint judge knife knock known label large laser later laugh layer learn least leave legal lemon level light limit logic loose lover lower lucky lunch magic major maker march match metal meter might minor money month motor mount mouse mouth movie music never newly night noise north novel nurse ocean offer often order other ought paint panel paper party peace phase phone photo piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize proof proud prove queen quick quiet quite radio raise range rapid reach react ready realm rebel refer relax reply rider ridge right rival river robot rough round route royal rural scale scene scope score sense serve seven shall shape share sharp sheet shelf shell shift shine shirt shock shoot shore short shown sight since skill sleep slide small smart smile smoke solid solve sorry sound south space spare speak speed spell spend spent spice spine split spoke sport stage stair stand start state steam steel steep stick still stock stone stood store storm story strip study stuff style sugar suite super sweet table taste teach thank theme there thick thing think third those three throw tight tired title today touch tough tower track trade trail train treat trend trial tribe trick troop truck truly trust truth twice under union unite until upper upset urban usage usual valid value video virus visit vital vocal voice waste watch water wheel where which while white whole whose woman world worry worth would write wrong yield young youth").split(" ").filter((w, i, a) => a.indexOf(w) === i);
const WSET = new Set(WORDS);
const MAX = 6;

function score(guess, ans) {
  const res = ["b", "b", "b", "b", "b"], cnt = {};
  for (const ch of ans) cnt[ch] = (cnt[ch] || 0) + 1;
  for (let i = 0; i < 5; i++) if (guess[i] === ans[i]) { res[i] = "g"; cnt[guess[i]]--; }
  for (let i = 0; i < 5; i++) if (res[i] !== "g" && cnt[guess[i]] > 0) { res[i] = "y"; cnt[guess[i]]--; }
  return res.join("");
}
function filterCands(cands, guess, pattern) { return cands.filter(w => score(guess, w) === pattern); }
function entropy(guess, cands) {
  const groups = {}; for (const w of cands) { const p = score(guess, w); groups[p] = (groups[p] || 0) + 1; }
  let h = 0; const n = cands.length; for (const k in groups) { const p = groups[k] / n; h -= p * Math.log2(p); } return h;
}
function bestGuess(cands) {
  if (cands.length <= 2) return cands[0];
  let best = cands[0], bh = -1;
  for (const g of WORDS) { const h = entropy(g, cands); if (h > bh) { bh = h; best = g; } }
  return best;
}
function aiSolveCount(answer) {
  let cands = WORDS.slice(), guesses = 0, guess = "raise";
  for (let i = 0; i < 8; i++) { guesses++; if (guess === answer) return guesses; const pat = score(guess, answer); cands = filterCands(cands, guess, pat); guess = bestGuess(cands); }
  return guesses;
}

function WordleDemo() {
  const ansRef = _useRef("");
  const candRef = _useRef(WORDS.slice());
  const [rows, setRows] = _useState([]);       // {word, pattern}
  const [input, setInput] = _useState("");
  const [done, setDone] = _useState(false);
  const [aiTarget, setAiTarget] = _useState(0);
  const [msg, setMsg] = _useState("");

  function start() {
    const a = WORDS[(Math.random() * WORDS.length) | 0];
    ansRef.current = a; candRef.current = WORDS.slice();
    setRows([]); setInput(""); setDone(false); setMsg(""); setAiTarget(aiSolveCount(a));
  }
  if (!ansRef.current) start();

  function submit(word) {
    if (done) return;
    const g = (word || input).toLowerCase();
    if (g.length !== 5) { setMsg("5 letters."); return; }
    if (!WSET.has(g)) { setMsg("Not in word list."); return; }
    const pat = score(g, ansRef.current);
    const nrows = [...rows, { word: g, pattern: pat }];
    candRef.current = filterCands(candRef.current, g, pat);
    setRows(nrows); setInput(""); setMsg("");
    if (g === ansRef.current) { setDone(true); setMsg(`Solved in ${nrows.length}! (AI: ${aiTarget})`); }
    else if (nrows.length >= MAX) { setDone(true); setMsg(`Out of guesses — it was ${ansRef.current.toUpperCase()}.`); }
  }

  const COL = { g: "#34d399", y: "#fbbf24", b: "rgba(13,24,52,0.7)" };
  const aiNext = !done ? bestGuess(candRef.current) : null;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Array.from({ length: MAX }).map((_, r) => {
          const row = rows[r];
          return (
            <div key={r} style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: 5 }).map((__, c) => (
                <div key={c} style={{
                  width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 5, border: "1px solid var(--border)",
                  background: row ? COL[row.pattern[c]] : "rgba(5,8,22,0.5)",
                  color: row && row.pattern[c] === "b" ? "#94a3b8" : "#06210f",
                  fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22, textTransform: "uppercase",
                }}>{row ? row.word[c] : ""}</div>
              ))}
            </div>
          );
        })}
      </div>
      {!done ? (
        <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 5))} maxLength={5} placeholder="type a word" autoFocus
            className="t-mono" style={{ width: 160, padding: "10px 12px", background: "rgba(5,8,22,0.6)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--white)", textTransform: "uppercase", letterSpacing: "0.2em", outline: "none" }} />
          <DemoButton onClick={() => submit()} primary>GUESS</DemoButton>
        </form>
      ) : <DemoButton onClick={start} primary>NEW WORD</DemoButton>}
      <div className="t-mono-s" style={{ color: done ? "#34d399" : "var(--muted)", fontSize: 12, minHeight: 16 }}>{msg}</div>
    </div>
  );
  const controls = (
    <ControlGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CANDIDATES LEFT" value={candRef.current.length} accent="#60a5fa" />
        <StatReadout label="AI SOLVES IN" value={aiTarget} accent="#c084fc" />
      </div>
      {!done && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <StatReadout label="AI'S BEST NEXT GUESS" value={(aiNext || "").toUpperCase()} accent="#fbbf24" />
          <DemoButton onClick={() => submit(aiNext)} tone="violet">PLAY THE AI'S GUESS</DemoButton>
        </div>
      )}
      <DemoButton onClick={start}>NEW WORD</DemoButton>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>"AI solves in" simulates the entropy solver from scratch on this word. Try to match or beat it.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Good Wordle isn't about knowing fancy words — it's about <b>information</b>.
        Every guess splits the remaining possible answers into buckets (one per
        colour pattern). The best guess is the one whose buckets are most even, because
        that's the guess that, on average, eliminates the most candidates no matter what
        the answer turns out to be. That "expected information" is literally
        <b> entropy</b>, measured in bits — the AI here just picks the highest-entropy
        guess every turn.
      </DemoP>
      <DemoP>
        Watch the <span style={{ color: "#60a5fa" }}>candidates-left</span> count
        collapse — a strong opener can cut thousands of options to a handful in one
        move. "AI solves in" runs that greedy strategy to completion on the hidden word
        so you've got a target to beat. It's the same information-gain principle behind
        decision-tree splits and active learning — just wearing a game.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Wordle is a clean demonstration of <b>information theory</b> in action: the best
        guess maximizes expected <i>entropy</i> — it splits the remaining answers into the
        most even buckets, eliminating the most candidates on average no matter the hidden
        word. Measuring "how much will this tell me?" in bits is the same idea behind data
        compression, coding, and the cross-entropy loss every classifier minimizes.
      </DemoP>
      <DemoP>
        The very same expected-information-gain criterion chooses splits in <b>decision
        trees</b> and picks the most informative examples to label in <b>active learning</b>.
        It reframes good decision-making as a search for information rather than for an
        immediate answer — the instinct behind well-designed experiments and the exploration
        bonuses used in reinforcement learning.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GAME · INFORMATION THEORY" title="Wordle Solver Duel"
      subtitle="Race an entropy-maximizing solver. The best guess is the one that learns the most, not the one that looks smartest."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<WordleDemo />);
