// demos/embeddings.jsx — word-embedding geometry: nearest neighbors + analogies.
// A small hand-built 2D embedding space (real embeddings are higher-D but behave
// the same way) arranged so analogy parallelograms hold.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 440, PAD = 34;
const CAT = { royal: "#c084fc", geo: "#60a5fa", animal: "#34d399", food: "#fbbf24" };

const WORDS = [
  ["man", -4.5, 1.0, "royal"], ["woman", -2.9, 1.0, "royal"], ["king", -4.5, 2.5, "royal"], ["queen", -2.9, 2.5, "royal"],
  ["boy", -4.5, -0.1, "royal"], ["girl", -2.9, -0.1, "royal"],
  ["france", -2.6, -3.2, "geo"], ["paris", -2.2, -1.8, "geo"], ["italy", -1.0, -3.3, "geo"], ["rome", -0.6, -1.9, "geo"],
  ["japan", -3.6, -4.2, "geo"], ["tokyo", -3.2, -2.8, "geo"], ["spain", 0.2, -3.4, "geo"], ["madrid", 0.6, -2.0, "geo"],
  ["cat", 2.6, -2.0, "animal"], ["dog", 3.4, -2.6, "animal"], ["lion", 2.2, -3.2, "animal"], ["tiger", 3.0, -3.6, "animal"], ["wolf", 3.9, -3.0, "animal"], ["fox", 4.2, -2.2, "animal"],
  ["apple", 3.0, 3.2, "food"], ["banana", 3.8, 2.7, "food"], ["bread", 2.5, 2.3, "food"], ["cheese", 4.1, 3.6, "food"],
];
const V = {}; WORDS.forEach(([w, x, y]) => V[w] = { x, y });

const ANALOGIES = [
  { label: "king − man + woman", pos1: "king", neg: "man", pos2: "woman" },
  { label: "queen − woman + man", pos1: "queen", neg: "woman", pos2: "man" },
  { label: "paris − france + italy", pos1: "paris", neg: "france", pos2: "italy" },
  { label: "tokyo − japan + spain", pos1: "tokyo", neg: "japan", pos2: "spain" },
];

