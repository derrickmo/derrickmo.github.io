// demos/semantic-caching.jsx — semantic (embedding) cache for LLM responses.
//
// Instead of caching responses by an EXACT string match (which almost never
// hits, because users paraphrase), a semantic cache embeds the query and serves
// a stored answer when the nearest cached query is within a cosine-similarity
// threshold. That turns many paraphrases of the same intent into one model call.
// The risk is a FALSE HIT: two queries that are close in embedding space but
// actually need different answers — you serve the stale/wrong cached response.
//
// A live stream of queries (points placed around K intent directions in a 2-D
// "embedding space") arrives; each is matched against the cache by cosine
// similarity. The threshold slides between aggressive caching (high hit rate,
// big cost savings, more false hits) and conservative (the opposite). Real
// cosine geometry; the latency/cost numbers are a stylized but honest model.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 250, CH = 220;
const CX = CW / 2, CY = CH / 2, R = 72;
const SPAWN_FRAMES = 26;        // frames between new queries
const MODEL_MS = 850, CACHE_MS = 6; // stylized latency of a model call vs a cache hit

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gauss(rand) { const u = Math.max(1e-9, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const CLUSTER_COLORS = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#a3e635"];

// vector from the embedding-space origin (canvas center)
function vec(p) { return [p.x - CX, p.y - CY]; }
function cosine(a, b) {
  const [ax, ay] = a, [bx, by] = b;
  const d = Math.hypot(ax, ay) * Math.hypot(bx, by);
  return d < 1e-9 ? 0 : (ax * bx + ay * by) / d;
}

function buildCache(K, perCluster, seed) {
  const rand = rng(seed);
  const centers = [];
  for (let i = 0; i < K; i++) centers.push((i / K) * Math.PI * 2 + 0.45);
  const cache = [];
  for (let c = 0; c < K; c++) {
    for (let j = 0; j < perCluster; j++) {
      const ang = centers[c] + gauss(rand) * 0.12;
      const rad = R + (rand() - 0.5) * 18;
      cache.push({ x: CX + Math.cos(ang) * rad, y: CY + Math.sin(ang) * rad, cluster: c });
    }
  }
  return { centers, cache };
}

function SemanticCachingDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [threshold, setThreshold] = _useState(0.92);
  const [spread, setSpread] = _useState(0.22);     // paraphrase angular spread (radians, stddev)
  const [perCluster, setPerCluster] = _useState(2);
  const [running, setRunning] = _useState(true);
  const [stats, setStats] = _useState({ total: 0, hits: 0, falseHits: 0, ms: 0 });

  const K = 6;
  // live params the rAF loop reads without restarting
  const paramsRef = _useRef({ threshold, spread });
  _useEffect(() => { paramsRef.current = { threshold, spread }; }, [threshold, spread]);

  // cache + stream state held in a ref (animation), reset when structure changes
  const stRef = _useRef(null);
  _useEffect(() => {
    const { centers, cache } = buildCache(K, perCluster, 1234 + perCluster);
    stRef.current = { centers, cache, rand: rng(99), frame: 0, active: null, recent: [], agg: { total: 0, hits: 0, falseHits: 0, ms: 0 } };
    setStats({ total: 0, hits: 0, falseHits: 0, ms: 0 });
  }, [perCluster]);

  _useEffect(() => {
    let raf;
    const ctx = cvRef.current.getContext("2d");

    const spawn = () => {
      const st = stRef.current, { spread: sp } = paramsRef.current;
      const c = Math.floor(st.rand() * K);
      const ang = st.centers[c] + gauss(st.rand) * sp;
      const rad = R + (st.rand() - 0.5) * 26;
      const q = { x: CX + Math.cos(ang) * rad, y: CY + Math.sin(ang) * rad, cluster: c };
      // nearest cached by cosine
      let best = null, bestCos = -2;
      for (const e of st.cache) { const cs = cosine(vec(q), vec(e)); if (cs > bestCos) { bestCos = cs; best = e; } }
      const hit = bestCos >= paramsRef.current.threshold;
      const correct = hit ? best.cluster === q.cluster : true; // a miss calls the model -> always correct
      const falseHit = hit && !correct;
      q.best = best; q.bestCos = bestCos; q.hit = hit; q.falseHit = falseHit;
      st.active = q;
      // aggregate
      st.agg.total++; if (hit) st.agg.hits++; if (falseHit) st.agg.falseHits++;
      st.agg.ms += hit ? CACHE_MS : MODEL_MS;
      st.recent.unshift(q); if (st.recent.length > 26) st.recent.pop();
      setStats({ ...st.agg });
    };

    const draw = () => {
      const st = stRef.current;
      ctx.clearRect(0, 0, CW, CH);
      // faint origin + threshold note
      ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
      ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(148,163,184,0.5)"; ctx.beginPath(); ctx.arc(CX, CY, 2, 0, Math.PI * 2); ctx.fill();
      // cached entries
      for (const e of st.cache) {
        ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = CLUSTER_COLORS[e.cluster]; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      }
      // recent query trail
      for (let i = st.recent.length - 1; i >= 0; i--) {
        const q = st.recent[i]; const a = 0.12 + 0.5 * (1 - i / st.recent.length);
        const col = q.falseHit ? "248,113,113" : q.hit ? "52,211,153" : "148,163,184";
        ctx.beginPath(); ctx.arc(q.x, q.y, 2.6, 0, Math.PI * 2); ctx.fillStyle = `rgba(${col},${a})`; ctx.fill();
      }
      // active query: line to nearest + marker
      const q = st.active;
      if (q) {
        const col = q.falseHit ? "#f87171" : q.hit ? "#34d399" : "#94a3b8";
        if (q.hit) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.best.x, q.best.y); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(q.x, q.y, 6.5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#e5e7eb"; ctx.font = "9px monospace"; ctx.textAlign = "center";
        ctx.fillText(q.hit ? (q.falseHit ? "false hit" : "hit") : "miss -> model", q.x, q.y - 11);
      }
    };

    const tick = () => {
      const st = stRef.current;
      if (st) {
        st.frame++;
        if (st.frame % SPAWN_FRAMES === 0) spawn();
        draw();
      }
      raf = requestAnimationFrame(tick);
    };
    if (running) raf = requestAnimationFrame(tick);
    else if (stRef.current) draw();
    return () => cancelAnimationFrame(raf);
  }, [running, perCluster]);

  const hitRate = stats.total ? stats.hits / stats.total : 0;
  const falseHitShare = stats.hits ? stats.falseHits / stats.hits : 0;
  const wrongShare = stats.total ? stats.falseHits / stats.total : 0;
  const accuracy = 1 - wrongShare;
  const costSaved = hitRate; // each hit avoids one model call
  const avgMs = stats.total ? stats.ms / stats.total : 0;
  const pct = x => (x * 100).toFixed(0) + "%";

  const reset = () => {
    if (stRef.current) { stRef.current.agg = { total: 0, hits: 0, falseHits: 0, ms: 0 }; stRef.current.recent = []; stRef.current.active = null; }
    setStats({ total: 0, hits: 0, falseHits: 0, ms: 0 });
  };

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>EMBEDDING SPACE — incoming queries vs cached entries (cosine from center)</span>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.25 : 1.6), height: CH * (mobile ? 1.25 : 1.6), borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "cache hit (correct)", color: "#34d399" },
        { label: "false hit (wrong answer)", color: "#f87171" },
        { label: "miss -> calls model", color: "#94a3b8" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// SIMILARITY THRESHOLD" min={0.6} max={0.995} step={0.005} value={threshold} onChange={setThreshold} tone="violet"
        help="Serve the cached answer only when the nearest cached query's cosine similarity is at least this. Lower = cache more aggressively (higher hit rate and cost savings, but more false hits); higher = only near-duplicates hit (safe, fewer savings)." />
      <Slider label="// PARAPHRASE SPREAD" min={0.05} max={0.6} step={0.01} value={spread} onChange={setSpread} tone="blue"
        help="How far real paraphrases of the same intent scatter in embedding space (angular noise). Wider spread means same-intent queries drift apart and toward neighbours — fewer true hits and more false hits at any threshold." />
      <Slider label="// CACHED PER INTENT" min={1} max={5} step={1} value={perCluster} onChange={setPerCluster} tone="blue"
        help="How many stored entries cover each intent. More entries = denser coverage = more queries land near a cached point and hit (warming the cache). Rebuilds the cache and resets the stats." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} tone="violet" primary>{running ? "Pause" : "Run"} stream</DemoButton>
        <DemoButton onClick={reset} tone="blue">Reset stats</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="HIT RATE" value={pct(hitRate)} accent="#34d399" />
        <StatReadout label="COST SAVED" value={pct(costSaved)} accent="#34d399" />
        <StatReadout label="WRONG ANSWERS" value={pct(wrongShare)} accent={wrongShare > 0.001 ? "#f87171" : "var(--dim)"} />
        <StatReadout label="ANSWER ACCURACY" value={(accuracy * 100).toFixed(1) + "%"} accent={accuracy > 0.98 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="AVG LATENCY" value={avgMs.toFixed(0) + " ms"} accent="var(--violet-lt)" />
        <StatReadout label="QUERIES" value={stats.total} accent="var(--dim)" />
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        of all hits, {pct(falseHitShare)} were false hits · model call ≈ {MODEL_MS}ms, cache hit ≈ {CACHE_MS}ms
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        An <b>exact-match</b> response cache almost never hits: "how do I reset my
        password" and "I forgot my password, help" are the same intent but
        different strings. A <b>semantic cache</b> embeds the query and serves a
        stored answer when the nearest cached query is within a cosine-similarity
        threshold — collapsing all the paraphrases of one intent into a single
        model call. Every green dot here is a model call you didn't pay for.
      </DemoP>
      <DemoP>
        The threshold is the whole tradeoff. Drop it and the hit rate (and cost
        savings) climbs — but queries start matching cached entries from a{" "}
        <i>different</i> intent, and you serve a confidently wrong cached answer:
        a <b>false hit</b> (red). Raise it and false hits vanish, but so do the
        savings as only near-duplicates qualify. Widen the <b>paraphrase spread</b>{" "}
        and the same threshold gets worse on both axes, because real intents now
        overlap in embedding space.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Semantic caching (GPTCache and the caching layers in most LLM gateways) is
        one of the cheapest wins in LLM serving: a large fraction of production
        traffic is near-duplicate questions, and a hit is ~100× faster and free.
        It rests directly on{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/embeddings/`} style={{ color: "#a855f7" }}>embeddings</a>{" "}
        and approximate{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/vector-search/`} style={{ color: "#a855f7" }}>vector
        search</a> — the cache is just a vector index of past queries — so the
        embedding model's quality sets the ceiling on how cleanly intents separate.
      </DemoP>
      <DemoP>
        The danger is the false hit: a stale or wrong answer served with full
        confidence, which is why production caches add eviction/TTL, per-namespace
        keys, and sometimes a cheap verifier on the retrieved answer. It's the same
        precision/recall dial as the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/guardrails/`} style={{ color: "#a855f7" }}>guardrail</a>{" "}
        detectors and the cost/quality routing of a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/model-cascade/`} style={{ color: "#a855f7" }}>model
        cascade</a> — tuned here for "is this the same question?" instead of "is
        this safe?".
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Semantic Caching"
      subtitle="Cache LLM answers by embedding similarity, not exact text. Slide the threshold between big cost savings and serving a confidently wrong cached answer."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SemanticCachingDemo />);
