// path-app.jsx — a single learning path page (/paths/<id>/). Reads window.__DM_PATH_ID,
// finds the path in window.LEARNING_PATHS, resolves each step against the registries,
// renders collapsible chapters with localStorage progress. Shared by all path pages.

const {
  HudBrackets, GridOverlay, GlowBlob, Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;
const { useState: _useState } = React;

const ACCENT = a => (a === "violet" ? "var(--violet-lt)" : "var(--blue-lt)");
const LEVEL_COLOR = { Beginner: "#34d399", Intermediate: "#fbbf24", Advanced: "#c084fc" };
const KIND = {
  concept: ["CONCEPT", "#c084fc"], demo: ["DEMO", "#60a5fa"], game: ["GAME", "#34d399"],
  module: ["MODULE", "#fbbf24"], lesson: ["LESSON", "#fbbf24"], hf: ["HF", "#f472b6"], page: ["PAGE", "#94a3b8"],
};

function App() {
  const mobile = useIsMobile();
  const path = window.DM_PATH_FIND ? window.DM_PATH_FIND(window.__DM_PATH_ID) : null;
  const [, setTick] = _useState(0);
  const refresh = () => setTick(t => t + 1);

  if (!path) {
    return (<><TopNav /><Section style={{ paddingTop: 160 }}><Container><h1 style={{ color: "var(--white)", fontFamily: "var(--f-display)" }}>Path not found.</h1><a href="../" style={{ color: "var(--blue-lt)" }}>← All paths</a></Container></Section><Footer /></>);
  }

  const accent = ACCENT(path.accent);
  const total = window.DM_PATH_TOTAL(path);
  const P = window.DM_PATHS;
  const key = (si, ti) => si + "." + ti;
  let done = 0;
  path.stages.forEach((s, si) => s.steps.forEach((_, ti) => { if (P && P.isDone(path.id, key(si, ti))) done++; }));
  const pct = total ? done / total : 0;

  // first undone step -> resume target
  let next = null;
  outer: for (let si = 0; si < path.stages.length; si++) for (let ti = 0; ti < path.stages[si].steps.length; ti++) { if (!(P && P.isDone(path.id, key(si, ti)))) { next = { si, ti, step: path.stages[si].steps[ti] }; break outer; } }

  // collapsible state: default-open the stage of the first undone step (or 0)
  const defaultOpen = next ? next.si : 0;
  const [open, setOpen] = _useState(() => { const o = {}; path.stages.forEach((_, i) => o[i] = i === defaultOpen); return o; });
  const toggleStage = i => setOpen(o => ({ ...o, [i]: !o[i] }));

  const toggleStep = (si, ti) => { if (P) P.toggle(path.id, key(si, ti)); refresh(); };
  const resumeStep = () => { const t = next || { si: 0, ti: 0, step: path.stages[0].steps[0] }; if (P) P.setLast(path.id, key(t.si, t.ti)); const r = window.DM_PATH_RESOLVE(t.step); window.location.href = r.href; };

  return (
    <>
      <TopNav />
      <Section id="top" padded={false} style={{ paddingTop: 150, paddingBottom: 36, position: "relative", overflow: "hidden" }}>
        <GridOverlay mode="dark" spacing={80} opacity={0.4} />
        <GlowBlob color={path.accent} size={520} x={"-8%"} y={"-25%"} opacity={0.22} />
        <HudBrackets mode="dark" inset={32} size={30} />
        <Container>
          <a href="../" className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← ALL PATHS</a>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760, marginTop: 14 }}>
            <span className="t-mono-s" style={{ color: LEVEL_COLOR[path.level] || accent }}>// {path.level.toUpperCase()} · {total} STEPS · ~{path.estMinutes} MIN</span>
            <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(34px, 4.5vw, 60px)", letterSpacing: "-0.02em", lineHeight: 1.02, margin: 0, color: "var(--white)" }}>{path.title}</h1>
            <div className="t-body" style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.6 }}>{path.tagline}</div>
          </div>
          {/* outcomes */}
          <div style={{ marginTop: 22, maxWidth: 760 }}>
            <MonoLabel color={accent}>// BY THE END YOU CAN</MonoLabel>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
              {path.outcomes.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
          {/* progress + resume */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <button onClick={resumeStep} className="t-mono-s" style={{ padding: "11px 20px", borderRadius: 6, border: `1px solid ${accent}`, background: "rgba(168,85,247,0.14)", color: "var(--white)", cursor: "pointer", boxShadow: "0 0 18px rgba(168,85,247,0.18)" }}>
              {done === 0 ? "START PATH →" : done >= total ? "REVIEW →" : "RESUME →"}
            </button>
            <div style={{ flex: "1 1 220px", minWidth: 180 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span className="t-mono-s" style={{ color: "var(--muted)" }}>PROGRESS</span>
                <span className="t-mono-s" style={{ color: accent }}>{done} / {total}</span>
              </div>
              <div style={{ height: 8, background: "rgba(13,24,52,0.6)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: (pct * 100) + "%", height: "100%", background: accent, transition: "width .3s" }} />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section style={{ paddingTop: 4 }}>
        <Container>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 820 }}>
            {path.stages.map((stage, si) => {
              const sDone = stage.steps.filter((_, ti) => P && P.isDone(path.id, key(si, ti))).length;
              const isOpen = open[si];
              return (
                <div key={si} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "rgba(13,24,52,0.35)" }}>
                  <button onClick={() => toggleStage(si)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="t-mono-s" style={{ color: accent, fontSize: 11 }}>{String(si + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18, color: "var(--white)" }}>{stage.name}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="t-mono-s" style={{ color: sDone === stage.steps.length ? "#34d399" : "var(--muted)", fontSize: 11 }}>{sDone}/{stage.steps.length}</span>
                      <span style={{ color: "var(--muted)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {stage.steps.map((step, ti) => {
                        const r = window.DM_PATH_RESOLVE(step);
                        const isDone = P && P.isDone(path.id, key(si, ti));
                        const [kindLabel, kindCol] = KIND[step.kind] || KIND.page;
                        return (
                          <div key={ti} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 8, background: isDone ? "rgba(52,211,153,0.06)" : "rgba(5,8,22,0.4)" }}>
                            <button onClick={() => toggleStep(si, ti)} aria-label={isDone ? "Mark not done" : "Mark done"} style={{ flexShrink: 0, marginTop: 1, width: 22, height: 22, borderRadius: 5, border: `1.5px solid ${isDone ? "#34d399" : "var(--border)"}`, background: isDone ? "#34d399" : "transparent", color: "#06281c", cursor: "pointer", fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{isDone ? "✓" : ""}</button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span className="t-mono-s" style={{ color: kindCol, border: `1px solid ${kindCol}`, borderRadius: 4, padding: "1px 5px", fontSize: 9 }}>{kindLabel}</span>
                                <a href={r.href} style={{ fontSize: 15, color: "var(--white)", textDecoration: "none", fontWeight: 600 }}
                                  onMouseEnter={e => e.currentTarget.style.color = accent} onMouseLeave={e => e.currentTarget.style.color = "var(--white)"}>{r.title}</a>
                              </div>
                              <div className="t-body" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{step.note}</div>
                            </div>
                            <a href={r.href} className="t-mono-s" style={{ flexShrink: 0, alignSelf: "center", color: accent, textDecoration: "none", fontSize: 11 }}>OPEN →</a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Container>
      </Section>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