const mapX = x => PAD + (x + 6) / 12 * (W - 2 * PAD);
const mapY = y => H - PAD - (y + 5.2) / 10.4 * (H - 2 * PAD);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function EmbeddingsDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [mode, setMode] = _useState("neighbors");
  const [selected, setSelected] = _useState("king");
  const [analogy, setAnalogy] = _useState(0);
  const stateRef = _useRef({ mode, selected, analogy });
  stateRef.current = { mode, selected, analogy };

  function nearest(vec, exclude = []) {
    let best = null, bd = Infinity;
    for (const [w] of WORDS) { if (exclude.includes(w)) continue; const d = dist(V[w], vec); if (d < bd) { bd = d; best = w; } }
    return best;
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { mode, selected, analogy } = stateRef.current;

    let highlight = new Set(), lines = [], resultPt = null, resultWord = null;
    if (mode === "neighbors") {
      const sel = V[selected];
      const neigh = WORDS.map(([w]) => w).filter(w => w !== selected).map(w => ({ w, d: dist(V[w], sel) })).sort((a, b) => a.d - b.d).slice(0, 4);
      highlight.add(selected); neigh.forEach(n => { highlight.add(n.w); lines.push([selected, n.w]); });
    } else {
      const A = ANALOGIES[analogy];
      const vec = { x: V[A.pos1].x - V[A.neg].x + V[A.pos2].x, y: V[A.pos1].y - V[A.neg].y + V[A.pos2].y };
      resultPt = vec; resultWord = nearest(vec, [A.pos1, A.neg, A.pos2]);
      [A.pos1, A.neg, A.pos2, resultWord].forEach(w => highlight.add(w));
    }

    // neighbor lines
    ctx.strokeStyle = "rgba(96,165,250,0.4)"; ctx.lineWidth = 1;
    lines.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(mapX(V[a].x), mapY(V[a].y)); ctx.lineTo(mapX(V[b].x), mapY(V[b].y)); ctx.stroke(); });

    // analogy arrows
    if (mode === "analogy") {
      const A = ANALOGIES[analogy];
      const arrow = (from, to, color) => {
        const x1 = mapX(from.x), y1 = mapY(from.y), x2 = mapX(to.x), y2 = mapY(to.y);
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const ang = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 8 * Math.cos(ang - 0.4), y2 - 8 * Math.sin(ang - 0.4)); ctx.lineTo(x2 - 8 * Math.cos(ang + 0.4), y2 - 8 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
      };
      arrow(V[A.neg], V[A.pos1], "rgba(148,163,184,0.7)");      // man → king (the relation)
      arrow(V[A.pos2], resultPt, "#c084fc");                     // woman → result (same vector)
      // result marker
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(mapX(resultPt.x), mapY(resultPt.y), 10, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    // points + labels
    for (const [w, , , cat] of WORDS) {
      const x = mapX(V[w].x), y = mapY(V[w].y), hot = highlight.has(w);
      ctx.fillStyle = CAT[cat];
      ctx.globalAlpha = hot ? 1 : 0.55;
      ctx.beginPath(); ctx.arc(x, y, hot ? 6 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = hot ? "#fff" : "rgba(224,231,255,0.6)";
      ctx.font = (hot ? "bold " : "") + "12px 'JetBrains Mono', monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(w, x + 9, y);
    }
    if (mode === "analogy" && resultWord) {
      ctx.fillStyle = "#c084fc"; ctx.font = "bold 12px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText("≈ " + resultWord, mapX(resultPt.x), mapY(resultPt.y) - 16);
    }
  }

  function onDown(e) {
    if (stateRef.current.mode !== "neighbors") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mxp = (e.clientX - rect.left) / (rect.width / W), myp = (e.clientY - rect.top) / (rect.height / H);
    let best = null, bd = Infinity;
    for (const [w] of WORDS) { const d = Math.hypot(mapX(V[w].x) - mxp, mapY(V[w].y) - myp); if (d < bd) { bd = d; best = w; } }
    if (best && bd < 40) setSelected(best);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [mode, selected, analogy]);

  const stage = <canvas ref={canvasRef} onPointerDown={onDown} style={{ touchAction: "none", cursor: "pointer", maxWidth: "100%", borderRadius: 4 }} />;

  const analogyResult = (() => {
    const A = ANALOGIES[analogy]; const vec = { x: V[A.pos1].x - V[A.neg].x + V[A.pos2].x, y: V[A.pos1].y - V[A.neg].y + V[A.pos2].y };
    return nearest(vec, [A.pos1, A.neg, A.pos2]);
  })();

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// MODE" value={mode} onChange={setMode}
        options={[{ value: "neighbors", label: "Neighbors" }, { value: "analogy", label: "Analogy" }]}
        help="Neighbors finds the words closest to one you pick (similarity = distance); Analogy shows the king−man+woman parallelogram, where directions encode relationships." />
      {mode === "neighbors" ? (
        <>
          <div className="t-mono-s" style={{ color: "var(--muted)" }}>// WORD (click a point too)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 180, overflowY: "auto" }}>
            {WORDS.map(([w]) => (
              <button key={w} onClick={() => setSelected(w)} className="t-mono-s"
                style={{ padding: "6px 4px", borderRadius: 4, cursor: "pointer", fontSize: 10,
                  border: `1px solid ${selected === w ? "var(--blue-lt)" : "var(--border)"}`,
                  background: selected === w ? "rgba(59,130,246,0.14)" : "transparent",
                  color: selected === w ? "var(--blue-br)" : "var(--muted)" }}>{w}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="t-mono-s" style={{ color: "var(--muted)" }}>// ANALOGY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ANALOGIES.map((a, i) => (
              <button key={i} onClick={() => setAnalogy(i)} className="t-mono-s"
                style={{ padding: "9px 10px", borderRadius: 4, cursor: "pointer", textAlign: "left", fontSize: 11,
                  border: `1px solid ${analogy === i ? "var(--violet-lt)" : "var(--border)"}`,
                  background: analogy === i ? "rgba(168,85,247,0.14)" : "transparent",
                  color: analogy === i ? "var(--violet-lt)" : "var(--muted)" }}>{a.label}</button>
            ))}
          </div>
          <StatReadout label="RESULT" value={"≈ " + analogyResult} accent="var(--violet-lt)" />
        </>
      )}
      <Legend items={[{ color: CAT.royal, label: "ROYALTY" }, { color: CAT.geo, label: "GEOGRAPHY" }, { color: CAT.animal, label: "ANIMALS" }, { color: CAT.food, label: "FOOD" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Embeddings turn words into vectors so that <b>distance means similarity</b>.
        In <b>Neighbors</b> mode, click any word and its nearest vectors light up —
        notice how same-category words cluster together, because the model places
        things used in similar contexts near each other.
      </DemoP>
      <DemoP>
        The surprising part is that <b>directions</b> carry meaning too. The vector
        from "man" to "king" is roughly the same as "woman" to "queen" — a
        "royalty" direction — so <i>king − man + woman</i> lands right next to
        "queen." Same trick gives capitals from countries. That's the famous word2vec
        analogy property, shown here as parallelograms. <em>This is a small hand-built
        2D space for clarity; real embeddings live in hundreds of dimensions but
        behave exactly like this.</em>
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Embeddings are the lingua franca of modern AI: every LLM begins by mapping tokens
        to vectors, and the same idea powers semantic search, recommendation,
        retrieval-augmented generation, clustering, and de-duplication. "Similar things sit
        close together" is precisely what lets a model generalize from the words (or
        images, or users) it saw to the ones it didn't.
      </DemoP>
      <DemoP>
        The directions-have-meaning property on screen (the word2vec analogies) was the
        first clear sign that learned representations capture structure, not just a lookup
        table. Today's sentence and document embeddings — and CLIP's shared image-text
        space — extend it to whole passages and modalities. Cosine similarity over these
        vectors, backed by approximate-nearest-neighbor indexes, is literally the retrieval
        step inside RAG systems and vector databases.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      topic="EMBEDDINGS"
      title="Embedding Atlas"
      subtitle="Explore the geometry of word vectors — nearest neighbors and the analogy parallelograms that make king−man+woman≈queen."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/huggingface_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<EmbeddingsDemo />);
