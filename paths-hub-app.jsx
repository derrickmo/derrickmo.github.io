// paths-hub-app.jsx — the /paths/ hub. Grid of learning-path cards with
// localStorage progress rings. Data from window.LEARNING_PATHS (paths.js).

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;
const { useState: _useState } = React;

const ACCENT = a => (a === "violet" ? "var(--violet-lt)" : "var(--blue-lt)");
const LEVEL_COLOR = { Beginner: "#34d399", Intermediate: "#fbbf24", Advanced: "#c084fc" };

function Ring({ pct, size = 44, accent }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, off = c * (1 - pct);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
    </svg>
  );
}

function PathCard({ p }) {
  const accent = ACCENT(p.accent);
  const border = p.accent === "violet" ? "var(--border-violet)" : "var(--border)";
  const total = window.DM_PATH_TOTAL(p);
  const done = (window.DM_PATHS ? window.DM_PATHS.doneCount(p.id) : 0);
  const pct = total ? done / total : 0;
  const started = done > 0;
  return (
    <a href={p.id + "/"} style={{
      position: "relative", overflow: "hidden", border: `1px solid ${border}`, borderRadius: 8,
      background: "linear-gradient(180deg, rgba(13,24,52,0.55) 0%, rgba(13,24,52,0.2) 100%)",
      textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", padding: "20px 22px 22px",
      transition: "transform .25s, border-color .25s, box-shadow .25s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 30px ${p.accent === "violet" ? "rgba(192,132,252,0.16)" : "rgba(96,165,250,0.16)"}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = "none"; }}>
      <HudBrackets mode="dark" inset={8} size={16} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="t-mono-s" style={{ color: LEVEL_COLOR[p.level] || accent, fontSize: 10 }}>// {p.level.toUpperCase()}</span>
          <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 23, letterSpacing: "-0.015em", color: "var(--white)", margin: 0 }}>{p.title}</h3>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Ring pct={pct} accent={accent} />
          <span className="t-mono-s" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: accent }}>{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>{p.tagline}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{total} steps · ~{p.estMinutes} min</span>
        <span className="t-mono-s" style={{ color: accent, fontSize: 11 }}>{started ? "CONTINUE →" : "START →"}</span>
      </div>
    </a>
  );
}

function Hero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 48, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="blue" size={480} x={"70%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={7} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 8, bottom: 8, width: 3, background: "linear-gradient(to bottom, #a855f7, #3b82f6)", boxShadow: "0 0 16px rgba(168,85,247,0.5)" }} />
          <MonoLabel>// PATHS</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(40px, 5vw, 70px)", letterSpacing: "-0.025em", lineHeight: 1.0, margin: 0,
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Guided learning paths.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 17, lineHeight: 1.6 }}>
            Curated routes through the demos, concepts, and lessons — in the order that builds understanding. Pick a track, follow it step by step, and your progress is saved as you go.
          </div>
        </div>
      </Container>
    </Section>
  );
}

function App() {
  const mobile = useIsMobile();
  const paths = window.LEARNING_PATHS || [];
  // resume strip: the most recently touched started path
  let resume = null;
  if (window.DM_PATHS) { for (const p of paths) { if (window.DM_PATHS.started(p.id)) { const g = window.DM_PATHS.get(p.id); if (!resume || (g.ts || 0) > resume.ts) resume = { p, ts: g.ts || 0 }; } } }
  return (
    <>
      <TopNav />
      <Hero />
      <Section style={{ paddingTop: 8 }}>
        <GridOverlay mode="dark" spacing={80} opacity={0.3} />
        <Container>
          {resume && (
            <a href={resume.p.id + "/"} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
              marginBottom: 22, padding: "16px 22px", border: "1px solid var(--border-violet)", borderRadius: 8,
              background: "linear-gradient(120deg, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.06) 100%)", textDecoration: "none", color: "inherit",
            }}>
              <div><MonoLabel color="var(--violet-lt)">// PICK UP WHERE YOU LEFT OFF</MonoLabel>
                <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 19, color: "var(--white)", marginTop: 6 }}>{resume.p.title}</div></div>
              <span className="t-mono-s" style={{ color: "var(--violet-lt)", whiteSpace: "nowrap" }}>CONTINUE →</span>
            </a>
          )}
          <div style={{ marginBottom: 22 }}><MonoLabel color="var(--violet-lt)">// {paths.length} PATHS</MonoLabel></div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 18 }}>
            {paths.map(p => <PathCard key={p.id} p={p} />)}
          </div>
        </Container>
      </Section>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
