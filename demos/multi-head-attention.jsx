// demos/multi-head-attention.jsx — multi-head self-attention. Real scaled
// dot-product attention computed per head over fixed token embeddings with
// per-head Q/K projections, so each head produces a different attention pattern.
// (Embeddings/projections are fixed-random — the mechanism is real, the weights
// are illustrative, not learned.)

const { useRef: _useRef, useState: _useState } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, DemoButton, Legend, ControlGroup,
} = window;

const TOKENS = ["the", "tired", "cat", "sat", "on", "the", "mat"];
const DM = 24, HEADS = 4, DH = DM / HEADS;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function strSeed(s, salt) { let h = 2166136261 ^ salt; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function vec(seed, d) { const r = mulberry32(seed); return Array.from({ length: d }, () => r() * 2 - 1); }
function mat(seed, rows, cols) { const r = mulberry32(seed); return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (r() * 2 - 1) * 0.5)); }

function softmax(a) { const m = Math.max(...a); const e = a.map(x => Math.exp(x - m)); const s = e.reduce((p, q) => p + q, 0); return e.map(x => x / s); }

function computeHeads(seedBase) {
  const n = TOKENS.length;
  const E = TOKENS.map((t, i) => vec(strSeed(t, 101) ^ (i * 2654435761), DM)); // position-tinged embedding
  const heads = [];
  for (let h = 0; h < HEADS; h++) {
    const Wq = mat(seedBase + h * 17 + 1, DM, DH), Wk = mat(seedBase + h * 17 + 2, DM, DH);
    const Q = E.map(e => Wq[0].map((_, c) => e.reduce((s, v, k) => s + v * Wq[k][c], 0)));
    const K = E.map(e => Wk[0].map((_, c) => e.reduce((s, v, k) => s + v * Wk[k][c], 0)));
    const attn = [];
    for (let i = 0; i < n; i++) {
      const scores = [];
      for (let j = 0; j < n; j++) { let d = 0; for (let c = 0; c < DH; c++) d += Q[i][c] * K[j][c]; scores.push(d / Math.sqrt(DH)); }
      attn.push(softmax(scores));
    }
    heads.push(attn);
  }
  return heads;
}

function MultiHeadAttentionDemo() {
  const seedRef = _useRef(7);
  const [, setTick] = _useState(0);
  const headsRef = _useRef(computeHeads(7));
  const [sel, setSel] = _useState("0");

  const n = TOKENS.length;
  const heads = headsRef.current;
  const avg = (i, j) => heads.reduce((s, h) => s + h[i][j], 0) / HEADS;
  const w = (i, j) => sel === "avg" ? avg(i, j) : heads[parseInt(sel)][i][j];
  const HCOL = ["#60a5fa", "#c084fc", "#34d399", "#fbbf24"];
  const cellCol = sel === "avg" ? "224,231,255" : HCOL[parseInt(sel)].replace("#", "").match(/../g).map(h => parseInt(h, 16)).join(",");

  const stage = (
    <div style={{ width: "100%", maxWidth: 560 }}>
      <div className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 12 }}>
        attention( query row → key column ) {sel === "avg" ? "· averaged over heads" : "· head " + (parseInt(sel) + 1)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `64px repeat(${n}, 1fr)`, gap: 3 }}>
        <div />
        {TOKENS.map((t, j) => (
          <div key={"h" + j} className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, textAlign: "center", paddingBottom: 4 }}>{t}</div>
        ))}
        {TOKENS.map((tq, i) => (
          <React.Fragment key={"r" + i}>
            <div className="t-mono" style={{ color: "var(--white)", fontSize: 12, textAlign: "right", paddingRight: 8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>{tq}</div>
            {TOKENS.map((tk, j) => {
              const a = w(i, j);
              return (
                <div key={j} title={a.toFixed(2)} style={{
                  aspectRatio: "1 / 1", borderRadius: 3,
                  background: `rgba(${cellCol},${0.08 + 0.9 * a})`,
                  border: "1px solid rgba(96,165,250,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {a > 0.18 && <span className="t-mono-s" style={{ fontSize: 9, color: a > 0.5 ? "#050816" : "var(--white)" }}>{Math.round(a * 100)}</span>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// VIEW" value={sel} onChange={setSel}
        options={[{ value: "0", label: "H1" }, { value: "1", label: "H2" }, { value: "2", label: "H3" }, { value: "3", label: "H4" }, { value: "avg", label: "AVG" }]}
        help="Which head's attention map to show (H1–H4), or AVG to blend all four. Each head has its own projection and highlights a different relationship; AVG is what feeds the next layer." />
      <DemoButton onClick={() => { seedRef.current = (seedRef.current * 7 + 13) >>> 0; headsRef.current = computeHeads(seedRef.current); setTick(t => t + 1); }} primary>NEW HEADS</DemoButton>
      <Legend items={[{ color: "#60a5fa", label: "HEAD 1" }, { color: "#c084fc", label: "HEAD 2" }, { color: "#34d399", label: "HEAD 3" }, { color: "#fbbf24", label: "HEAD 4" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Each row sums to 1: it's a probability distribution over which tokens that query attends to. Switch heads to see different patterns.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A single attention head computes <b>softmax(QKᵀ/√d)</b> — for every token (a
        row here), a probability distribution over which other tokens it should pull
        information from (the columns). But one pattern isn't enough: a model needs to
        track grammar, reference, position, and meaning <i>at the same time</i>.
        <b> Multi-head attention</b> runs several of these in parallel, each with its
        own learned Q/K projection, so each head is free to specialize. Flip between
        <span style={{ color: "#60a5fa" }}> H1</span>–<span style={{ color: "#fbbf24" }}>H4</span>
        and watch the maps change completely on the same sentence.
      </DemoP>
      <DemoP>
        The heads' outputs are concatenated and mixed back together, giving the layer a
        richer view than any single head could. That's the whole trick behind the
        transformer: <b>AVG</b> shows the blended picture, but the power is in the
        diversity of the individual heads. <i>(Here the projections are fixed-random to
        expose the mechanism — in a trained model they'd be learned, and the patterns
        would line up with real linguistic structure. Hit "New heads" to reshuffle.)</i>
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Multi-head attention is why a single transformer layer can juggle several
        relationships at once — one head tracking syntax, another coreference, another local
        position — instead of being squeezed into one pattern. It's a near-free upgrade:
        split the model dimension across heads, run attention in parallel, then
        concatenate, so heads cost little extra while sharply increasing what a layer can
        express.
      </DemoP>
      <DemoP>
        This is the literal core of every transformer block in GPT, BERT, Llama, and
        Claude, and a focus of both research and systems work. Heads are where
        interpretability finds specialized circuits — the <i>induction heads</i> that drive
        in-context learning — and they're the target of efficiency tricks like Multi-Query
        and Grouped-Query Attention, which let heads share keys/values to shrink the KV
        cache and speed up inference.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Multi-Head Attention"
      subtitle="Several attention patterns in parallel — each head free to specialize, then blended back together."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/transformers/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MultiHeadAttentionDemo />);
