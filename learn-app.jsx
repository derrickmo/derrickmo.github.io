// learn-app.jsx — Learn hub page.
// Shows all 25 modules grouped by category. Each module card links to /learn/<slug>/.
// Module status: PENDING (dim) / DRAFT (active link, blue) / LIVE (active link, bright).

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  LessonStack,
  Section, Container, TopNav, Footer, MonoLabel, ConstructionBadge, useIsMobile,
} = window;

const CURR = window.CURRICULUM;
const REPO = CURR.repo;
const BASE = window.__DM_BASE || "";

// ─── Hero ─────────────────────────────────────────────────────
function LearnHero() {
  const counts = CURR.modules.reduce(
    (acc, m) => {
      m.lessons.forEach(l => { acc[l.status] = (acc[l.status] || 0) + 1; });
      return acc;
    },
    { LIVE: 0, DRAFT: 0, PENDING: 0 }
  );
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 64, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="blue" size={480} x={"65%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={11} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{
            position: "absolute", left: -18, top: 20, bottom: 70, width: 3,
            background: "linear-gradient(to bottom, #a855f7, #3b82f6)",
            boxShadow: "0 0 16px rgba(168,85,247,0.5)",
          }} />
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <MonoLabel>// LEARN · ML FROM SCRATCH</MonoLabel>
          </div>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(48px, 6vw, 84px)", letterSpacing: "-0.025em",
            lineHeight: 0.98, margin: 0,
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Learning ML from<br/>scratch, by doing.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 620, fontSize: 17, lineHeight: 1.6 }}>
            The most comprehensive machine-learning curriculum I could build — every major
            concept from first principles. Each lesson is a complete, easy-to-follow Jupyter
            notebook you can run end-to-end. NumPy first: derive the math, implement it,
            then graduate to PyTorch. No black boxes.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <a href={REPO} target="_blank" rel="noopener" style={{
              padding: "12px 22px", border: "1px solid var(--blue)",
              borderRadius: 4, color: "var(--white)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
              background: "rgba(59,130,246,0.08)",
              boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>BROWSE ON GITHUB →</a>
            <a href="#modules" style={{
              padding: "12px 22px", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--muted)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            }}>SEE THE 25 MODULES</a>
          </div>
        </div>
        {!mobile && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LessonStack count={10} width={520} height={360} mode="dark" />
          </div>
        )}
      </Container>

      {/* status row */}
      <Container style={{ marginTop: 56 }}>
        <div style={{
          display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: 0,
          border: "1px solid var(--border)", borderRadius: 6,
          background: "rgba(13, 24, 52, 0.4)",
        }}>
          {[
            { label: "MODULES",         value: "25",  sub: "on-site lectures" },
            { label: "NOTEBOOKS",       value: "250", sub: "planned" },
            { label: "VIDEO TUTORIALS", value: "—",   sub: "planned" },
            { label: "TRACKS",          value: "12",  sub: "domains" },
            { label: "STACK",           value: "NumPy → PyTorch", sub: "from scratch" },
          ].map((c, i, arr) => (
            <div key={c.label} style={{
              padding: "20px 22px",
              borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{c.label}</span>
              <span style={{
                fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 26,
                color: "var(--white)", letterSpacing: "-0.02em", lineHeight: 1,
              }}>{c.value}</span>
              <span className="t-small" style={{ color: "var(--muted)", fontSize: 11 }}>{c.sub}</span>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Module card ─────────────────────────────────────────────
function ModuleCard({ m }) {
  const isLive = m.status === "LIVE";
  const isDraft = m.status === "DRAFT";
  const active = isLive || isDraft;
  const accent = isLive ? "var(--violet-lt)" : isDraft ? "var(--blue-lt)" : "var(--muted)";
  const liveLessons = m.lessons.filter(l => l.status === "LIVE").length;
  const draftLessons = m.lessons.filter(l => l.status === "DRAFT").length;

  const Wrap = active ? "a" : "div";
  const wrapProps = active ? { href: `${BASE}learn/${m.slug}/` } : {};

  return (
    <Wrap {...wrapProps} style={{
      position: "relative",
      padding: "22px 22px 24px",
      border: `1px ${active ? "solid" : "dashed"} ${active ? "var(--border)" : "rgba(96,165,250,0.18)"}`,
      borderRadius: 6,
      background: "rgba(13, 24, 52, 0.4)",
      display: "flex", flexDirection: "column", gap: 10,
      opacity: active ? 1 : 0.65,
      textDecoration: "none", color: "inherit",
      transition: "opacity .2s, border-color .2s, transform .2s, box-shadow .2s",
      cursor: active ? "pointer" : "default",
    }}
      onMouseEnter={e => {
        if (!active) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.boxShadow = `0 0 24px ${isLive ? "rgba(192,132,252,0.18)" : "rgba(96,165,250,0.18)"}`;
      }}
      onMouseLeave={e => {
        if (!active) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}>
      <HudBrackets mode="dark" inset={6} size={16} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: accent }}>MODULE {m.n}</span>
        <span className="t-mono-s" style={{ color: accent, fontSize: 9 }}>{m.status}</span>
      </div>
      <h3 style={{
        fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 19,
        letterSpacing: "-0.01em", color: "var(--white)", margin: 0, lineHeight: 1.2,
      }}>{m.title}</h3>
      <div className="t-small" style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5, flex: 1 }}>
        {m.blurb}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>
          {m.lessons.length} LESSONS
          {(liveLessons + draftLessons) > 0 && ` · ${liveLessons + draftLessons} ACTIVE`}
        </span>
        {active && <span className="t-mono-s" style={{ color: accent, fontSize: 10 }}>ENTER →</span>}
      </div>
    </Wrap>
  );
}

// ─── Modules grid — consolidated into aligned rows of four ─────
const GROUP_ICONS = {
  "Foundations & Classical ML": <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="14" r="1.6" fill="#c084fc" /><circle cx="9" cy="9" r="1.6" fill="#c084fc" /><circle cx="13" cy="11" r="1.6" fill="#c084fc" /><circle cx="16" cy="5" r="1.6" fill="#c084fc" /><path d="M3 17 L17 3" stroke="#c084fc" strokeWidth="1" opacity="0.5" /></svg>,
  "Deep Learning Core": <svg width="20" height="20" viewBox="0 0 20 20" fill="none">{[4, 10, 16].map(x => [5, 10, 15].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="#c084fc" />))}<g stroke="#c084fc" strokeWidth="0.6" opacity="0.5"><line x1="4" y1="5" x2="10" y2="10" /><line x1="4" y1="15" x2="10" y2="10" /><line x1="10" y1="10" x2="16" y2="5" /><line x1="10" y1="10" x2="16" y2="15" /></g></svg>,
  "Advanced Deep Learning": <svg width="20" height="20" viewBox="0 0 20 20" fill="none">{[3, 7, 11].map((y, i) => <rect key={i} x={4 + i} y={y} width={12 - i * 2} height="3" rx="1" fill="#c084fc" opacity={0.5 + i * 0.2} />)}</svg>,
  "Adaptation, RL & Systems": <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="6" stroke="#c084fc" strokeWidth="1.4" /><circle cx="10" cy="10" r="2" fill="#c084fc" /><path d="M10 1 L10 4 M10 16 L10 19 M1 10 L4 10 M16 10 L19 10" stroke="#c084fc" strokeWidth="1.4" /></svg>,
  "LLMs, Applications & Production": <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="9" rx="2" stroke="#c084fc" strokeWidth="1.3" /><path d="M7 13 L7 16 L10 13" fill="#c084fc" /><path d="M6 7 H14 M6 10 H11" stroke="#c084fc" strokeWidth="1.2" strokeLinecap="round" /></svg>,
  "Agents, Trust & Career": <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#c084fc" strokeWidth="1.3" /><path d="M10 5 L11.4 8.6 L15 10 L11.4 11.4 L10 15 L8.6 11.4 L5 10 L8.6 8.6 Z" fill="#c084fc" opacity="0.9" /></svg>,
};
const ROW_GROUPS = [
  { name: "Foundations & Classical ML", lo: 1, hi: 4 },
  { name: "Deep Learning Core", lo: 5, hi: 8 },
  { name: "Advanced Deep Learning", lo: 9, hi: 12 },
  { name: "Adaptation, RL & Systems", lo: 13, hi: 16 },
  { name: "LLMs, Applications & Production", lo: 17, hi: 20 },
  { name: "Agents, Trust & Career", lo: 21, hi: 25 },
];

function ModulesGrid() {
  const mobile = useIsMobile();
  const groups = ROW_GROUPS.map(g => ({ ...g, items: CURR.modules.filter(m => { const n = parseInt(m.n, 10); return n >= g.lo && n <= g.hi; }) }));
  return (
    <Section id="modules">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          <MonoLabel>// CURRICULUM · 25 MODULES · 250 LESSONS</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(36px, 4vw, 52px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: 0, lineHeight: 1.05,
          }}>The full arc.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 620, fontSize: 16, marginTop: 4 }}>
            Each module has 10 self-contained notebooks. Within a module, lessons build on each other; across modules, read top-down or jump to whatever you need.
          </div>
        </div>

        {/* start anywhere */}
        <div style={{
          position: "relative", overflow: "hidden", marginBottom: 36,
          border: "1px dashed var(--border-violet)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.06) 0%, rgba(59,130,246,0.05) 100%)",
          padding: "20px 24px", display: "flex", flexDirection: mobile ? "column" : "row", gap: 16, alignItems: mobile ? "flex-start" : "center", justifyContent: "space-between",
        }}>
          <HudBrackets mode="dark" inset={8} size={16} />
          <div>
            <MonoLabel color="var(--violet-lt)">// START ANYWHERE</MonoLabel>
            <div className="t-body" style={{ color: "var(--white)", opacity: 0.9, fontSize: 15, lineHeight: 1.55, marginTop: 8, maxWidth: 680 }}>
              You don't have to begin at Module 1. Every notebook runs independently — "Restart &amp; Run All", no hidden dependencies — so pick the module that fits you. New to ML? Start with Foundations. Already comfortable? Jump straight to deep learning, LLMs, or RL. The repo README maps out suggested paths.
            </div>
          </div>
          <a href={REPO} target="_blank" rel="noopener" className="t-mono-s" style={{ whiteSpace: "nowrap", padding: "11px 18px", border: "1px solid var(--violet-lt)", borderRadius: 4, color: "var(--white)", textDecoration: "none", background: "rgba(168,85,247,0.12)" }}>READ THE GUIDE →</a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {groups.map(g => (
            <div key={g.name} style={{ scrollMarginTop: 100 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid var(--border-violet)", background: "rgba(168,85,247,0.08)", flexShrink: 0 }}>{GROUP_ICONS[g.name]}</span>
                <MonoLabel color="var(--violet-lt)">{g.name.toUpperCase()}</MonoLabel>
                <span style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.4 }} />
                <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>
                  MODULES {g.lo.toString().padStart(2, "0")}–{g.hi.toString().padStart(2, "0")}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
                {g.items.map(m => <ModuleCard key={m.slug} m={m} />)}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Philosophy ───────────────────────────────────────────────
function Philosophy() {
  const mobile = useIsMobile();
  const cols = [
    {
      tag: "// FROM SCRATCH",
      title: "NumPy before PyTorch.",
      blurb: "Build every algorithm with primitives first. Then port to a framework. You learn what the framework hides.",
    },
    {
      tag: "// MATH FIRST",
      title: "Derive, then code.",
      blurb: "The equation is the spec. Every lesson starts with the math and ends with a working implementation.",
    },
    {
      tag: "// REPRODUCIBLE",
      title: "Run it, break it.",
      blurb: "Every notebook runs end-to-end. Numbers in the text match numbers in the code. Always.",
    },
  ];
  return (
    <Section>
      <Container>
        <div style={{ marginBottom: 36 }}>
          <MonoLabel>// PRINCIPLES</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(32px, 3.6vw, 44px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: 0, lineHeight: 1.05, marginTop: 10,
          }}>How it works.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
          {cols.map(c => (
            <div key={c.tag} style={{
              padding: "26px 24px",
              border: "1px solid var(--border)", borderRadius: 6,
              background: "rgba(13, 24, 52, 0.4)",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <MonoLabel>{c.tag}</MonoLabel>
              <h3 style={{
                fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 22,
                letterSpacing: "-0.01em", color: "var(--white)", margin: 0,
              }}>{c.title}</h3>
              <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{c.blurb}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, maxWidth: 760, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "rgba(5,8,22,0.6)" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#f87171" }} />
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#fbbf24" }} />
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "#34d399" }} />
            <span className="t-mono-s" style={{ color: "var(--muted)", marginLeft: 8 }}>every lesson, in spirit</span>
          </div>
          <pre style={{ margin: 0, padding: "18px 20px", overflowX: "auto" }}><code className="t-mono" style={{ color: "var(--blue-br)", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre" }}>{`# derive the math, then implement it -- no black boxes
for _ in range(epochs):
    y_hat = X @ w + b
    grad_w = X.T @ (y_hat - y) / n   # the gradient, by hand
    w -= lr * grad_w                 # ...then graduate to the framework`}</code></pre>
        </div>
      </Container>
    </Section>
  );
}

// ─── CTA strip ────────────────────────────────────────────────
function LearnCta() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Container>
        <div style={{
          position: "relative", overflow: "hidden",
          padding: "44px 44px",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(59,130,246,0.08) 0%, rgba(168,85,247,0.08) 100%)",
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.4fr auto", gap: 32, alignItems: "center",
        }}>
          <GlowBlob color="violet" size={300} x={-50} y={"40%"} opacity={0.25} />
          <HudBrackets mode="dark" inset={10} size={22} />
          <div>
            <MonoLabel>// FOLLOW ALONG</MonoLabel>
            <h3 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 34,
              letterSpacing: "-0.02em", color: "var(--white)", margin: "10px 0 12px",
            }}>Self-guided notebooks, free and updated.</h3>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 600, fontSize: 15, lineHeight: 1.55 }}>
              The notebooks live on GitHub — each self-contained and runnable end-to-end, with new modules landing over time. Video walkthroughs and applied case studies are planned.
            </div>
          </div>
          <a href={REPO} target="_blank" rel="noopener" style={{
            padding: "14px 26px", border: "1px solid var(--blue-lt)",
            borderRadius: 4, color: "var(--white)", textDecoration: "none",
            fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            background: "rgba(59,130,246,0.18)",
            boxShadow: "0 0 28px rgba(59,130,246,0.28)",
            whiteSpace: "nowrap",
          }}>BROWSE ON GITHUB →</a>
        </div>
      </Container>
    </Section>
  );
}

