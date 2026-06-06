// concept-map-app.jsx — interactive force-directed map of the concept DAG.
// Nodes = window.CONCEPTS_INDEX entries; directed edges = prereq -> concept.
// Colored by area; hover/click a node for a side panel of prereqs, what it leads
// to, and every demo/module/game that touches it (window.CONCEPT_REVERSE).
// A "highlight a path" selector lights up a learning path's route through the DAG
// (window.LEARNING_PATHS + window.CONCEPT_TAGS) — the Stage-4 paths<->map tie-in.

const {
  HudBrackets, GridOverlay, GlowBlob,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;
const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;

const AREA_COLORS = {
  "Foundations": "#3b82f6", "NLP": "#a855f7", "Classical ML": "#22d3ee",
  "Reinforcement Learning": "#f59e0b", "Training Systems": "#ec4899",
  "Computer Vision": "#34d399", "Transformers": "#c084fc", "Signal": "#2dd4bf",
  "Neural Networks": "#60a5fa", "Graphs": "#fb7185", "Generative": "#f472b6",
  "Game AI": "#fbbf24", "Time Series": "#818cf8", "Retrieval": "#4ade80",
  "Fine-Tuning": "#e879f9", "Applications": "#94a3b8",
};
const areaColor = a => AREA_COLORS[a] || "#94a3b8";
const BASE = () => window.__DM_BASE || "../";

// concept ids that a path step touches (concept step = itself; others via tags)
function stepConcepts(step) {
  if (step.kind === "concept") return [step.ref];
  const tags = window.CONCEPT_TAGS || {};
  if (step.kind === "demo") return tags.demos && tags.demos[step.ref] || [];
  if (step.kind === "module") return tags.modules && tags.modules[step.ref] || [];
  if (step.kind === "game") return tags.games && tags.games[step.ref] || [];
  if (step.kind === "hf") return tags.hf && tags.hf[step.ref] || [];
  return [];
}
function pathConceptList(p) {
  const seen = new Set(), out = [];
  for (const st of p.stages) for (const step of st.steps)
    for (const id of stepConcepts(step))
      if ((window.CONCEPTS_INDEX || {})[id] && !seen.has(id)) { seen.add(id); out.push(id); }
  return out;
}

function reverseHref(kind, slug) {
  const b = BASE();
  if (kind === "demo") return b + "visualize/" + slug + "/";
  if (kind === "module") return b + "learn/" + slug + "/";
  if (kind === "game") return b + "play/" + slug + "/";
  if (kind === "hf") return b + "learn/huggingface/" + slug + "/";
  return "#";
}
function reverseLabel(kind, slug) {
  if (kind === "demo") { const d = ((window.PLAY_DEMOS && window.PLAY_DEMOS.demos) || []).find(x => x.slug === slug); return d ? d.title : slug; }
  if (kind === "module") { const m = ((window.CURRICULUM && window.CURRICULUM.modules) || []).find(x => x.slug === slug); return m ? m.title : slug; }
  if (kind === "game") { const g = ((window.PLAY_GAMES && window.PLAY_GAMES.games) || []).find(x => x.slug === slug); return g ? g.title : slug; }
  return slug;
}

function SidePanel({ id, onPick, onClose }) {
  const idx = window.CONCEPTS_INDEX || {};
  const c = idx[id];
  if (!c) return null;
  const col = areaColor(c.area);
  const leadsTo = (c.leadsTo || []).filter(x => idx[x]);
  const prereqs = (c.prereqs || []).filter(x => idx[x]);
  const surfaces = (window.CONCEPT_REVERSE || {})[id] || [];
  const Chip = ({ cid }) => (
    <button onClick={() => onPick(cid)} style={{
      cursor: "pointer", border: `1px solid ${areaColor(idx[cid].area)}55`, background: "rgba(13,24,52,0.5)",
      color: "var(--white)", borderRadius: 20, padding: "4px 11px", fontFamily: "var(--f-mono)", fontSize: 11,
    }}>{idx[cid].name}</button>
  );
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 14, padding: "20px 20px 24px",
      borderLeft: "1px solid var(--border)", background: "rgba(8,15,35,0.6)", overflowY: "auto", height: "100%", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <span className="t-mono-s" style={{ color: col, fontSize: 10 }}>// {c.area.toUpperCase()}</span>
          <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 22, color: "var(--white)", margin: "6px 0 0", letterSpacing: "-0.01em" }}>{c.name}</h3>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ cursor: "pointer", background: "none", border: "none", color: "var(--muted)", fontSize: 20, lineHeight: 1, padding: 2 }}>×</button>
      </div>
      <p className="t-body" style={{ color: "var(--soft)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.summary}</p>
      {c.tex && <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--muted)", background: "rgba(13,24,52,0.5)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", overflowX: "auto" }}>{c.tex}</div>}
      {prereqs.length > 0 && (
        <div><div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, marginBottom: 8 }}>// BUILDS ON</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{prereqs.map(x => <Chip key={x} cid={x} />)}</div></div>
      )}
      {leadsTo.length > 0 && (
        <div><div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, marginBottom: 8 }}>// LEADS TO</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{leadsTo.map(x => <Chip key={x} cid={x} />)}</div></div>
      )}
      {surfaces.length > 0 && (
        <div><div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, marginBottom: 8 }}>// EXPLORE IT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {surfaces.map((s, i) => (
              <a key={i} href={reverseHref(s.kind, s.slug)} style={{
                display: "flex", justifyContent: "space-between", gap: 10, textDecoration: "none",
                border: "1px solid var(--border)", borderRadius: 6, padding: "8px 11px", background: "rgba(13,24,52,0.35)",
              }}>
                <span style={{ color: "var(--white)", fontSize: 13 }}>{reverseLabel(s.kind, s.slug)}</span>
                <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>{s.kind.toUpperCase()}</span>
              </a>
            ))}
          </div></div>
      )}
      <a href={BASE() + "concepts/" + id + "/"} style={{
        marginTop: 4, textAlign: "center", textDecoration: "none", border: `1px solid ${col}`, borderRadius: 6,
        padding: "9px 12px", color: col, fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.05em",
      }}>OPEN CONCEPT PAGE →</a>
    </div>
  );
}

function ConceptMap() {
  const mobile = useIsMobile();
  const wrapRef = _useRef(null), canvasRef = _useRef(null);
  const nodesRef = _useRef([]), edgesRef = _useRef([]), adjRef = _useRef({});
  const tfRef = _useRef({ x: 0, y: 0, k: 1 });
  const dragRef = _useRef(null), panRef = _useRef(null), hoverRef = _useRef(null);
  const coolRef = _useRef(1), rafRef = _useRef(0), movedRef = _useRef(false);
  const viewRef = _useRef({ filterArea: null, query: "", pathSet: null, selected: null });

  const [selected, setSelected] = _useState(null);
  const [filterArea, setFilterArea] = _useState(null);
  const [query, setQuery] = _useState("");
  const [pathId, setPathId] = _useState("");

  const paths = window.LEARNING_PATHS || [];

  // keep the draw loop's view params current without restarting the RAF
  _useEffect(() => {
    let pathSet = null;
    if (pathId) { const p = paths.find(x => x.id === pathId); if (p) pathSet = new Set(pathConceptList(p)); }
    viewRef.current = { filterArea, query: query.trim().toLowerCase(), pathSet, selected };
  }, [filterArea, query, pathId, selected]);

  // build graph + run the simulation once
  _useEffect(() => {
    const idx = window.CONCEPTS_INDEX || {};
    const ids = Object.keys(idx);
    const R = 360;
    const nodes = ids.map((id, i) => {
      const ang = i * 2.399963, rad = R * Math.sqrt((i + 0.5) / ids.length);
      return { id, name: idx[id].name, area: idx[id].area, deg: 0,
        x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, vx: 0, vy: 0, fx: 0, fy: 0 };
    });
    const byId = {}; nodes.forEach(n => byId[n.id] = n);
    const edges = [], adj = {}; ids.forEach(id => adj[id] = new Set());
    for (const id of ids) for (const p of (idx[id].prereqs || [])) {
      if (byId[p]) { edges.push({ s: byId[p], t: byId[id] }); byId[p].deg++; byId[id].deg++; adj[id].add(p); adj[p].add(id); }
    }
    nodesRef.current = nodes; edgesRef.current = edges; adjRef.current = adj;

    const cv = canvasRef.current, ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const w = wrapRef.current.clientWidth, h = wrapRef.current.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px";
      if (tfRef.current.x === 0 && tfRef.current.y === 0) { tfRef.current.x = w / 2; tfRef.current.y = h / 2; }
    }
    resize();
    window.addEventListener("resize", resize);

    function step() {
      const ns = nodesRef.current, es = edgesRef.current, n = ns.length;
      const REP = 5200, L = 78, SPR = 0.035, GRAV = 0.018, DAMP = 0.8, cool = coolRef.current;
      for (const nd of ns) { nd.fx = 0; nd.fy = 0; }
      for (let i = 0; i < n; i++) { const a = ns[i];
        for (let j = i + 1; j < n; j++) { const b = ns[j];
          let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.01; }
          const d = Math.sqrt(d2), f = REP / d2, ux = dx / d, uy = dy / d;
          a.fx += ux * f; a.fy += uy * f; b.fx -= ux * f; b.fy -= uy * f;
        }
      }
      for (const e of es) { const a = e.s, b = e.t;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - L) * SPR, ux = dx / d, uy = dy / d;
        a.fx += ux * f; a.fy += uy * f; b.fx -= ux * f; b.fy -= uy * f;
      }
      for (const nd of ns) { nd.fx -= nd.x * GRAV; nd.fy -= nd.y * GRAV; }
      for (const nd of ns) {
        if (nd === dragRef.current) continue;
        nd.vx = (nd.vx + nd.fx) * DAMP; nd.vy = (nd.vy + nd.fy) * DAMP;
        const sp = Math.hypot(nd.vx, nd.vy); if (sp > 40) { nd.vx = nd.vx / sp * 40; nd.vy = nd.vy / sp * 40; }
        nd.x += nd.vx * cool; nd.y += nd.vy * cool;
      }
      coolRef.current = Math.max(0.03, cool * 0.99);
    }

    function highlightSet(view) {
      if (view.pathSet) return view.pathSet;
      const focus = view.selected || hoverRef.current;
      if (!focus) return null;
      const s = new Set([focus]); (adjRef.current[focus] || []).forEach(x => s.add(x)); return s;
    }

    function draw() {
      const view = viewRef.current, tf = tfRef.current;
      const w = cv.width, h = cv.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const sx = nd => nd.x * tf.k + tf.x, sy = nd => nd.y * tf.k + tf.y;
      const hi = highlightSet(view);
      const q = view.query;
      const visible = nd => !view.filterArea || nd.area === view.filterArea;
      const lit = nd => {
        if (q && !nd.name.toLowerCase().includes(q)) return false;
        if (hi && !hi.has(nd.id)) return false;
        return visible(nd);
      };
      // edges
      for (const e of edgesRef.current) {
        const on = lit(e.s) && lit(e.t);
        const dim = (hi || q || view.filterArea) && !on;
        ctx.strokeStyle = on ? "rgba(168,185,230,0.5)" : dim ? "rgba(120,140,180,0.05)" : "rgba(120,140,180,0.14)";
        ctx.lineWidth = on ? 1.4 : 1;
        ctx.beginPath(); ctx.moveTo(sx(e.s), sy(e.s)); ctx.lineTo(sx(e.t), sy(e.t)); ctx.stroke();
      }
      // nodes
      const sel = view.selected;
      for (const nd of nodesRef.current) {
        const X = sx(nd), Y = sy(nd), r = (4 + Math.min(nd.deg, 12) * 0.7) * Math.max(0.8, Math.min(tf.k, 1.6));
        const isLit = lit(nd), faded = (hi || q || view.filterArea) && !isLit;
        ctx.globalAlpha = faded ? 0.18 : 1;
        ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.2832);
        ctx.fillStyle = areaColor(nd.area); ctx.fill();
        if (nd.id === sel || nd === hoverRef.current) { ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff"; ctx.stroke(); }
        else if (isLit && hi) { ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.stroke(); }
        const showLabel = nd.id === sel || nd === hoverRef.current || (isLit && (hi || q)) || tf.k > 1.45;
        if (showLabel) {
          ctx.globalAlpha = faded ? 0.25 : 1;
          ctx.font = "11px 'JetBrains Mono', monospace";
          ctx.fillStyle = "rgba(226,232,240,0.92)"; ctx.textAlign = "center";
          ctx.fillText(nd.name, X, Y + r + 12);
        }
        ctx.globalAlpha = 1;
      }
    }

    function loop() { if (coolRef.current > 0.031 || dragRef.current) step(); draw(); rafRef.current = requestAnimationFrame(loop); }
    loop();

    // ── interaction ──
    const worldAt = (cx, cy) => ({ x: (cx - tfRef.current.x) / tfRef.current.k, y: (cy - tfRef.current.y) / tfRef.current.k });
    const pickNode = (cx, cy) => {
      const tf = tfRef.current; let best = null, bd = 1e9;
      for (const nd of nodesRef.current) {
        if (viewRef.current.filterArea && nd.area !== viewRef.current.filterArea) continue;
        const X = nd.x * tf.k + tf.x, Y = nd.y * tf.k + tf.y, d = Math.hypot(cx - X, cy - Y);
        const r = (4 + Math.min(nd.deg, 12) * 0.7) * Math.max(0.8, Math.min(tf.k, 1.6)) + 5;
        if (d < r && d < bd) { bd = d; best = nd; }
      }
      return best;
    };
    const rel = ev => { const b = cv.getBoundingClientRect(); return { x: ev.clientX - b.left, y: ev.clientY - b.top }; };

    function onDown(ev) {
      const { x, y } = rel(ev); movedRef.current = false;
      const nd = pickNode(x, y);
      if (nd) { dragRef.current = nd; coolRef.current = Math.max(coolRef.current, 0.18); }
      else { panRef.current = { x, y, tx: tfRef.current.x, ty: tfRef.current.y }; }
      cv.setPointerCapture(ev.pointerId);
    }
    function onMove(ev) {
      const { x, y } = rel(ev);
      if (dragRef.current) { const wp = worldAt(x, y); dragRef.current.x = wp.x; dragRef.current.y = wp.y; dragRef.current.vx = 0; dragRef.current.vy = 0; movedRef.current = true; return; }
      if (panRef.current) { const p = panRef.current; tfRef.current.x = p.tx + (x - p.x); tfRef.current.y = p.ty + (y - p.y); if (Math.hypot(x - p.x, y - p.y) > 3) movedRef.current = true; return; }
      const nd = pickNode(x, y);
      if (nd !== hoverRef.current) { hoverRef.current = nd; cv.style.cursor = nd ? "pointer" : "grab"; }
    }
    function onUp(ev) {
      const { x, y } = rel(ev);
      if (!movedRef.current) { const nd = pickNode(x, y); setSelected(nd ? nd.id : null); }
      dragRef.current = null; panRef.current = null;
      try { cv.releasePointerCapture(ev.pointerId); } catch (e) {}
    }
    function onWheel(ev) {
      ev.preventDefault();
      const { x, y } = rel(ev), tf = tfRef.current;
      const factor = Math.exp(-ev.deltaY * 0.0012), nk = Math.max(0.35, Math.min(3.5, tf.k * factor));
      tf.x = x - (x - tf.x) * (nk / tf.k); tf.y = y - (y - tf.y) * (nk / tf.k); tf.k = nk;
    }
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.style.cursor = "grab";

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp); cv.removeEventListener("wheel", onWheel);
    };
  }, []);

  // re-center + nudge the sim when a path is highlighted so its route reads clearly
  _useEffect(() => { if (pathId) coolRef.current = Math.max(coolRef.current, 0.12); }, [pathId]);

  const areas = Object.keys(AREA_COLORS).filter(a => (window.CONCEPTS_INDEX ? Object.values(window.CONCEPTS_INDEX).some(c => c.area === a) : true));
  const panelW = mobile ? "100%" : 340;

  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "rgba(5,10,25,0.5)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* toolbar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search concepts..." aria-label="Search concepts" style={{
            flex: "1 1 160px", minWidth: 120, background: "rgba(13,24,52,0.6)", border: "1px solid var(--border)", borderRadius: 6,
            color: "var(--white)", padding: "8px 11px", fontFamily: "var(--f-body)", fontSize: 13, outline: "none",
          }} />
          <select value={pathId} onChange={e => setPathId(e.target.value)} aria-label="Highlight a learning path" style={{
            background: "rgba(13,24,52,0.6)", border: "1px solid var(--border-violet)", borderRadius: 6, color: "var(--white)",
            padding: "8px 11px", fontFamily: "var(--f-mono)", fontSize: 12, outline: "none", cursor: "pointer",
          }}>
            <option value="">Highlight a path…</option>
            {paths.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        {/* area legend / filter */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setFilterArea(null)} style={{
            cursor: "pointer", borderRadius: 20, padding: "3px 10px", fontFamily: "var(--f-mono)", fontSize: 10,
            border: `1px solid ${filterArea === null ? "var(--white)" : "var(--border)"}`, background: "transparent", color: filterArea === null ? "var(--white)" : "var(--muted)",
          }}>ALL</button>
          {areas.map(a => (
            <button key={a} onClick={() => setFilterArea(filterArea === a ? null : a)} style={{
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 20, padding: "3px 10px",
              fontFamily: "var(--f-mono)", fontSize: 10, background: "transparent", color: filterArea === a ? "var(--white)" : "var(--muted)",
              border: `1px solid ${filterArea === a ? areaColor(a) : "var(--border)"}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: areaColor(a), display: "inline-block" }} />{a}
            </button>
          ))}
        </div>
        {/* canvas */}
        <div ref={wrapRef} style={{ position: "relative", width: "100%", height: mobile ? 420 : 600 }}>
          <canvas ref={canvasRef} style={{ display: "block", touchAction: "none" }} />
          <div className="t-mono-s" style={{ position: "absolute", left: 12, bottom: 10, color: "var(--dim)", fontSize: 9, pointerEvents: "none" }}>
            DRAG to pan · SCROLL to zoom · CLICK a node
          </div>
        </div>
      </div>
      {/* side panel */}
      <div style={{ width: panelW, flexShrink: 0, borderTop: mobile ? "1px solid var(--border)" : "none" }}>
        {selected
          ? <SidePanel id={selected} onPick={setSelected} onClose={() => setSelected(null)} />
          : <div style={{ padding: "24px 20px", color: "var(--muted)", height: "100%", boxSizing: "border-box" }}>
              <MonoLabel color="var(--violet-lt)">// THE MAP</MonoLabel>
              <p className="t-body" style={{ fontSize: 14, lineHeight: 1.65, marginTop: 12 }}>
                Every concept on the site, wired to its prerequisites. Each dot is an idea; each line runs from a concept to the one it builds into.
              </p>
              <p className="t-body" style={{ fontSize: 14, lineHeight: 1.65 }}>
                Click any node to see what it builds on, where it leads, and every demo and lesson that touches it. Pick a learning path above to light up its route through the graph.
              </p>
            </div>}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 150, paddingBottom: 36, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.22} />
      <GlowBlob color="blue" size={460} x={"75%"} y={"30%"} opacity={0.2} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container>
        <div style={{ maxWidth: 760, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 6, bottom: 6, width: 3, background: "linear-gradient(to bottom, #a855f7, #3b82f6)", boxShadow: "0 0 16px rgba(168,85,247,0.5)" }} />
          <MonoLabel>// CONCEPT MAP</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(38px, 5vw, 66px)", letterSpacing: "-0.025em",
            lineHeight: 1.0, margin: "14px 0 0",
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>The whole graph, at once.</h1>
          <p className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 17, lineHeight: 1.6, marginTop: 16 }}>
            An interactive map of every concept on the site and how they connect — prerequisites flowing into the ideas they unlock. Explore it freely, or trace a learning path through it.
          </p>
        </div>
      </Container>
    </Section>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <Hero />
      <Section style={{ paddingTop: 8, paddingBottom: 90 }}>
        <Container>
          <ConceptMap />
        </Container>
      </Section>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
