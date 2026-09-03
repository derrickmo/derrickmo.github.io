// module-app.jsx — module lecture page.
// Renders a condensed on-site lecture from window.LECTURES[slug] and funnels to
// the full notebooks on GitHub. Reads window.__DM_MODULE_SLUG.
//   window.__DM_BASE  = "../../"
//   window.__DM_PAGE  = "learn"
//   window.__DM_MODULE_SLUG = "transformers"

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  NeuralNet, TransformerBlock, LessonStack,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  Connections,
} = window;

// READ AT USE, NOT AT MODULE SCOPE (PF-0020): Vite orders this page's module scripts
// by the import graph, not DOM order, and nothing here imports curriculum.js. The
// derived lookups below are guarded so an unlucky order degrades this page instead of
// throwing at module scope, which is what blanks a page with nothing reporting it.
const curr = () => window.CURRICULUM;
const LEC = window.LECTURES ? window.LECTURES[window.__DM_MODULE_SLUG] : null;
const MODULE = curr() ? curr().findModule(window.__DM_MODULE_SLUG) : null; // category + prev/next
const BASE = window.__DM_BASE || "../../";
const FOLDER = (LEC && window.lectureFolder) ? window.lectureFolder(LEC.n) : (window.LECTURES_REPO || "#");

function totalHours() {
  if (!LEC) return "0";
  const mins = LEC.notebooks.reduce((a, nb) => a + (parseInt(nb.m, 10) || 0), 0);
  return (mins / 60).toFixed(1);
}

function HeroDiagram() {
  const cat = MODULE ? MODULE.category : "";
  if (/Deep Learning|Advanced/.test(cat)) return <TransformerBlock width={420} height={340} mode="dark" />;
  if (/LLM|Alignment|Reinforcement|Systems/.test(cat)) return <NeuralNet layers={[6,8,6,4]} width={500} height={340} mode="dark" glow={0.8} pulse />;
  return <LessonStack count={10} width={500} height={340} mode="dark" />;
}

