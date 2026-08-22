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
          <Ring pct={pct} accent={pct >= 1 ? "#34d399" : accent} />
          <span className="t-mono-s" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: pct >= 1 ? 13 : 9, color: pct >= 1 ? "#34d399" : accent }}>{pct >= 1 ? "✓" : Math.round(pct * 100) + "%"}</span>
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

// ── Stage 4: cross-path progress dashboard ──────────────────────────
function StatTile({ value, label, accent }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 0, padding: "14px 16px", borderRadius: 8,
      border: "1px solid var(--border)", background: "rgba(13,24,52,0.4)",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 28, lineHeight: 1, color: accent || "var(--white)" }}>{value}</span>
      <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}

function ContinueRow({ entry }) {
  const { p, next } = entry;
  const accent = ACCENT(p.accent);
  const total = window.DM_PATH_TOTAL(p);
  const done = window.DM_PATHS.doneCount(p.id);
  const pct = total ? Math.min(done, total) / total : 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 8,
      border: "1px solid var(--border)", background: "rgba(13,24,52,0.35)", flexWrap: "wrap",
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Ring pct={pct} size={38} accent={accent} />
        <span className="t-mono-s" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: accent }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <a href={p.id + "/"} style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 16, color: "var(--white)", textDecoration: "none" }}>{p.title}</a>
        <div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          NEXT: {next ? next.resolved.title : "—"}
        </div>
      </div>
      {next && (
        <a href={next.resolved.href} style={{
          flexShrink: 0, textDecoration: "none", border: `1px solid ${accent}`, borderRadius: 6,
          padding: "7px 12px", color: accent, fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: "0.06em",
        }}>OPEN NEXT →</a>
      )}
    </div>
  );
}

function Dashboard({ paths, mobile }) {
  if (!window.DM_PATHS) return null;
  let totalSteps = 0, doneSteps = 0, startedCount = 0, completeCount = 0;
  const inProgress = [], complete = [];
  for (const p of paths) {
    const total = window.DM_PATH_TOTAL(p);
    const done = Math.min(window.DM_PATHS.doneCount(p.id), total);
    totalSteps += total; doneSteps += done;
    if (done <= 0) continue;
    startedCount++;
    const ts = (window.DM_PATHS.get(p.id).ts) || 0;
    if (done >= total) { completeCount++; complete.push({ p, ts }); }
    else { inProgress.push({ p, ts, next: window.DM_PATH_NEXT(p) }); }
  }
  if (startedCount === 0) return null; // nothing started yet — just show the grid
  inProgress.sort((a, b) => b.ts - a.ts);
  complete.sort((a, b) => b.ts - a.ts);
  const overall = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div style={{
      marginBottom: 28, padding: "22px 24px", borderRadius: 10, position: "relative", overflow: "hidden",
      border: "1px solid var(--border-violet)",
      background: "linear-gradient(125deg, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.06) 55%, rgba(13,24,52,0.2) 100%)",
    }}>
      <HudBrackets mode="dark" inset={10} size={18} />
      <MonoLabel color="var(--violet-lt)">// YOUR PROGRESS</MonoLabel>
      <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <StatTile value={overall + "%"} label="OVERALL COMPLETION" accent="var(--violet-lt)" />
        <StatTile value={doneSteps + " / " + totalSteps} label="STEPS DONE" />
        <StatTile value={startedCount} label="PATHS STARTED" />
        <StatTile value={completeCount} label="PATHS COMPLETE" accent={completeCount > 0 ? "#34d399" : null} />
      </div>
      <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: "rgba(148,163,184,0.18)", overflow: "hidden" }}>
        <div style={{ width: overall + "%", height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #a855f7, #3b82f6)", transition: "width .4s" }} />
      </div>

      {inProgress.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, marginBottom: 10 }}>// PICK UP WHERE YOU LEFT OFF</div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
            {inProgress.map(e => <ContinueRow key={e.p.id} entry={e} />)}
          </div>
        </div>
      )}

      {complete.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span className="t-mono-s" style={{ color: "#34d399", fontSize: 10 }}>// COMPLETED</span>
          {complete.map(({ p }) => (
            <a key={p.id} href={p.id + "/"} style={{
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
              border: "1px solid rgba(52,211,153,0.4)", borderRadius: 20, padding: "5px 12px",
              color: "#34d399", fontFamily: "var(--f-mono)", fontSize: 11,
            }}>✓ {p.title}</a>
          ))}
        </div>
      )}
    </div>
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
          {/* These eleven are hand-written and stay that way. The builder covers the
              other 177 destinations nobody had time to plan a route to. */}
          <a href="build/" className="t-mono-s" style={{
            display: "inline-block", marginTop: 4, padding: "11px 20px", borderRadius: 4,
            border: "1px solid var(--violet)", background: "rgba(168,85,247,0.10)",
            color: "var(--white)", textDecoration: "none", letterSpacing: "0.09em",
          }}>OR BUILD ONE TO ANY CONCEPT →</a>
        </div>
      </Container>
    </Section>
  );
}

function App() {
  const mobile = useIsMobile();
  const paths = window.LEARNING_PATHS || [];
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <Hero />
      <Section style={{ paddingTop: 8 }}>
        <GridOverlay mode="dark" spacing={80} opacity={0.3} />
        <Container>
          <Dashboard paths={paths} mobile={mobile} />
          <div style={{ marginBottom: 22 }}><MonoLabel color="var(--violet-lt)">// {paths.length} PATHS</MonoLabel></div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 18 }}>
            {paths.map(p => <PathCard key={p.id} p={p} />)}
          </div>
        </Container>
      </Section>
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
