// lesson-app.jsx — lesson page template.
//
// Each lesson HTML stub sets:
//   window.__DM_BASE         = "../../../"
//   window.__DM_PAGE         = "learn"
//   window.__DM_MODULE_SLUG  = "transformers"
//   window.__DM_LESSON_SLUG  = "self-attention"
// THEN loads chrome.jsx, curriculum.js, this file, and finally a lesson content
// file (e.g. lessons/self-attention.jsx) which sets `window.__DM_LESSON_CONTENT`
// to a React component that renders the lesson body.
//
// The lesson body is structured as the 6 "parts" mirroring the notebook:
//   Part 0 — Setup
//   Part 1 — From Scratch
//   Part 2 — Assembly
//   Part 3 — Training
//   Part 4 — Evaluation
//   Part 5 — Summary
//
// Lesson content files use the helper components exported here on `window`:
//   <LessonSection n="01" title="From Scratch" tag="// MATH + NUMPY"> ... </LessonSection>
//   <P> paragraph </P>
//   <MathBlock>{`L = -\\mathbb{E}[\\log p(y|x)]`}</MathBlock>
//   <MathInline>{`x_i`}</MathInline>
//   <CodeBlock lang="python">{`...`}</CodeBlock>
//   <KeyInsight title="Why this works">...</KeyInsight>
//   <TryThis>What happens if you ...</TryThis>
//   <Aside type="math">For the curious ...</Aside>
//   <Diagram caption="..."><NeuralNet ... /></Diagram>

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, ConstructionBadge,
} = window;
const { useEffect: __useEffect, useRef: __useRef } = React;

const CURR = window.CURRICULUM;
const REPO = CURR.repo;
const BASE = window.__DM_BASE || "../../../";
const MODULE_SLUG = window.__DM_MODULE_SLUG;
const LESSON_SLUG = window.__DM_LESSON_SLUG;
const MODULE = CURR.findModule(MODULE_SLUG);
const LESSON = MODULE && MODULE.lessons.find(l => l.slug === LESSON_SLUG);

// ─── 6-part canonical structure ───────────────────────────────
const PARTS = [
  { n: "0", id: "setup",       title: "Setup",        tag: "// IMPORTS + DATA" },
  { n: "1", id: "from-scratch",title: "From Scratch", tag: "// MATH + NUMPY" },
  { n: "2", id: "assembly",    title: "Assembly",     tag: "// nn.Module" },
  { n: "3", id: "training",    title: "Training",     tag: "// TRAIN + COMPARE" },
  { n: "4", id: "evaluation",  title: "Evaluation",   tag: "// METRICS + ABLATION" },
  { n: "5", id: "summary",     title: "Summary",      tag: "// TAKEAWAYS" },
];

// ─── Layout primitives ────────────────────────────────────────
function P({ children }) {
  return (
    <p style={{
      fontFamily: "var(--f-body)", fontSize: 17, lineHeight: 1.7,
      color: "var(--white)", margin: "16px 0", textWrap: "pretty",
      maxWidth: 720,
    }}>{children}</p>
  );
}

function H3({ children }) {
  return (
    <h3 style={{
      fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 24,
      letterSpacing: "-0.015em", color: "var(--white)",
      margin: "36px 0 8px", lineHeight: 1.3,
    }}>{children}</h3>
  );
}

function LessonSection({ n, title, tag, id, children }) {
  const sectionId = id || PARTS.find(p => p.n === n)?.id || `part-${n}`;
  return (
    <section id={sectionId} data-screen-label={`part-${n}`}
      style={{ padding: "60px 0", borderTop: "1px solid var(--border)", scrollMarginTop: 80 }}>
      <Container>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <span style={{
            fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 56,
            color: "var(--violet-lt)", letterSpacing: "-0.04em", lineHeight: 1,
            opacity: 0.6,
          }}>{n}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tag && <MonoLabel color="var(--blue-lt)">{tag}</MonoLabel>}
            <h2 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 40,
              letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05,
            }}>{title}</h2>
          </div>
        </div>
        <div>{children}</div>
      </Container>
    </section>
  );
}