// ─── Hero ─────────────────────────────────────────────────────
function ModuleHero() {
  const mobile = useIsMobile();
  if (!LEC) {
    return (
      <Section padded={false} style={{ paddingTop: 200 }}>
        <Container>
          <MonoLabel color="var(--violet-lt)">// ERROR · LECTURE NOT FOUND</MonoLabel>
          <h1 style={{ color: "var(--white)", fontFamily: "var(--f-display)", fontSize: 48, marginTop: 12 }}>Lecture not found.</h1>
          <p style={{ color: "var(--muted)" }}>No lecture for slug <code>{window.__DM_MODULE_SLUG}</code> in lectures.js.</p>
        </Container>
      </Section>
    );
  }
  return (
    <Section id="top" padded={false} style={{ paddingTop: 140, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.22} />
      <GlowBlob color="blue" size={480} x={"65%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={parseInt(LEC.n)} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <Container style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href={BASE + "learn/"} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel color="var(--blue-lt)">MODULE {LEC.n}</MonoLabel>
        </div>
      </Container>

      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{
            position: "absolute", left: -18, top: 20, bottom: 70, width: 3,
            background: "linear-gradient(to bottom, #3b82f6, #a855f7)", boxShadow: "0 0 16px rgba(59,130,246,0.5)",
          }} />
          <MonoLabel>{MODULE ? MODULE.category.toUpperCase() : "ML FROM SCRATCH"}</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(38px, 4.8vw, 60px)", letterSpacing: "-0.025em", lineHeight: 1.02, margin: 0,
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>{LEC.title}</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 17, lineHeight: 1.6 }}>{LEC.summary}</div>
          <div className="t-mono-s" style={{ color: "var(--dim)" }}>BUILDS ON: {LEC.prereqs}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <a href={FOLDER} target="_blank" rel="noopener" style={{
              padding: "12px 22px", border: "1px solid var(--blue)", borderRadius: 4,
              color: "var(--white)", textDecoration: "none", fontFamily: "var(--f-mono)", fontSize: 13,
              letterSpacing: "0.1em", background: "rgba(59,130,246,0.08)", boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>OPEN ON GITHUB →</a>
            <a href="#notebooks" style={{
              padding: "12px 22px", border: "1px solid var(--border)", borderRadius: 4,
              color: "var(--muted)", textDecoration: "none", fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            }}>SEE THE NOTEBOOKS</a>
          </div>
        </div>
        {!mobile && <div style={{ display: "flex", justifyContent: "center" }}><HeroDiagram /></div>}
      </Container>

      <Container style={{ marginTop: 44 }}>
        <div style={{
          display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 0,
          border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.4)",
        }}>
          {[
            { label: "MODULE", value: LEC.n, sub: MODULE ? MODULE.category : "" },
            { label: "NOTEBOOKS", value: LEC.notebooks.length.toString(), sub: "self-contained" },
            { label: "EST. TIME", value: "~" + totalHours() + " h", sub: "to work through" },
            { label: "STACK", value: "NumPy → PyTorch", sub: "from scratch" },
          ].map((c, i, arr) => (
            <div key={c.label} style={{
              padding: "18px 20px", borderRight: (!mobile && i < arr.length - 1) ? "1px solid var(--border)" : "none",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{c.label}</span>
              <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22, color: "var(--white)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>{c.value}</span>
              <span className="t-small" style={{ color: "var(--muted)", fontSize: 11 }}>{c.sub}</span>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Takeaways ────────────────────────────────────────────────
function Takeaways() {
  if (!LEC) return null;
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 16, paddingBottom: 16 }}>
      <Container>
        <div style={{ marginBottom: 24 }}>
          <MonoLabel>// WHAT YOU'LL TAKE AWAY</MonoLabel>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : `repeat(${LEC.takeaways.length}, 1fr)`, gap: 16 }}>
          {LEC.takeaways.map((t, i) => (
            <div key={i} style={{
              position: "relative", overflow: "hidden", padding: "24px 22px",
              border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.4)",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <HudBrackets mode="dark" inset={8} size={16} />
              <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 26, color: "var(--blue-lt)", lineHeight: 1 }}>{String(i + 1).padStart(2, "0")}</span>
              <div className="t-body" style={{ color: "var(--white)", opacity: 0.9, fontSize: 15, lineHeight: 1.55 }}>{t}</div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Minimal code illustration ────────────────────────────────
function CodeIllustration() {
  const c = window.LECTURE_CODE ? window.LECTURE_CODE[window.__DM_MODULE_SLUG] : null;
  if (!c) return null;
  return (
    <Section style={{ paddingTop: 16, paddingBottom: 16 }}>
      <Container style={{ maxWidth: 860 }}>
        <MonoLabel>// THE CORE IDEA, IN CODE</MonoLabel>
        <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "rgba(5,8,22,0.6)" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#f87171" }} />
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#fbbf24" }} />
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#34d399" }} />
            <span className="t-mono-s" style={{ color: "var(--muted)", marginLeft: 8 }}>python</span>
          </div>
          <pre style={{ margin: 0, padding: "18px 20px", overflowX: "auto" }}><code className="t-mono" style={{ color: "var(--blue-br)", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre" }}>{c.code}</code></pre>
        </div>
        <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, marginTop: 10, fontStyle: "italic" }}>{c.caption}</div>
      </Container>
    </Section>
  );
}

// ─── Formats (notebooks live · video & case study in dev) ─────
function Formats() {
  const mobile = useIsMobile();
  const items = [
    { label: "Self-guided notebooks", status: "AVAILABLE", note: "Run them now — self-contained, and updated over time.", href: FOLDER },
    { label: "Video walkthrough", status: "PLANNED", note: "A recorded video lecture for this module is planned." },
    { label: "Case study", status: "PLANNED", note: "An applied case study tied to real work is planned." },
  ];
  return (
    <Section style={{ paddingTop: 24, paddingBottom: 8 }}>
      <Container>
        <div style={{ marginBottom: 20 }}><MonoLabel>// FORMATS</MonoLabel></div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
          {items.map(it => {
            const live = it.status === "AVAILABLE";
            const accent = live ? "#34d399" : "var(--muted)";
            const inner = (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className="t-mono-s" style={{ color: "var(--muted)" }}>{it.label}</span>
                  <span className="t-mono-s" style={{ color: accent, fontSize: 10, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                    {live && <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, boxShadow: `0 0 6px ${accent}` }} />}{it.status}
                  </span>
                </div>
                <div className="t-body" style={{ color: "var(--white)", opacity: 0.8, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{it.note}</div>
                {it.href && <span className="t-mono-s" style={{ color: "var(--blue-lt)", fontSize: 10, marginTop: 10, display: "inline-block" }}>OPEN ON GITHUB →</span>}
              </>
            );
            const style = { position: "relative", overflow: "hidden", padding: "20px 20px", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13,24,52,0.4)", textDecoration: "none", color: "inherit", display: "block", opacity: live ? 1 : 0.85 };
            return it.href
              ? <a key={it.label} href={it.href} target="_blank" rel="noopener" style={style}>{inner}</a>
              : <div key={it.label} style={style}>{inner}</div>;
          })}
        </div>
      </Container>
    </Section>
  );
}

// flagships for this module: support a `flagships:[...]` array, or a single `flagship`.
const FLAGSHIPS = LEC ? (LEC.flagships || (LEC.flagship ? [LEC.flagship] : [])) : [];

// ─── Flagship on-site lesson callout(s) ───────────────────────
function Flagship() {
  if (!FLAGSHIPS.length) return null;
  const many = FLAGSHIPS.length > 1;
  return (
    <Section style={{ paddingTop: 24, paddingBottom: 8 }}>
      <Container>
        {many && <div style={{ marginBottom: 14 }}><MonoLabel color="var(--violet-lt)">// FEATURED LESSONS · FULL WALKTHROUGHS ON-SITE</MonoLabel></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FLAGSHIPS.map(f => (
            <a key={f.href} href={BASE + f.href} style={{
              position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 24, flexWrap: "wrap",
              padding: "26px 30px", border: "1px solid var(--border-violet)", borderRadius: 8,
              background: "linear-gradient(120deg, rgba(168,85,247,0.12) 0%, rgba(59,130,246,0.08) 100%)",
              textDecoration: "none", color: "inherit",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.boxShadow = "0 0 28px rgba(192,132,252,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-violet)"; e.currentTarget.style.boxShadow = "none"; }}>
              <HudBrackets mode="dark" inset={10} size={20} />
              <div>
                {!many && <MonoLabel color="var(--violet-lt)">// FEATURED LESSON · FULL WALKTHROUGH ON-SITE</MonoLabel>}
                <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 24, color: "var(--white)", marginTop: many ? 0 : 8 }}>
                  {f.n} · {f.label}
                </div>
                <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
                  Read this one in full here — derivation, NumPy, PyTorch, and a trained example.
                </div>
              </div>
              <span className="t-mono-s" style={{ color: "var(--violet-lt)", whiteSpace: "nowrap" }}>READ LESSON →</span>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Notebooks list ───────────────────────────────────────────
function Notebooks() {
  if (!LEC) return null;
  const flagBy = {}; FLAGSHIPS.forEach(f => { flagBy[f.n] = f; });
  return (
    <Section id="notebooks">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MonoLabel>// THE NOTEBOOKS · {LEC.notebooks.length} TOTAL</MonoLabel>
            <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(30px, 3.4vw, 44px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05 }}>Inside the module.</h2>
          </div>
          <a href={FOLDER} target="_blank" rel="noopener" className="t-mono-s" style={{
            padding: "11px 20px", border: "1px solid var(--blue-lt)", borderRadius: 4, color: "var(--white)",
            textDecoration: "none", background: "rgba(59,130,246,0.12)", whiteSpace: "nowrap",
          }}>RUN THEM ON GITHUB →</a>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.35)", overflow: "hidden" }}>
          {LEC.notebooks.map((nb, i) => {
            const isFlag = !!flagBy[nb.n];
            const row = (
              <>
                <span className="t-mono" style={{ color: isFlag ? "var(--violet-lt)" : "var(--blue-lt)", fontSize: 13, fontWeight: 600 }}>{nb.n}</span>
                <span style={{ fontFamily: "var(--f-display)", fontWeight: 500, fontSize: 17, color: "var(--white)", letterSpacing: "-0.005em" }}>
                  {nb.t}{isFlag && <span className="t-mono-s" style={{ color: "var(--violet-lt)", marginLeft: 10 }}>● ON-SITE</span>}
                </span>
                <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, textAlign: "right" }}>{nb.d}</span>
                <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, textAlign: "right", whiteSpace: "nowrap" }}>{nb.m}</span>
              </>
            );
            const style = {
              display: "grid", gridTemplateColumns: "60px 1fr auto 64px", gap: 16, alignItems: "center",
              padding: "18px 24px", borderTop: i === 0 ? "none" : "1px solid var(--border)",
              textDecoration: "none", color: "inherit",
            };
            if (isFlag) {
              return <a key={nb.n} href={BASE + flagBy[nb.n].href} style={{ ...style, background: "rgba(168,85,247,0.06)" }}>{row}</a>;
            }
            return <div key={nb.n} style={style}>{row}</div>;
          })}
        </div>
        <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, marginTop: 16, lineHeight: 1.6, maxWidth: 720 }}>
          This page is the condensed tour. Every notebook is self-contained, runs end-to-end with "Restart &amp; Run All," and downloads its own data —
          <a href={FOLDER} target="_blank" rel="noopener" style={{ color: "var(--blue-lt)" }}> open the module on GitHub</a> to run the full thing.
        </div>
      </Container>
    </Section>
  );
}

// ─── Prev / next module ───────────────────────────────────────
function ModuleNav() {
  if (!MODULE) return null;
  const idx = curr().modules.findIndex(m => m.slug === MODULE.slug);
  const prev = idx > 0 ? curr().modules[idx - 1] : null;
  const next = idx < curr().modules.length - 1 ? curr().modules[idx + 1] : null;
  const tile = (m, dir) => m && (
    <a href={`../${m.slug}/`} style={{
      flex: 1, padding: "20px 22px", border: "1px solid var(--border)", borderRadius: 6,
      background: "rgba(13, 24, 52, 0.5)", textDecoration: "none", color: "inherit",
      transition: "border-color .2s, transform .15s", display: "flex", flexDirection: "column", gap: 6,
      textAlign: dir === "prev" ? "left" : "right",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue-lt)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>{dir === "prev" ? "← MODULE " + m.n : "MODULE " + m.n + " →"}</span>
      <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18, color: "var(--white)", letterSpacing: "-0.01em" }}>{m.title}</span>
    </a>
  );
  return (
    <Section style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Container>
        <div style={{ display: "flex", gap: 16 }}>
          {tile(prev, "prev") || <div style={{ flex: 1 }} />}
          {tile(next, "next") || <div style={{ flex: 1 }} />}
        </div>
      </Container>
    </Section>
  );
}

// ─── Concept-by-concept breakdown (taught sub-lessons) ────────
function ConceptBreakdown() {
  const mobile = useIsMobile();
  // Titles and one-liners are all this section renders, so the page loads
  // sub-lessons-nav.js rather than the full sub-lessons.js. Falls back to the full
  // object if the nav bundle is absent. Read here inside the component, at render
  // time -- not at module scope, which is how PF-0020 blanked every lesson body.
  const sub = (window.SUB_LESSONS_NAV || window.SUB_LESSONS || {})[window.__DM_MODULE_SLUG];
  if (!sub) return null;
  const order = sub.order || Object.keys(sub.lessons);
  if (!order.length) return null;
  return (
    <Section style={{ paddingTop: 24, paddingBottom: 16 }}>
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <MonoLabel color="var(--violet-lt)">// CONCEPT BY CONCEPT</MonoLabel>
          <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(26px, 3vw, 38px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.08 }}>
            Break it down.
          </h2>
          {sub.intro && <p className="t-body" style={{ color: "var(--muted)", maxWidth: 760, fontSize: 16, lineHeight: 1.6, margin: 0 }}>{sub.intro}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 12 }}>
          {order.map((cid, i) => {
            const L = sub.lessons[cid];
            if (!L) return null;
            return (
              <a key={cid} href={`${BASE}learn/${window.__DM_MODULE_SLUG}/${cid}/`} style={{
                position: "relative", overflow: "hidden", display: "flex", gap: 14, alignItems: "flex-start",
                padding: "18px 20px", border: "1px solid var(--border)", borderRadius: 8,
                background: "rgba(13, 24, 52, 0.4)", textDecoration: "none", color: "inherit",
                transition: "border-color .2s, transform .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <HudBrackets mode="dark" inset={6} size={12} />
                <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22, color: "var(--violet-lt)", lineHeight: 1, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 17, color: "var(--white)", letterSpacing: "-0.01em" }}>{L.title}</span>
                  <span className="t-body" style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.5 }}>{L.oneLine}</span>
                  <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10, marginTop: 2 }}>READ LESSON →</span>
                </span>
              </a>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

function ModuleConnections() {
  const tags = (window.CONCEPT_TAGS && window.CONCEPT_TAGS.modules) || {};
  const ids = tags[window.__DM_MODULE_SLUG] || [];
  if (!ids.length || !Connections) return null;
  return (
    <Section style={{ paddingTop: 16, paddingBottom: 24 }}>
      <Container style={{ maxWidth: 860 }}>
        <Connections ids={ids} />
      </Container>
    </Section>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <ModuleHero />
      <Takeaways />
      <ConceptBreakdown />
      <CodeIllustration />
      <Flagship />
      <Notebooks />
      <ModuleConnections />
      <Formats />
      <ModuleNav />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
