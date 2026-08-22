// demos/markov.jsx — n-gram Markov text generator (char or word level).
// Builds the model in-browser from a corpus; sample with order + temperature.

const { useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, ControlGroup, TextField,
} = window;

const DEFAULT_CORPUS = `The best way to learn machine learning is to build every algorithm from scratch. Read the math, implement it in NumPy, then graduate to a framework. A model is just a function with parameters you tune by following the gradient downhill. Attention lets a transformer look at every token in a sequence at once. Reinforcement learning is learning from delayed reward, one episode at a time. Diffusion models learn to turn noise back into structure. The more you build, the more the black boxes disappear. Curiosity compounds: every concept you truly understand makes the next one easier.`;

function tokenize(text, mode) {
  if (mode === "word") return text.split(/\s+/).filter(Boolean);
  return Array.from(text);
}
function joiner(mode) { return mode === "word" ? " " : ""; }

function buildModel(tokens, order, mode) {
  const j = joiner(mode), m = new Map();
  for (let i = 0; i + order < tokens.length; i++) {
    const ctx = tokens.slice(i, i + order).join(j);
    const nxt = tokens[i + order];
    if (!m.has(ctx)) m.set(ctx, new Map());
    const fm = m.get(ctx); fm.set(nxt, (fm.get(nxt) || 0) + 1);
  }
  return m;
}
function sample(fm, T) {
  const entries = [...fm.entries()];
  const w = entries.map(([, c]) => Math.pow(c, 1 / Math.max(0.05, T)));
  const sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < entries.length; i++) { r -= w[i]; if (r <= 0) return entries[i][0]; }
  return entries[entries.length - 1][0];
}

function MarkovDemo() {
  const [corpus, setCorpus] = _useState(DEFAULT_CORPUS);
  const [mode, setMode] = _useState("char");
  const [order, setOrder] = _useState(3);
  const [temp, setTemp] = _useState(0.8);
  const [len, setLen] = _useState(180);
  const [out, setOut] = _useState("");
  const [info, setInfo] = _useState({ states: 0, tokens: 0 });

  function generate() {
    const tokens = tokenize(corpus, mode);
    const ord = mode === "word" ? Math.min(order, 3) : order;
    if (tokens.length <= ord + 1) { setOut("(give it a bit more text to learn from)"); return; }
    const model = buildModel(tokens, ord, mode);
    const j = joiner(mode);
    const keys = [...model.keys()];
    let ctx = tokens.slice(0, ord);
    const res = [...ctx];
    for (let i = 0; i < len; i++) {
      let fm = model.get(ctx.join(j));
      if (!fm) { const rk = keys[Math.floor(Math.random() * keys.length)]; ctx = mode === "word" ? rk.split(" ") : Array.from(rk); fm = model.get(rk); }
      const nxt = sample(fm, temp);
      res.push(nxt);
      ctx = res.slice(res.length - ord);
    }
    setOut(res.join(j));
    setInfo({ states: model.size, tokens: tokens.length });
  }

  _useEffect(() => { generate(); }, []); // generate once on mount

  const stage = (
    <div style={{ width: "100%", maxWidth: 620, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>// GENERATED</span>
        <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10 }}>order {mode === "word" ? Math.min(order, 3) : order} · {mode}</span>
      </div>
      <div className="t-body" style={{
        minHeight: 280, padding: "20px 22px", border: "1px solid var(--border)", borderRadius: 8,
        background: "rgba(5,8,22,0.6)", color: "var(--white)", opacity: 0.92, fontSize: 16, lineHeight: 1.7, whiteSpace: "pre-wrap",
      }}>{out}<span style={{ color: "var(--blue-lt)" }}>▍</span></div>
    </div>
  );
  const controls = (
    <ControlGroup>
      <TextField label="// CORPUS (learn from this)" value={corpus} onChange={setCorpus} rows={5} tone="violet" />
      <SegmentedControl label="// LEVEL" value={mode} onChange={setMode}
        options={[{ value: "char", label: "Character" }, { value: "word", label: "Word" }]}
        help="Whether tokens are characters or words. Character-level learns spelling and morphology; word-level needs far more text to sound coherent." />
      <Slider label={`// ORDER (n)${mode === "word" ? " · max 3" : ""}`} min={1} max={mode === "word" ? 3 : 6} value={mode === "word" ? Math.min(order, 3) : order} onChange={setOrder} tone="violet"
        help="How many previous tokens condition the next one. Higher order is more coherent but, on a small corpus, just memorizes and replays the source verbatim." />
      <Slider label="// TEMPERATURE" min={0.1} max={1.5} step={0.05} value={temp} onChange={setTemp}
        help="Sampling randomness. Low picks the most likely next token (safe, repetitive); high flattens the distribution (surprising, often incoherent) — the same knob as on a real LLM." />
      <Slider label="// LENGTH" min={40} max={400} value={len} onChange={setLen}
        help="How many tokens to generate. Output length only — it does not change the model." />
      <DemoButton onClick={generate} primary>GENERATE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STATES" value={info.states} />
        <StatReadout label="CORPUS TOKENS" value={info.tokens} accent="var(--violet-lt)" />
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Paste your own text to make it speak in that voice.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A Markov chain is the simplest language model: it assumes the next token
        depends only on the last <i>n</i> tokens. We slide a window over the corpus,
        tally which token follows each <b>n-gram</b>, and then generate by sampling
        from those tallies. No neural network — just counting. This is the
        conceptual ancestor of every modern LLM, which keeps the "predict the next
        token" idea but replaces the lookup table with a transformer.
      </DemoP>
      <DemoP>
        Turn <b>order</b> up and the output gets more coherent — but at high order on
        a small corpus it just regurgitates the source verbatim (it has overfit /
        memorized). Drop it to 1 and you get word salad with the right letter
        statistics. <b>Temperature</b> controls daring: low values pick the most
        likely next token (safe, repetitive); high values flatten the
        distribution (surprising, often nonsense). Same two knobs you'd tune on a
        real LLM.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This counting-based n-gram model is the literal ancestor of today's LLMs: the
        objective — predict the next token from the previous ones — is identical, and
        n-grams powered production speech recognition, autocomplete, and machine
        translation for decades. What changed is the function approximator — a transformer
        replaces the lookup table, so context can be thousands of tokens instead of n, and
        <i> similar</i> contexts share statistics instead of being memorized separately.
      </DemoP>
      <DemoP>
        The two knobs transfer directly. <b>Temperature</b> is the exact sampling control
        you set on any generative model, and the <b>order</b>-versus-overfitting tradeoff —
        too much context on too little data just regurgitates training text — is a tiny,
        transparent version of LLM memorization. Markov chains also underpin MCMC,
        PageRank, and the MDPs of reinforcement learning, so the "next state depends only on
        the current one" assumption is worth internalizing on its own.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Markov Text Generator"
      subtitle="The simplest language model — count which token follows which, then sample. The ancestor of every LLM."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rnn-nlp/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MarkovDemo />);
