// demos/decoding.jsx — how temperature / top-k / top-p reshape a next-token
// distribution and what gets sampled. Real softmax + truncation + renormalize.

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP, DemoUL, DemoLI,
  Slider, DemoButton, StatReadout, ControlGroup,
} = window;

const VOCAB = [
  ["mat", 3.2], ["floor", 2.4], ["sofa", 2.1], ["rug", 1.9], ["couch", 1.6], ["bed", 1.3],
  ["table", 1.0], ["chair", 0.7], ["grass", 0.2], ["roof", -0.3], ["car", -1.0], ["moon", -2.0],
];

function distribution(temp, topk, topp) {
  const logits = VOCAB.map(([, l]) => l / Math.max(0.05, temp));
  const mx = Math.max(...logits);
  const ex = logits.map(l => Math.exp(l - mx));
  const sum = ex.reduce((a, b) => a + b, 0);
  const rows = VOCAB.map(([t], i) => ({ t, p: ex[i] / sum, kept: true }));
  const order = [...rows].sort((a, b) => b.p - a.p);
  const k = (topk <= 0 || topk >= VOCAB.length) ? VOCAB.length : topk;
  const kBest = new Set(order.slice(0, k).map(o => o.t));
  let keep = kBest;
  if (topp < 0.999) {
    const nucleus = new Set(); let cum = 0;
    for (const o of order) { if (!kBest.has(o.t)) continue; cum += o.p; nucleus.add(o.t); if (cum >= topp) break; }
    keep = nucleus;
  }
  rows.forEach(r => { r.kept = keep.has(r.t); });
  const kp = rows.filter(r => r.kept).reduce((a, b) => a + b.p, 0) || 1;
  rows.forEach(r => { r.sample = r.kept ? r.p / kp : 0; });
  return rows;
}

function DecodingDemo() {
  const [temp, setTemp] = _useState(0.8);
  const [topk, setTopk] = _useState(0);
  const [topp, setTopp] = _useState(1);
  const [last, setLast] = _useState(null);
  const tallyRef = _useRef({});
  const [, setTick] = _useState(0);

  const rows = distribution(temp, topk, topp);
  const max = Math.max(...rows.map(r => r.p));
  const keptCount = rows.filter(r => r.kept).length;

  function sample() {
    let r = Math.random(), pick = rows.find(x => x.kept);
    for (const row of rows) { if (!row.kept) continue; r -= row.sample; if (r <= 0) { pick = row; break; } }
    tallyRef.current[pick.t] = (tallyRef.current[pick.t] || 0) + 1;
    setLast(pick.t); setTick(t => t + 1);
  }
  function reset() { tallyRef.current = {}; setLast(null); setTick(t => t + 1); }

  const stage = (
    <div style={{ width: "100%", maxWidth: 620 }}>
      <div className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 12 }}>P( next token | "the cat sat on the ___" )</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(r => {
          const tally = tallyRef.current[r.t] || 0;
          const hot = last === r.t;
          return (
            <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 10, opacity: r.kept ? 1 : 0.32 }}>
              <span className="t-mono" style={{ width: 64, textAlign: "right", color: hot ? "#fbbf24" : "var(--white)", fontSize: 13 }}>{r.t}</span>
              <div style={{ flex: 1, height: 18, background: "rgba(96,165,250,0.08)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${(r.p / max) * 100}%`, background: r.kept ? (hot ? "#fbbf24" : "linear-gradient(90deg,#3b82f6,#a855f7)") : "var(--dim)", borderRadius: 3 }} />
              </div>
              <span className="t-mono-s" style={{ width: 44, color: "var(--muted)", fontSize: 11 }}>{(r.p * 100).toFixed(1)}%</span>
              <span className="t-mono-s" style={{ width: 28, color: tally ? "var(--violet-lt)" : "var(--dim)", fontSize: 11 }}>{tally ? "×" + tally : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
  const controls = (
    <ControlGroup>
      <Slider label="// TEMPERATURE" min={0.1} max={2} step={0.05} value={temp} onChange={setTemp} tone="violet"
        help="Scales the logits before softmax. Below 1 sharpens toward the top token (safe, repetitive); above 1 flattens the distribution (diverse, riskier)." />
      <Slider label={`// TOP-K${topk <= 0 ? " · off" : ""}`} min={0} max={VOCAB.length} value={topk} onChange={setTopk}
        help="Keep only the k highest-probability tokens; everything else is dropped before sampling. 0 = off (keep all)." />
      <Slider label={`// TOP-P${topp >= 0.999 ? " · off" : ""}`} min={0.1} max={1} step={0.05} value={topp} onChange={setTopp} tone="violet"
        help="Nucleus sampling: keep the smallest set of top tokens whose probabilities sum to p, then sample only from those. 1.0 = off." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={sample} primary>SAMPLE</DemoButton>
        <DemoButton onClick={reset}>RESET TALLY</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TOKENS KEPT" value={keptCount} />
        <StatReadout label="LAST SAMPLE" value={last || "—"} accent="#fbbf24" />
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Greyed tokens are filtered out before sampling.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A language model outputs a probability over the whole vocabulary. How you{" "}
        <i>sample</i> from it decides the character of the output.
      </DemoP>
      <DemoUL>
        <DemoLI>
          <b>Temperature</b> rescales the logits before softmax. Below 1 it sharpens
          toward the top token, safe and repetitive. Above 1 it flattens the
          distribution, diverse and riskier. Drag it and watch the bars concentrate
          or spread.
        </DemoLI>
        <DemoLI>
          <b>Top-k</b> keeps only the k most likely tokens.
        </DemoLI>
        <DemoLI>
          <b>Top-p</b>, nucleus sampling, keeps the smallest set whose probabilities
          sum to p.
        </DemoLI>
      </DemoUL>
      <DemoP>
        Both truncation rules then renormalize and sample only from what is left,
        since the greyed tokens can never be chosen. That is how you cut off the long
        tail of nonsense while still allowing variety. Hit <b>Sample</b> repeatedly
        and watch the tally: these three knobs are exactly what you tune on any real
        LLM API.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Decoding is the last mile of every generative language model. The network
        only ever produces a probability distribution over the next token, and
        temperature, top-k and top-p are the dials that turn that distribution into
        actual text. They are exposed directly on every major LLM API, so tuning them
        is a daily part of building anything on top of one: low temperature and tight
        top-p for structured output and factual answers, higher temperature for
        brainstorming and creative work.
      </DemoP>
      <DemoP>
        The same idea generalizes far beyond text. Any model that samples from a
        learned distribution faces the identical explore-against-exploit tradeoff
        between "most likely" and "diverse":
      </DemoP>
      <DemoUL>
        <DemoLI>Image and audio generators.</DemoLI>
        <DemoLI>Code models, where an unreliable tail is a syntax error.</DemoLI>
        <DemoLI>RL policies that sample actions.</DemoLI>
      </DemoUL>
      <DemoP>
        Understanding how truncation cuts the unreliable tail while temperature
        reshapes confidence is what lets you control the quality, safety and variety
        of a generative system instead of hoping for the best.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Decoding Strategies"
      subtitle="Temperature, top-k, and top-p: how the same model becomes safe or wild depending on how you sample."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-nlp/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DecodingDemo />);