// ─── Math — KaTeX block ───────────────────────────────────────
function MathBlock({ children }) {
  const ref = __useRef(null);
  __useEffect(() => {
    if (window.katex && ref.current) {
      try {
        window.katex.render(children, ref.current, {
          displayMode: true,
          throwOnError: false,
          output: "html",
        });
      } catch (e) { ref.current.textContent = children; }
    }
  }, [children]);
  return (
    <div style={{
      margin: "20px 0", padding: "18px 24px",
      background: "rgba(13, 24, 52, 0.4)",
      border: "1px solid var(--border)", borderRadius: 6,
      overflowX: "auto", color: "var(--blue-br)",
      fontSize: 18, textAlign: "center",
    }}>
      <span ref={ref}>{children}</span>
    </div>
  );
}

function MathInline({ children }) {
  const ref = __useRef(null);
  __useEffect(() => {
    if (window.katex && ref.current) {
      try {
        window.katex.render(children, ref.current, {
          displayMode: false, throwOnError: false, output: "html",
        });
      } catch (e) { ref.current.textContent = children; }
    }
  }, [children]);
  return <span ref={ref} style={{ color: "var(--blue-br)" }}>{children}</span>;
}

// ─── Code block — Prism ───────────────────────────────────────
function CodeBlock({ lang = "python", children }) {
  const ref = __useRef(null);
  __useEffect(() => {
    if (window.Prism && ref.current) {
      window.Prism.highlightElement(ref.current);
    }
  }, [children]);
  return (
    <pre style={{
      margin: "20px 0", padding: 0, borderRadius: 6,
      border: "1px solid var(--border)",
      background: "#0a1428",
      overflowX: "auto",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 16px", borderBottom: "1px solid var(--border)",
        background: "rgba(168,85,247,0.06)",
      }}>
        <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10 }}>{lang.toUpperCase()}</span>
        <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>// CODE</span>
      </div>
      <code ref={ref} className={`language-${lang}`}
        style={{
          display: "block", padding: "16px 18px",
          fontFamily: "var(--f-mono)", fontSize: 13.5, lineHeight: 1.65,
        }}>{children}</code>
    </pre>
  );
}

