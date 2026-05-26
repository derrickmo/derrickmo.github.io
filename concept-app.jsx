// concept-app.jsx — single concept hub page at /concepts/<id>/.
// Reads window.__DM_CONCEPT_ID. Renders: name, area, summary, equation
// (KaTeX), prereqs / leadsTo links, and a Connections panel listing every
// demo, game, lesson, and HF section that covers this concept.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  TeX, Connections,
} = window;

const BASE = window.__DM_BASE || "../../";
const INDEX = window.CONCEPTS_INDEX || {};
const C = INDEX[window.__DM_CONCEPT_ID] || null;

function NotFound() {
  return (
    <Section padded={false} style={{ paddingTop: 200 }}>
      <Container>
        <MonoLabel color="var(--violet-lt)">// ERROR · CONCEPT NOT FOUND</MonoLabel>
        <h1 style={{ color: "var(--white)", fontFamily: "var(--f-display)", fontSize: 48, marginTop: 12 }}>Concept not found.</h1>
        <p style={{ color: "var(--muted)" }}>
          No entry for <code>{window.__DM_CONCEPT_ID}</code> in concepts-index.js.
          {' '}<a href={`${BASE}concepts/`} style={{ color: "var(--blue-lt)" }}>Back to concept hub →</a>
        </p>
      </Container>
    </Section>
  );
}

function Chip({ href, label }) {
  return (
    <a href={href} className="t-mono-s" style={{
      padding: "6px 11px", borderRadius: 999, border: "1px solid var(--border)",
      color: "var(--blue-lt)", background: "rgba(13,24,52,0.5)",
      textDecoration: "none", fontSize: 11, letterSpacing: "0.06em",
    }}>{label}</a>
  );
}

function Hero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 140, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.22} />
      <GlowBlob color="blue" size={480} x={"65%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={(C.id.length + 11) * 3} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <a href={`${BASE}concepts/`} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← CONCEPTS</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel color="var(--blue-lt)">{(C.area || "CONCEPT").toUpperCase()}</MonoLabel>
        </div>
        <h1 style={{
          fontFamily: "var(--f-display)", fontWeight: 700,
          fontSize: "clamp(36px, 4.8vw, 60px)", letterSpacing: "-0.025em",
          lineHeight: 1.02, margin: 0, color: "var(--white)",
        }}>{C.name}</h1>
        {C.summary && (
          <p className="t-body" style={{ color: "var(--muted)", maxWidth: 720, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>
            {C.summary}
          </p>
        )}
        {C.tex && TeX && (
          <div style={{
            marginTop: 28, padding: "22px 24px",
            border: "1px solid var(--border-violet)", borderRadius: 8,
            background: "linear-gradient(120deg, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.06) 100%)",
            position: "relative", overflow: "hidden",
          }}>
            <HudBrackets mode="dark" inset={6} size={14} />
            <MonoLabel color="var(--violet-lt)">// THE EQUATION</MonoLabel>
            <div style={{ marginTop: 12, fontSize: 22 }}>
              <TeX display>{C.tex}</TeX>
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}

function PrereqStrip() {
  const pre = (C.prereqs || []).map(id => INDEX[id]).filter(Boolean);
  const next = (C.leadsTo || []).map(id => INDEX[id]).filter(Boolean);
  if (!pre.length && !next.length) return null;
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 24 }}>
      <Container style={{ maxWidth: 860 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pre.length > 0 && (
            <div>
              <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em" }}>BUILDS ON</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {pre.map(p => <Chip key={p.id} href={`${BASE}concepts/${p.id}/`} label={p.name} />)}
              </div>
            </div>
          )}
          {next.length > 0 && (
            <div>
              <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em" }}>LEADS TO</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {next.map(p => <Chip key={p.id} href={`${BASE}concepts/${p.id}/`} label={p.name} />)}
              </div>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}

function Surfaces() {
  if (!Connections) return null;
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 60 }}>
      <Container style={{ maxWidth: 860 }}>
        <Connections ids={[C.id]} />
      </Container>
    </Section>
  );
}

function Refs() {
  if (!C.refs || !C.refs.length) return null;
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 60 }}>
      <Container style={{ maxWidth: 860 }}>
        <MonoLabel color="var(--blue-lt)">// REFERENCES</MonoLabel>
        <ul style={{ marginTop: 12, paddingLeft: 18, color: "var(--white)", opacity: 0.9, fontSize: 15, lineHeight: 1.7 }}>
          {C.refs.map((r, i) => (
            <li key={i}><a href={r.href} target="_blank" rel="noopener" style={{ color: "var(--blue-lt)" }}>{r.label}</a></li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

function App() {
  if (!C) return (<><TopNav /><NotFound /><Footer /></>);
  return (
    <>
      <TopNav />
      <Hero />
      <PrereqStrip />
      <Surfaces />
      <Refs />
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
