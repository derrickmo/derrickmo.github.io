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
const { useState: _useState, useEffect: _useEffect } = React;

// "Part of these learning paths" — lazy-load paths.js, then list paths that
// include this concept as a step.
function PathsForConcept() {
  const [, setTick] = _useState(0);
  _useEffect(() => {
    if (window.LEARNING_PATHS) return;
    if (document.querySelector("script[data-dm-paths]")) return;
    const s = document.createElement("script");
    s.type = "module"; s.src = BASE + "paths.js"; s.setAttribute("data-dm-paths", "1");
    s.onload = () => setTick(t => t + 1);
    document.body.appendChild(s);
  }, []);
  const list = (window.DM_PATHS_FOR && C) ? window.DM_PATHS_FOR("concept", C.id) : [];
  if (!list.length) return null;
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 40 }}>
      <Container style={{ maxWidth: 860 }}>
        <MonoLabel color="var(--violet-lt)">// PART OF THESE LEARNING PATHS</MonoLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {list.map(p => {
            const a = p.accent === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
            const bg = p.accent === "violet" ? "rgba(168,85,247,0.08)" : "rgba(96,165,250,0.08)";
            return (
              <a key={p.id} href={BASE + "paths/" + p.id + "/"} className="t-mono-s"
                style={{ textDecoration: "none", color: a, border: `1px solid ${a}`, background: bg, borderRadius: 999, padding: "6px 13px" }}>
                {p.title} →
              </a>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

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
        {C.animation && (
          <div style={{
            marginTop: 28, position: "relative", overflow: "hidden",
            border: "1px solid var(--border-violet)", borderRadius: 8,
            background: "rgba(5, 8, 22, 0.55)",
          }}>
            <HudBrackets mode="dark" inset={8} size={16} />
            <div style={{ padding: "12px 18px 8px", borderBottom: "1px solid var(--border)" }}>
              <MonoLabel color="var(--violet-lt)">// CONCEPT · IN MOTION</MonoLabel>
            </div>
            <iframe src={`${BASE}${C.animation}`} title={`${C.name} animation`}
              loading="lazy"
              style={{ width: "100%", height: 420, border: 0, display: "block", background: "transparent" }} />
          </div>
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

// "How to get here" — the generated prerequisite ladder.
//
// Every one of these 188 pages was a leaf: it told you what a concept builds on
// (one hop) but never how to actually reach it from where you are. This walks the
// full prerequisite closure in teaching order, so the page answers "what do I need
// first?" rather than "what is adjacent?".
//
// Marking a step known prunes its whole subtree, not just its row, which is what
// takes a ten-step path down to three rather than to a shorter list of the same wall.
function PrereqLadder() {
  const P = window.DM_CONCEPT_PATH, K = window.DM_KNOWN;
  const [, bump] = _useState(0);
  if (!P || !K || !C) return null;

  const full = P.pathTo(C.id).steps;
  // A root concept has no prerequisites, and a one-step "path" to itself says
  // nothing. That is correct for chain-rule or linear-regression, not a gap.
  if (full.length <= 1) return null;

  const known = K.setObj();
  const path = P.pathTo(C.id, known).steps;
  const remaining = path.filter((id) => id !== C.id);
  const skipped = full.length - path.length;

  return (
    <Section style={{ paddingTop: 8, paddingBottom: 34 }}>
      <Container style={{ maxWidth: 860 }}>
        <MonoLabel color="var(--violet-lt)">// HOW TO GET HERE</MonoLabel>
        <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "10px 0 16px" }}>
          {remaining.length === 0
            ? `You have marked every prerequisite known — ${C.name} is the next thing to learn.`
            : `${remaining.length} concept${remaining.length === 1 ? "" : "s"} come first, in this order.`}
          {skipped > 0 && <span style={{ color: "var(--dim)" }}> {skipped} already known and hidden.</span>}
          {" "}Derived from the concept graph, not hand-written.
        </div>

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {path.map((id, i) => {
            const node = INDEX[id];
            if (!node) return null;
            const isTarget = id === C.id;
            const s = P.surfacesFor(id);
            return (
              <li key={id} style={{
                display: "flex", alignItems: "baseline", gap: 12, padding: "10px 13px",
                border: `1px solid ${isTarget ? "rgba(168,85,247,0.55)" : "var(--border)"}`,
                borderRadius: 6, background: isTarget ? "rgba(168,85,247,0.09)" : "rgba(13,24,52,0.3)",
              }}>
                <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, minWidth: 20 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {isTarget
                    ? <span className="t-body" style={{ color: "var(--white)", fontSize: 15.5 }}>{node.name} <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10 }}>YOU ARE HERE</span></span>
                    : <a href={`${BASE}concepts/${id}/`} className="t-body" style={{ color: "var(--white)", fontSize: 15.5, textDecoration: "none", borderBottom: "1px solid rgba(148,163,184,0.3)" }}>{node.name}</a>}
                  {s.demos.length > 0 && (
                    <a href={`${BASE}visualize/${s.demos[0]}/`} className="t-mono-s"
                      style={{ color: "var(--blue-lt)", textDecoration: "none", marginLeft: 12, fontSize: 10 }}>PLAY →</a>
                  )}
                </span>
                {!isTarget && (
                  <button type="button" onClick={() => { K.set(id, true); bump((n) => n + 1); }}
                    className="t-mono-s" title={`Hide ${node.name} and everything it depends on`}
                    style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", cursor: "pointer", padding: "4px 9px", fontSize: 10 }}>
                    I KNOW THIS
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        {skipped > 0 && (
          <button type="button" onClick={() => { K.clear(); bump((n) => n + 1); }} className="t-mono-s"
            style={{ marginTop: 12, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", cursor: "pointer", padding: "7px 13px" }}>
            SHOW ALL {full.length} STEPS AGAIN
          </button>
        )}
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
  if (!C) return (<><TopNav />
      <main id="main" tabIndex={-1}><NotFound /></main>
      <Footer /></>);
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <Hero />
      <PrereqStrip />
      <PrereqLadder />
      <Surfaces />
      <PathsForConcept />
      <Refs />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
