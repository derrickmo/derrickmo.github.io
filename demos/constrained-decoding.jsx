// demos/constrained-decoding.jsx — grammar-constrained generation (JSON mode).
//
// Two streams generate a small JSON object token by token from the SAME toy
// model. The model puts mass `competence` on grammar-valid tokens and the rest
// on invalid ones, then temperature flattens it. A finite template grammar says
// which tokens are legal at each position:
//     { "name" : <"ada"|"max"|"sam"> , "age" : <7|19|42> }
//
//   UNCONSTRAINED samples from the raw distribution — one invalid token and the
//     JSON fails to parse.
//   CONSTRAINED masks every grammar-invalid token to zero probability and
//     renormalizes before sampling, so the output is valid by construction.
//
// The validity tally makes the point: constrained is always 100% valid; the
// unconstrained rate collapses as the model gets weaker or the temperature rises
// — which is exactly when you reach for constrained decoding / function calling.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const VOCAB = ["{", "}", ":", ",", "\"name\"", "\"age\"", "\"ada\"", "\"max\"", "\"sam\"", "7", "19", "42", "true", "null"];
// valid token indices at each stage of the template
const STAGE_VALID = [[0], [4], [2], [6, 7, 8], [3], [5], [2], [9, 10, 11], [1]];
const STAGE_LABEL = ["expect {", "expect key \"name\"", "expect :", "expect string value", "expect ,", "expect key \"age\"", "expect :", "expect integer", "expect }"];
const NSTAGE = STAGE_VALID.length;

function softmaxLogits(comp, temp) {
  // logits handled per-stage by the caller; here comp/temp shape the base
  return { s: comp * 6, t: temp };
}
function probsAt(stage, comp, temp) {
  const valid = new Set(STAGE_VALID[stage]);
  const { s, t } = softmaxLogits(comp, temp);
  const logits = VOCAB.map((_, i) => (valid.has(i) ? s : 0) / t);
  const m = Math.max(...logits);
  const ex = logits.map(l => Math.exp(l - m));
  const z = ex.reduce((a, b) => a + b, 0);
  return ex.map(e => e / z);
}
function sample(probs) {
  let r = Math.random(), acc = 0;
  for (let i = 0; i < probs.length; i++) { acc += probs[i]; if (r <= acc) return i; }
  return probs.length - 1;
}

function ConstrainedDecodingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [comp, setComp] = _useState(0.6);
  const [temp, setTemp] = _useState(1.0);
  const [speed, setSpeed] = _useState(6);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  const freshStream = () => ({ toks: [], stage: 0, broken: false, done: false });
  const st = _useRef({ un: freshStream(), con: freshStream(), gens: 0, validUn: 0, palette: probsAt(0, 0.6, 1) });

  function reset() { st.current = { un: freshStream(), con: freshStream(), gens: 0, validUn: 0, palette: probsAt(0, comp, temp) }; force(x => x + 1); }

  function advanceUn(s) {
    if (s.un.done || s.un.broken) return;
    const probs = probsAt(s.un.stage, comp, temp);
    const idx = sample(probs);
    const valid = new Set(STAGE_VALID[s.un.stage]);
    s.un.toks.push({ i: idx, bad: !valid.has(idx) });
    if (!valid.has(idx)) { s.un.broken = true; }
    else { s.un.stage++; if (s.un.stage >= NSTAGE) s.un.done = true; }
  }
  function advanceCon(s) {
    if (s.con.done) return;
    const probs = probsAt(s.con.stage, comp, temp);
    const valid = STAGE_VALID[s.con.stage];
    // mask to valid, renormalize, sample
    let z = 0; valid.forEach(i => z += probs[i]);
    let r = Math.random() * z, idx = valid[0];
    for (const i of valid) { r -= probs[i]; if (r <= 0) { idx = i; break; } }
    s.con.toks.push({ i: idx, bad: false });
    s.con.stage++; if (s.con.stage >= NSTAGE) s.con.done = true;
  }

  function tick() {
    const s = st.current;
    const unTerm = s.un.done || s.un.broken, conTerm = s.con.done;
    if (unTerm && conTerm) {
      s.gens++; if (!s.un.broken) s.validUn++;
      s.un = freshStream(); s.con = freshStream();
      return;
    }
    advanceUn(s); advanceCon(s);
    // palette reflects the constrained stream's current stage
    s.palette = probsAt(Math.min(s.con.stage, NSTAGE - 1), comp, temp);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current;
    ctx.textBaseline = "alphabetic";

    const drawStream = (label, stream, y) => {
      ctx.font = "11px JetBrains Mono"; ctx.fillStyle = "#94a3b8";
      ctx.fillText(label, 20, y);
      let badge = stream.broken ? "✗ parse error" : stream.done ? "✓ valid JSON" : "…";
      ctx.fillStyle = stream.broken ? "#f87171" : stream.done ? "#34d399" : "#64748b";
      ctx.fillText(badge, W - 110, y);
      // tokens
      ctx.font = "13px JetBrains Mono";
      let x = 20; const ty = y + 22;
      stream.toks.forEach(t => {
        const txt = VOCAB[t.i];
        ctx.fillStyle = t.bad ? "#f87171" : "#e2e8f0";
        ctx.fillText(txt, x, ty);
        x += ctx.measureText(txt).width + 7;
      });
      if (!stream.done && !stream.broken) { ctx.fillStyle = "#64748b"; ctx.fillText("▮", x, ty); }
    };
    drawStream("UNCONSTRAINED  ·  sample from the raw model", s.un, 26);
    drawStream("CONSTRAINED  ·  mask invalid tokens, then sample", s.con, 86);

    // ── token palette at the constrained stream's current stage ──
    const stage = Math.min(s.con.stage, NSTAGE - 1);
    const valid = new Set(STAGE_VALID[stage]);
    ctx.font = "11px JetBrains Mono"; ctx.fillStyle = "#94a3b8";
    ctx.fillText(`NEXT-TOKEN DISTRIBUTION  ·  ${STAGE_LABEL[stage]}  ·  green = grammar-valid (constrained keeps only these)`, 20, 148);
    const cols = 7, cw = (W - 40) / cols, ch = 30, gy = 162, barMax = 40;
    VOCAB.forEach((tok, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const cx = 20 + c * cw, cy = gy + r * (ch + barMax + 10);
      const ok = valid.has(i);
      // prob bar
      const bh = s.palette[i] * barMax;
      ctx.fillStyle = ok ? "#60a5fa" : "rgba(148,163,184,0.35)";
      ctx.fillRect(cx + 4, cy + barMax - bh, cw - 12, bh);
      // token cell
      ctx.strokeStyle = ok ? "#34d399" : "rgba(148,163,184,0.25)"; ctx.lineWidth = ok ? 1.5 : 1;
      ctx.strokeRect(cx + 2, cy + barMax + 2, cw - 8, ch - 4);
      ctx.fillStyle = ok ? "#e2e8f0" : "#64748b"; ctx.font = "10px JetBrains Mono";
      const txt = tok.length > 7 ? tok.slice(0, 7) : tok;
      ctx.fillText(txt, cx + 7, cy + barMax + ch / 2 + 5);
    });

    // ── validity tally ──
    const tY = 340, tH = H - tY - 16, tX = 20, tW = W - 40;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText(`VALID-JSON RATE over ${s.gens} completed generations`, tX, tY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(tX, tY, tW, tH);
    const unRate = s.gens ? s.validUn / s.gens : 0;
    const bar = (yy, label, rate, color) => {
      const bw = (tW - 120) * rate;
      ctx.fillStyle = color; ctx.fillRect(tX + 110, yy, bw, 20);
      ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText(label, tX + 8, yy + 14);
      ctx.fillStyle = "#e2e8f0"; ctx.fillText((rate * 100).toFixed(0) + "%", tX + 114 + bw + 6, yy + 14);
    };
    bar(tY + 22, "unconstrained", unRate, "rgba(248,113,113,0.8)");
    bar(tY + 54, "constrained", s.gens ? 1 : 0, "rgba(52,211,153,0.85)");
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  });

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 1000 / speed) { lastRef.current = now; tick(); force(x => x + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, comp, temp, speed]);

  const s = st.current;
  const unRate = s.gens ? (s.validUn / s.gens * 100).toFixed(0) + "%" : "—";
  const stage = (
    <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />
  );
  const controls = (
    <ControlGroup>
      <Slider label="// MODEL COMPETENCE" min={0} max={1} step={0.05} value={comp} onChange={setComp} tone="violet"
        help="How much probability the raw model already puts on grammar-valid tokens. A strong model (high) mostly emits valid JSON on its own; a weak or small model (low) sprays mass on illegal tokens — and unconstrained generation breaks constantly." />
      <Slider label="// TEMPERATURE" min={0.3} max={2} step={0.1} value={temp} onChange={setTemp}
        help="Flattens the distribution. Higher temperature spreads probability toward invalid tokens, so the unconstrained stream derails more often — the same diversity that helps sampling hurts structural validity." />
      <Slider label="// SPEED (tokens/sec)" min={2} max={30} step={1} value={speed} onChange={setSpeed}
        help="Generation speed. Slow it down to watch a single token get masked; speed it up to accumulate a validity rate." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "GENERATE"}</DemoButton>
      <DemoButton onClick={() => { tick(); force(x => x + 1); }}>STEP</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="GENERATIONS" value={s.gens} />
        <StatReadout label="VALID (uncon.)" value={unRate} accent="#f87171" />
      </div>
      <StatReadout label="VALID (constrained)" value={s.gens ? "100%" : "—"} accent="#34d399" />
      <Legend items={[
        { color: "#34d399", label: "grammar-valid token" },
        { color: "#60a5fa", label: "model probability" },
        { color: "#f87171", label: "invalid → parse error" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Both streams draw from the same toy model and build the same JSON object
        one token at a time. The palette shows the model's next-token
        distribution; the green-outlined tokens are the ones the grammar allows at
        this position. The unconstrained stream samples from the whole row, so the
        moment it picks a red (illegal) token the JSON is unparseable. The
        constrained stream zeroes every non-green token, renormalizes over what's
        left, and samples — it physically cannot emit anything that breaks the
        structure.
      </DemoP>
      <DemoP>
        Push MODEL COMPETENCE down or TEMPERATURE up and watch the two validity
        bars diverge: the constrained rate stays pinned at 100% while the
        unconstrained rate falls off a cliff. That gap is the whole argument for
        structured decoding — it lets a smaller, cheaper, or hotter model emit
        guaranteed-valid output, instead of praying the raw samples happen to
        parse and retrying when they don't.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Constrained (or grammar-guided) decoding is how "JSON mode", function /
        tool calling, and structured outputs actually work. At every step the
        decoder intersects the model's probability vector with the set of tokens a
        grammar — a JSON schema, a regex, or a context-free grammar compiled to a
        finite-state machine — permits next, then samples from the survivors. It's
        the same per-step distribution you tune in the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`} style={{ color: "#a855f7" }}>decoding</a>{" "}
        demo, with an extra hard mask laid over it.
      </DemoP>
      <DemoP>
        In production it's the backbone of reliable tool use: libraries like
        Outlines, Guidance, and XGrammar, and the constrained-decoding endpoints
        in vLLM and llama.cpp, compile a schema into exactly this mask. The
        tradeoffs the demo hides: a too-tight grammar can suppress tokens the model
        wanted and dent answer quality, and building the per-step token mask
        efficiently (without scanning the whole vocabulary every step) is the real
        engineering. It pairs naturally with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/self-consistency/`} style={{ color: "#a855f7" }}>validation
        and retry</a> as the output-side guardrail of an LLM system.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="Constrained Decoding"
      subtitle="Mask the grammar-invalid tokens at every step and structured output becomes guaranteed, not hoped-for. Compare raw vs constrained JSON generation."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ConstrainedDecodingDemo />);
