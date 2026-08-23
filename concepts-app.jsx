// concepts-app.jsx — the /concepts/ hub. Lists every entry in
// window.CONCEPTS_INDEX grouped by area, each linking to its hub page.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  TeX,
} = window;

const BASE = window.__DM_BASE || "../";
const INDEX = window.CONCEPTS_INDEX || {};
const TAGS = window.CONCEPT_TAGS || {};
const REV = window.CONCEPT_REVERSE || {};

function countSurfaces(id) {
  const hits = REV[id] || [];
  return hits.length;
}

function byArea() {
  // Roughly the order the curriculum teaches in. Anything not listed still renders,
  // appended at the end — see the loop below.
  const order = [
    "Optimization", "Probability & Bayes", "Information Theory", "Algorithms",
    "Classical ML", "Evaluation & Calibration", "Causal Inference", "Data-Centric",
    "Neural Networks", "Computer Vision", "Signal", "NLP", "Transformers",
    "Generative", "Fine-Tuning", "Training Systems", "Trustworthy ML",
    "Reinforcement Learning", "Game AI", "Retrieval", "Graphs", "Time Series",
  ];
  const groups = {};
  for (const id of Object.keys(INDEX)) {
    const c = INDEX[id];
    const a = c.area || "Other";
    (groups[a] || (groups[a] = [])).push(c);
  }
  const ordered = [];
  for (const a of order) if (groups[a]) ordered.push([a, groups[a]]);
  for (const a of Object.keys(groups)) if (!order.includes(a)) ordered.push([a, groups[a]]);
  return ordered;
}

function Hero() {
  const total = Object.keys(INDEX).length;
  return (
    <Section id="top" padded={false} style={{ paddingTop: 140, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-10%"} opacity={0.22} />
      <GlowBlob color="blue" size={480} x={"75%"} y={"30%"} opacity={0.20} />
      <MathWatermarks mode="dark" count={6} opacity={0.05} seed={7} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container>
        <MonoLabel color="var(--violet-lt)">// THE CONCEPT GRAPH</MonoLabel>
        <h1 style={{
          fontFamily: "var(--f-display)", fontWeight: 700,
          fontSize: "clamp(36px, 4.8vw, 60px)", letterSpacing: "-0.025em",
          lineHeight: 1.02, margin: "12px 0 0", color: "var(--white)",
        }}>
          One canonical place per idea.
        </h1>
        <p className="t-body" style={{ color: "var(--muted)", maxWidth: 720, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>
          {total} core ML/DL concepts, each with its equation, where it sits in the curriculum, and every interactive demo, game, lesson, and animation on this site that touches it. Lessons, animations, demos, and games linked together as one graph.
        </p>
        <a href={`${BASE}concept-map/`} style={{
          display: "inline-flex", alignItems: "center", gap: 9, marginTop: 22, textDecoration: "none",
          border: "1px solid var(--border-violet)", borderRadius: 8, padding: "11px 18px",
          background: "linear-gradient(120deg, rgba(168,85,247,0.12) 0%, rgba(59,130,246,0.07) 100%)",
          color: "var(--white)", fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.04em",
        }}>
          <span style={{ color: "var(--violet-lt)" }}>◉</span> EXPLORE THE INTERACTIVE MAP →
        </a>
      </Container>
    </Section>
  );
}

function ConceptCard({ c }) {
  const n = countSurfaces(c.id);
  return (
    <a href={`${BASE}concepts/${c.id}/`} style={{
      position: "relative", overflow: "hidden",
      padding: "20px 22px", border: "1px solid var(--border)", borderRadius: 6,
      background: "rgba(13, 24, 52, 0.45)", textDecoration: "none", color: "inherit",
      display: "flex", flexDirection: "column", gap: 10, minHeight: 130,
      transition: "border-color .2s, transform .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue-lt)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <HudBrackets mode="dark" inset={6} size={12} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18, color: "var(--white)", letterSpacing: "-0.01em", lineHeight: 1.15 }}>{c.name}</span>
        {n > 0 && <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10, whiteSpace: "nowrap" }}>{n} LINK{n === 1 ? "" : "S"}</span>}
      </div>
      <p className="t-body" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{c.summary}</p>
      {c.tex && TeX && (
        <div style={{ marginTop: "auto", paddingTop: 6, opacity: 0.85, overflow: "hidden" }}>
          <TeX>{c.tex}</TeX>
        </div>
      )}
    </a>
  );
}

function Groups() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 60 }}>
      <Container>
        {byArea().map(([area, items]) => (
          <div key={area} style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
              <MonoLabel color="var(--blue-lt)">// {area.toUpperCase()}</MonoLabel>
              <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>{items.length} concepts</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
              {items.map(c => <ConceptCard key={c.id} c={c} />)}
            </div>
          </div>
        ))}
      </Container>
    </Section>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <Hero />
      <Groups />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
