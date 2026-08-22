// path-builder-app.jsx — /paths/build/, generate a learning path to any concept.
//
// The 11 curated paths were hand-written and are editorially better: named stages,
// copy explaining why each step is there. But they cover 11 destinations. The concept
// graph has 188 nodes with prerequisite edges and no cycles, so "what do I need
// before X?" is a topological sort — every destination, nothing authored.
//
// This is the front door; the same computation also runs on all 188 concept pages as
// "How to get here". One implementation, in concept-paths.js.

const { useState, useMemo } = React;
const {
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  GridOverlay, GlowBlob, HudBrackets,
} = window;

const BASE = window.__DM_BASE || "../../";
const P = window.DM_CONCEPT_PATH;
const K = window.DM_KNOWN;
const INDEX = window.CONCEPTS_INDEX || {};

function App() {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [target, setTarget] = useState(null);
  const [, bump] = useState(0);

  const all = useMemo(() => Object.values(INDEX).sort((a, b) => a.name.localeCompare(b.name)), []);
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    return all.filter((c) => c.name.toLowerCase().includes(n) || c.id.includes(n) || (c.area || "").toLowerCase().includes(n)).slice(0, 12);
  }, [q, all]);

  const known = K.setObj();
  const full = target ? P.pathTo(target).steps : [];
  const path = target ? P.pathTo(target, known).steps : [];
  const hidden = full.length - path.length;
  const C = target ? INDEX[target] : null;

  // Areas that already have several concepts make the best starting suggestions -
  // an empty page with a search box tells a reader nothing about what is in here.
  const suggestions = ["diffusion", "paged-attention", "rag-fusion", "lora", "attention", "backprop"]
    .filter((id) => INDEX[id]);

  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
        <Section id="top" padded={false} style={{ paddingTop: 132, paddingBottom: 34, position: "relative", overflow: "hidden" }}>
          <GridOverlay mode="dark" spacing={80} opacity={0.35} />
          <GlowBlob color="violet" size={470} x={"80%"} y={"-12%"} opacity={0.18} />
          <HudBrackets mode="dark" inset={28} size={28} />
          <Container>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <a href={`${BASE}paths/`} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← PATHS</a>
              <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
              <MonoLabel color="var(--violet-lt)">// BUILD A PATH</MonoLabel>
            </div>
            <h1 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, margin: 0,
              fontSize: "clamp(36px, 4.5vw, 60px)", letterSpacing: "-0.025em", lineHeight: 1.0, color: "var(--white)",
            }}>What do I need to learn first?</h1>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 680, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>
              Name anything on the site and get the route to it, in an order that never puts
              a idea before the one it depends on. Mark what you already know and the route
              gets shorter. {all.length} destinations, none of them hand-written.
            </div>
          </Container>
        </Section>

        <Section style={{ paddingTop: 0, paddingBottom: 76 }}>
          <Container style={{ maxWidth: 880 }}>
            <label htmlFor="pb-q" className="sr-only">Search for a concept to learn</label>
            <input id="pb-q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="diffusion, paged attention, LoRA, backprop…" className="t-body"
              style={{
                width: "100%", maxWidth: 620, padding: "14px 16px", fontSize: 16,
                background: "rgba(5,8,22,0.6)", color: "var(--white)",
                border: "1px solid var(--border)", borderRadius: 6,
              }} />

            {matches.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                {matches.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setTarget(c.id); setQ(""); }} className="t-mono-s"
                    style={{ padding: "7px 12px", borderRadius: 4, cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--muted)" }}>
                    {c.name} <span style={{ color: "var(--dim)" }}>{c.area}</span>
                  </button>
                ))}
              </div>
            )}

            {!target && !q && (
              <div style={{ marginTop: 22 }}>
                <span className="t-mono-s" style={{ color: "var(--muted)" }}>// TRY ONE</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                  {suggestions.map((id) => (
                    <button key={id} type="button" onClick={() => setTarget(id)} className="t-mono-s"
                      style={{ padding: "7px 12px", borderRadius: 4, cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--blue-lt)" }}>
                      {INDEX[id].name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {C && (
              <div style={{ marginTop: 34 }}>
                <MonoLabel color="var(--violet-lt)">// ROUTE TO {C.name.toUpperCase()}</MonoLabel>
                <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "10px 0 18px" }}>
                  {path.length <= 1
                    ? `${C.name} has no prerequisites in the graph — it is a starting point. Begin here.`
                    : `${path.length - 1} concept${path.length === 2 ? "" : "s"} come first.`}
                  {hidden > 0 && <span style={{ color: "var(--dim)" }}> {hidden} hidden as known.</span>}
                  {K.count() > 0 && (
                    <button type="button" onClick={() => { K.clear(); bump((n) => n + 1); }} className="t-mono-s"
                      style={{ marginLeft: 10, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", cursor: "pointer", padding: "3px 9px", fontSize: 10 }}>
                      RESET WHAT I KNOW ({K.count()})
                    </button>
                  )}
                </div>

                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {path.map((id, i) => {
                    const node = INDEX[id];
                    const isTarget = id === target;
                    const s = P.surfacesFor(id);
                    return (
                      <li key={id} style={{
                        display: "flex", alignItems: "baseline", gap: 12, padding: "11px 14px",
                        border: `1px solid ${isTarget ? "rgba(168,85,247,0.55)" : "var(--border)"}`,
                        borderRadius: 6, background: isTarget ? "rgba(168,85,247,0.09)" : "rgba(13,24,52,0.3)",
                      }}>
                        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, minWidth: 20 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <a href={`${BASE}concepts/${id}/`} className="t-body"
                            style={{ color: "var(--white)", fontSize: 15.5, textDecoration: "none", borderBottom: "1px solid rgba(148,163,184,0.3)" }}>{node.name}</a>
                          {isTarget && <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10, marginLeft: 9 }}>DESTINATION</span>}
                          {s.demos.length > 0 && (
                            <a href={`${BASE}visualize/${s.demos[0]}/`} className="t-mono-s"
                              style={{ color: "var(--blue-lt)", textDecoration: "none", marginLeft: 12, fontSize: 10 }}>PLAY →</a>
                          )}
                        </span>
                        {!isTarget && (
                          <button type="button" onClick={() => { K.set(id, true); bump((n) => n + 1); }} className="t-mono-s"
                            title={`Hide ${node.name} and anything only it needed`}
                            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", cursor: "pointer", padding: "4px 9px", fontSize: 10 }}>
                            I KNOW THIS
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>

                <div className="t-body" style={{ color: "var(--dim)", fontSize: 13.5, lineHeight: 1.6, marginTop: 18, maxWidth: 640 }}>
                  Marking a step known also drops anything that was only needed for it — which is
                  why the list can shrink by more than one row, or by fewer than you expect when
                  a step is still required further along.
                </div>
              </div>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