function OtherCourse() {
  const topics = ["NLP", "Computer Vision", "Audio", "Multimodal", "Best Practices", "Agentic & RAG"];
  return (
    <Section style={{ paddingTop: 12, paddingBottom: 24 }}>
      <Container>
        <div style={{ marginBottom: 18 }}>
          <MonoLabel>// OTHER COURSES</MonoLabel>
          <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(28px, 3vw, 40px)", letterSpacing: "-0.02em", color: "var(--white)", margin: "10px 0 0", lineHeight: 1.05 }}>Also in the library.</h2>
        </div>
        <a href={`${BASE}learn/huggingface/`} style={{
          position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 24, flexWrap: "wrap",
          padding: "26px 30px", border: "1px solid var(--border-violet)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.12) 0%, rgba(59,130,246,0.08) 100%)",
          textDecoration: "none", color: "inherit",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.boxShadow = "0 0 28px rgba(192,132,252,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-violet)"; e.currentTarget.style.boxShadow = "none"; }}>
          <HudBrackets mode="dark" inset={10} size={20} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <MonoLabel color="var(--violet-lt)">// APPLIED · HANDS-ON</MonoLabel>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 26, color: "var(--white)", marginTop: 8 }}>
              HuggingFace Tutorial
            </div>
            <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, marginTop: 6, maxWidth: 640, lineHeight: 1.5 }}>
              The applied companion to this from-scratch curriculum — pretrained models put to work end to end. Topics covered:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {topics.map(t => (
                <span key={t} className="t-mono-s" style={{ padding: "4px 10px", border: "1px solid var(--border-violet)", borderRadius: 999, color: "var(--violet-lt)", fontSize: 10, letterSpacing: "0.06em" }}>{t}</span>
              ))}
            </div>
          </div>
          <span className="t-mono-s" style={{ color: "var(--violet-lt)", whiteSpace: "nowrap" }}>EXPLORE →</span>
        </a>
      </Container>
    </Section>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <LearnHero />
      <ModulesGrid />
      <Philosophy />
      <LearnCta />
      <OtherCourse />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