// ─── Callouts ─────────────────────────────────────────────────
function Callout({ tone, label, title, children }) {
  const palette = {
    insight: { accent: "var(--blue-lt)",   bg: "rgba(59,130,246,0.06)", border: "var(--border)" },
    "try":    { accent: "var(--violet-lt)", bg: "rgba(168,85,247,0.06)", border: "var(--border-violet)" },
    aside:    { accent: "var(--muted)",    bg: "rgba(13,24,52,0.4)",    border: "var(--border)" },
    warn:     { accent: "#fbbf24",         bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.4)" },
  }[tone] || {};
  return (
    <div style={{
      margin: "20px 0", padding: "18px 22px",
      background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 6,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: title ? 8 : 0 }}>
        <span style={{
          width: 6, height: 6, borderRadius: 999,
          background: palette.accent, boxShadow: `0 0 8px ${palette.accent}`,
        }} />
        <span className="t-mono-s" style={{ color: palette.accent, fontSize: 10 }}>{label}</span>
      </div>
      {title && (
        <h4 style={{
          fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18,
          letterSpacing: "-0.01em", color: "var(--white)", margin: "0 0 8px",
        }}>{title}</h4>
      )}
      <div style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}
function KeyInsight({ title, children }) { return <Callout tone="insight" label="// KEY INSIGHT" title={title}>{children}</Callout>; }
function TryThis({ title, children })    { return <Callout tone="try"     label="// TRY THIS"   title={title}>{children}</Callout>; }
function Aside({ title, children })      { return <Callout tone="aside"   label="// ASIDE"     title={title}>{children}</Callout>; }
function Warn({ title, children })       { return <Callout tone="warn"    label="// HEADS UP"  title={title}>{children}</Callout>; }

// ─── Diagram wrapper ──────────────────────────────────────────
function Diagram({ caption, children }) {
  return (
    <figure style={{
      margin: "28px 0", padding: 20,
      background: "rgba(13, 24, 52, 0.4)",
      border: "1px solid var(--border)", borderRadius: 6,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      <div>{children}</div>
      {caption && (
        <figcaption className="t-mono-s"
          style={{ color: "var(--muted)", fontSize: 11, textAlign: "center" }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ─── Reading progress bar (fixed top, under nav) ──────────────
function ProgressBar() {
  const ref = __useRef(null);
  __useEffect(() => {
    const onScroll = () => {
      const sc = document.documentElement;
      const total = sc.scrollHeight - sc.clientHeight;
      const pct = total > 0 ? (sc.scrollTop / total) * 100 : 0;
      if (ref.current) ref.current.style.width = `${pct}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div style={{
      position: "fixed", top: 62, left: 0, right: 0, height: 2,
      background: "transparent", zIndex: 99, pointerEvents: "none",
    }}>
      <div ref={ref} style={{
        height: 2, width: "0%",
        background: "linear-gradient(90deg, #3b82f6, #a855f7)",
        boxShadow: "0 0 8px rgba(168,85,247,0.6)",
        transition: "width .08s linear",
      }} />
    </div>
  );
}

// ─── Lesson hero ──────────────────────────────────────────────
function LessonHero() {
  if (!LESSON || !MODULE) {
    return (
      <Section padded={false} style={{ paddingTop: 200 }}>
        <Container>
          <MonoLabel color="var(--violet-lt)">// ERROR · LESSON NOT FOUND</MonoLabel>
          <h1 style={{ color: "var(--white)", fontFamily: "var(--f-display)", fontSize: 48, marginTop: 12 }}>
            Lesson not found.
          </h1>
          <p style={{ color: "var(--muted)" }}>
            module=<code>{MODULE_SLUG}</code>, lesson=<code>{LESSON_SLUG}</code> doesn't match anything in curriculum.js.
          </p>
        </Container>
      </Section>
    );
  }
  const ipynb = CURR.notebookUrl(MODULE_SLUG, LESSON_SLUG);
  // Colab only makes sense for a direct .ipynb link; notebookUrl may point at the
  // module folder until notebook filenames are aligned with the curriculum.
  const isNotebookFile = ipynb.endsWith(".ipynb");
  const colab = isNotebookFile ? ipynb.replace("github.com", "colab.research.google.com/github") : null;
  const isLive = LESSON.status === "LIVE";

  return (
    <Section id="top" padded={false} style={{ paddingTop: 120, paddingBottom: 48, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.35} />
      <GlowBlob color="violet" size={420} x={"-8%"} y={"-30%"} opacity={0.2} />
      <GlowBlob color="blue" size={380} x={"75%"} y={"50%"} opacity={0.18} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={parseInt(LESSON.n.replace("-","")) || 1} />
      <HudBrackets mode="dark" inset={32} size={32} />

      {/* breadcrumb */}
      <Container style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href={BASE + "learn/"} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <a href={`${BASE}learn/${MODULE.slug}/`} className="t-mono-s"
            style={{ color: "var(--muted)", textDecoration: "none" }}>
            MODULE {MODULE.n} · {MODULE.title.toUpperCase()}
          </a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel color="var(--blue-lt)">LESSON {LESSON.n}</MonoLabel>
        </div>
      </Container>

      <Container style={{ maxWidth: 920 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <MonoLabel>LESSON {LESSON.n}</MonoLabel>
            {!isLive && LESSON.status === "DRAFT" && <ConstructionBadge>DRAFT · CONTENT EVOLVING</ConstructionBadge>}
            {LESSON.status === "PENDING" && <ConstructionBadge>PENDING · COMING SOON</ConstructionBadge>}
            {isLive && <span className="t-mono-s" style={{
              color: "var(--violet-lt)", border: "1px solid var(--violet-lt)",
              padding: "4px 10px", borderRadius: 999,
            }}>● LIVE</span>}
          </div>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(40px, 5vw, 72px)", letterSpacing: "-0.025em",
            lineHeight: 1.02, margin: 0,
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>{LESSON.title}</h1>
          {/* CTAs */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <a href={ipynb} target="_blank" rel="noopener" style={{
              padding: "12px 22px", border: "1px solid var(--blue)",
              borderRadius: 4, color: "var(--white)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
              background: "rgba(59,130,246,0.08)",
              boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>{isNotebookFile ? "↓ DOWNLOAD NOTEBOOK" : "NOTEBOOKS ON GITHUB →"}</a>
            {colab && <a href={colab} target="_blank" rel="noopener" style={{
              padding: "12px 22px", border: "1px solid var(--border-violet)",
              borderRadius: 4, color: "var(--violet-lt)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            }}>OPEN IN COLAB →</a>}
          </div>
        </div>
      </Container>
    </Section>
  );
}

// ─── Sticky outline strip (jump to parts) ─────────────────────
function OutlineStrip() {
  return (
    <div style={{
      position: "sticky", top: 64, zIndex: 50,
      background: "rgba(5, 8, 22, 0.92)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
    }}>
      <Container style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 48px", overflowX: "auto",
      }}>
        <span className="t-mono-s" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>// OUTLINE</span>
        {PARTS.map(p => (
          <a key={p.id} href={`#${p.id}`} className="t-mono-s"
            style={{
              color: "var(--blue-br)", padding: "6px 10px",
              borderRadius: 3, textDecoration: "none",
              whiteSpace: "nowrap", letterSpacing: "0.1em",
              transition: "background .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {p.n} · {p.title}
          </a>
        ))}
      </Container>
    </div>
  );
}

// ─── Prev / Next nav ──────────────────────────────────────────
function PrevNext() {
  if (!LESSON || !MODULE) return null;
  const { prev, next } = CURR.prevNext(MODULE_SLUG, LESSON_SLUG);
  const tile = (item, dir) => item && (
    <a href={
      item.module.slug === MODULE.slug
        ? `../${item.lesson.slug}/`
        : `../../${item.module.slug}/${item.lesson.slug}/`
    } style={{
      flex: 1,
      padding: "22px 24px",
      border: "1px solid var(--border)", borderRadius: 6,
      background: "rgba(13, 24, 52, 0.5)",
      textDecoration: "none", color: "inherit",
      transition: "border-color .2s, transform .15s",
      display: "flex", flexDirection: "column", gap: 6,
      textAlign: dir === "prev" ? "left" : "right",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue-lt)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>
        {dir === "prev" ? "← LESSON " + item.lesson.n : "LESSON " + item.lesson.n + " →"}
      </span>
      <span style={{
        fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18,
        color: "var(--white)", letterSpacing: "-0.01em",
      }}>{item.lesson.title}</span>
      {item.module.slug !== MODULE.slug && (
        <span className="t-mono-s" style={{ color: "var(--blue-lt)", fontSize: 10 }}>
          {dir === "prev" ? "" : ""}MODULE {item.module.n} · {item.module.title}
        </span>
      )}
    </a>
  );
  return (
    <Section style={{ paddingTop: 32, paddingBottom: 60, borderTop: "1px solid var(--border)" }}>
      <Container>
        <div style={{ marginBottom: 16 }}>
          <MonoLabel>// NAVIGATE</MonoLabel>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {tile(prev, "prev") || <div style={{ flex: 1 }} />}
          {tile(next, "next") || <div style={{ flex: 1 }} />}
        </div>
      </Container>
    </Section>
  );
}

// ─── Body renderer ────────────────────────────────────────────
function LessonBody() {
  const Content = window.__DM_LESSON_CONTENT;
  if (!Content) {
    return (
      <Section>
        <Container>
          <Callout tone="aside" label="// CONTENT PENDING" title="This lesson hasn't been written yet.">
            The content for <code>{LESSON_SLUG}</code> in module <code>{MODULE_SLUG}</code> isn't loaded.
            Lessons are added by creating a content file at <code>lessons/{LESSON_SLUG}.jsx</code>.
            For now, browse the source notebook on GitHub.
          </Callout>
        </Container>
      </Section>
    );
  }
  return <Content />;
}

// Expose helpers to lesson content files
Object.assign(window, {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn, Diagram,
});

// ─── App ──────────────────────────────────────────────────────
function App() {
  return (
    <>
      <TopNav />
      <ProgressBar />
      <LessonHero />
      <OutlineStrip />
      <LessonBody />
      <PrevNext />
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
