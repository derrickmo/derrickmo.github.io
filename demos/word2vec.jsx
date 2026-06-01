// demos/word2vec.jsx — skip-gram word embeddings, trained live in 2D.
//
// word2vec's skip-gram learns a vector per word by predicting a word's context
// from the word itself. For a center word c and a context word o:
//   P(o | c) = softmax(u_o · v_c)   over the vocabulary,
// minimize −log P(o|c) by SGD, updating the input vectors v and output vectors u.
// "Words that appear in similar contexts end up with similar vectors." We train
// real 2D embeddings on a tiny topical corpus so you can WATCH the geometry form:
// words that co-occur (same topic) get pulled together, and the topics separate
// into clusters — the distributional-semantics idea, with no dimensionality
// reduction in between (the vectors are natively 2-D).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 500, H = 480;
const TOPICS = [
  { name: "animals", words: ["cat", "dog", "fox", "owl"] },
  { name: "fruits", words: ["apple", "pear", "plum", "fig"] },
  { name: "colors", words: ["red", "blue", "green", "gold"] },
  { name: "motion", words: ["run", "jump", "swim", "fly"] },
];
const PAL = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24"];

function Word2VecDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [lr, setLr] = _useState(0.1);
  const [mix, setMix] = _useState(0.0);   // cross-topic noise in the corpus
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function reset() {
    const r = rng(seed * 40503 + 7);
    const vocab = [], topicOf = [];
    TOPICS.forEach((t, ti) => t.words.forEach(w => { vocab.push(w); topicOf.push(ti); }));
    const V = vocab.length;
    // co-occurrence pairs: within-topic (+ a little cross-topic by `mix`)
    const pairs = [];
    for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) {
      if (i === j) continue;
      if (topicOf[i] === topicOf[j]) pairs.push([i, j]);
      else if (r() < mix * 0.15) pairs.push([i, j]);
    }
    const vIn = Array.from({ length: V }, () => [0.4 * randn(r), 0.4 * randn(r)]);
    const uOut = Array.from({ length: V }, () => [0.4 * randn(r), 0.4 * randn(r)]);
    sim.current = { vocab, topicOf, V, pairs, vIn, uOut, step: 0, loss: 0 };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [mix, seed]);

  function train() {
    const st = sim.current; if (!st) return;
    const { V, pairs, vIn, uOut } = st;
    let lossAcc = 0;
    const B = 60;
    for (let b = 0; b < B; b++) {
      const [c, o] = pairs[(Math.random() * pairs.length) | 0];
      const vc = vIn[c];
      // softmax over vocab
      const sc = new Array(V); let mx = -Infinity;
      for (let w = 0; w < V; w++) { sc[w] = uOut[w][0] * vc[0] + uOut[w][1] * vc[1]; if (sc[w] > mx) mx = sc[w]; }
      let Z = 0; for (let w = 0; w < V; w++) { sc[w] = Math.exp(sc[w] - mx); Z += sc[w]; }
      const p = sc.map(x => x / Z);
      lossAcc += -Math.log(Math.max(1e-9, p[o]));
      // grad v_c = -u_o + Σ p_w u_w
      let gx = -uOut[o][0], gy = -uOut[o][1];
      for (let w = 0; w < V; w++) { gx += p[w] * uOut[w][0]; gy += p[w] * uOut[w][1]; }
      // grad u_w = (p_w - 1[w==o]) v_c  (apply with old v_c)
      for (let w = 0; w < V; w++) { const g = p[w] - (w === o ? 1 : 0); uOut[w][0] -= lr * g * vc[0]; uOut[w][1] -= lr * g * vc[1]; }
      vc[0] -= lr * gx; vc[1] -= lr * gy;
    }
    st.loss = lossAcc / B; st.step += B;
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 16) { last = now; train(); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, lr]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = sim.current; if (!st) return;
    const { V, vIn, vocab, topicOf } = st;
    let xmn = Infinity, xmx = -Infinity, ymn = Infinity, ymx = -Infinity;
    for (let i = 0; i < V; i++) { xmn = Math.min(xmn, vIn[i][0]); xmx = Math.max(xmx, vIn[i][0]); ymn = Math.min(ymn, vIn[i][1]); ymx = Math.max(ymx, vIn[i][1]); }
    const pad = 50, span = Math.max(xmx - xmn, ymx - ymn, 0.5) * 1.15, cx = (xmn + xmx) / 2, cy = (ymn + ymx) / 2;
    const PX = (x) => W / 2 + (x - cx) / span * (W - 2 * pad);
    const PY = (y) => H / 2 - 8 + (y - cy) / span * (H - 60 - 2 * pad);

    ctx.fillStyle = "#94a3b8"; ctx.fillText("WORD VECTORS (2-D)  ·  color = topic  ·  watch them cluster as training runs", 24, 20);
    for (let i = 0; i < V; i++) {
      const x = PX(vIn[i][0]), y = PY(vIn[i][1]);
      ctx.fillStyle = PAL[topicOf[i] % PAL.length];
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#e2e8f0"; ctx.font = "10px JetBrains Mono"; ctx.fillText(vocab[i], x + 6, y + 3);
    }
    ctx.fillStyle = "#a855f7"; ctx.font = "600 15px Space Grotesk, JetBrains Mono";
    ctx.fillText("loss " + st.loss.toFixed(3), 24, H - 16);
    ctx.fillStyle = "#34d399"; ctx.font = "11px JetBrains Mono"; ctx.fillText("updates " + st.step, 150, H - 16);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// LEARNING RATE" min={0.02} max={0.4} step={0.02} value={lr} onChange={setLr} tone="violet"
        help="SGD step size for the skip-gram updates. Higher converges faster but the cloud jitters; lower is smoother but slower. Purely a training knob." />
      <Slider label="// CROSS-TOPIC MIX" min={0} max={1} step={0.1} value={mix} onChange={setMix}
        help="How often words from different topics co-occur in the corpus. At 0 topics are pure (four clean clusters); raise it and the clusters bleed together — embeddings only separate what the contexts separate. Resets training." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESTART</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="SKIP-GRAM LOSS" value={st ? st.loss.toFixed(3) : "—"} accent="#a855f7" />
        <StatReadout label="UPDATES" value={st ? st.step : 0} accent="#34d399" />
      </div>
      <Legend items={TOPICS.map((t, i) => ({ color: PAL[i], label: t.name }))} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Every dot is a word's 2-D vector, starting at random. Skip-gram repeatedly
        picks a center word and nudges its vector to better predict the words it
        co-occurs with (and to NOT predict the rest, via the softmax denominator).
        Because our corpus keeps each topic's words appearing together, words that
        share contexts get pulled together — within a few thousand updates the four
        topics condense into four clean clusters. Nothing told the model the topic
        labels (the colors are just for you); it recovered them from co-occurrence
        alone. That's the distributional hypothesis: meaning is contextual company.
      </DemoP>
      <DemoP>
        Slide CROSS-TOPIC MIX up and the corpus starts putting unrelated words in the
        same windows; the clusters smear, because the embedding can only separate what
        the contexts actually separate. This is the honest core of word2vec — real
        models use hundreds of dimensions and negative sampling for speed, but the
        learning signal is exactly this. The famous "king − man + woman ≈ queen"
        analogies are a consequence of these co-occurrence geometries, not a separate
        mechanism.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        word2vec (Mikolov 2013) launched modern{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/embeddings/`} style={{ color: "#a855f7" }}>embeddings</a>:
        dense word vectors learned from raw text that power retrieval, classification,
        and the input layer of every language model. Skip-gram with negative sampling
        is its workhorse variant; GloVe reaches similar vectors via co-occurrence
        counts. It's the static-embedding ancestor of contextual embeddings from{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/attention/`} style={{ color: "#a855f7" }}>transformers</a>,
        and the same contrastive "pull co-occurring things together" objective shows
        up in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/contrastive-learning/`} style={{ color: "#a855f7" }}>contrastive learning</a>.
      </DemoP>
      <DemoP>
        Caveats: word2vec gives ONE vector per word, so it can't distinguish senses
        ("bank" of a river vs money) — that's what contextual models fixed. It inherits
        and can amplify biases present in the training corpus (the analogy structure
        also encodes stereotypes). And the geometry is only as good as the corpus:
        rare words get noisy vectors, and what looks like "meaning" is really
        co-occurrence statistics, which is why domain and tokenization choices matter.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRANSFORMERS & NLP" title="word2vec (Skip-gram)"
      subtitle="Train real 2-D word vectors with skip-gram SGD and watch topics self-organize into clusters from co-occurrence alone. Raise the cross-topic mix to see the geometry blur — embeddings only separate what the contexts do."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/transformers/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Word2VecDemo />);
