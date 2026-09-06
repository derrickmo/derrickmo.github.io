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

// READ AT USE, NOT AT MODULE SCOPE (PF-0020): Vite orders this page's module scripts
// by the import graph, not DOM order, and nothing here imports curriculum.js. The
// derived lookups below are guarded so an unlucky order degrades this page instead of
// throwing at module scope, which is what blanks a page with nothing reporting it.
const curr = () => window.CURRICULUM;
const REPO = (() => { const c = curr(); return c ? c.repo : "#"; })();
const BASE = window.__DM_BASE || "../../../";
const MODULE_SLUG = window.__DM_MODULE_SLUG;
const LESSON_SLUG = window.__DM_LESSON_SLUG;
// Store-authored lesson body (Phase C): the per-lesson data file
// lesson-bodies/<module>/<lesson>.js sets
// window.DM_LESSON_BODIES = { [lessonSlug]: { level, body, interview, flashcards, refs } }.
//
// Read at RENDER time, not module scope. This used to be a module-scope const on the
// assumption that the body script always executes first, which held only while the file
// was a per-MODULE bundle shared by ten pages — Vite kept that as its own chunk. Once
// PF-0020 split it per lesson, a body used by exactly one page gets inlined into that
// page's entry chunk and no longer runs before this module, so the const captured null
// and every lesson body silently vanished while the data sat on window. Same class of
// bug as __DM_LESSON_CONTENT below; same fix.
const storeData = () => (window.DM_LESSON_BODIES || {})[LESSON_SLUG] || null;
const MODULE = curr() ? curr().findModule(MODULE_SLUG) : null;
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

// Outline for store-authored lessons (different structure than notebook flagships)
const STORE_PARTS = [
  { n: "1", id: "intuition",  title: "Intuition",   tag: "// THE IDEA" },
  { n: "2", id: "math",       title: "The Math",    tag: "// NOTATION + MEANING" },
  { n: "3", id: "code",       title: "Code",        tag: "// PYTHON" },
  { n: "4", id: "practice",   title: "In Practice", tag: "// USES + PITFALLS" },
  { n: "5", id: "interview",  title: "Interview",   tag: "// 3-TIER Q&A" },
  { n: "6", id: "flashcards", title: "Flashcards",  tag: "// DRILL" },
];

// A legacy flagship page owns its own body (lessons/<slug>.jsx) but can still carry
// the store's DRILL LAYER — interview + flashcards + refs — with no store body. Those
// two sections then follow the flagship's 6 parts, so they are numbered 6 and 7.
const DRILL_PARTS = [
  { n: "6", id: "interview",  title: "Interview",   tag: "// 3-TIER Q&A" },
  { n: "7", id: "flashcards", title: "Flashcards",  tag: "// DRILL" },
];
const hasStoreBody = (d) => !!(d && d.body);
const hasDrill = (d) => !!(d && (
  (d.interview && ((d.interview.quickGrind || []).length || (d.interview.standard || []).length)) ||
  (d.flashcards || []).length
));
// Read at RENDER time: the flagship's lessons/<slug>.jsx loads AFTER this file, so
// window.__DM_LESSON_CONTENT does not exist yet at module scope.
function outlineParts() {
  const d = storeData();
  if (window.__DM_LESSON_CONTENT) return hasDrill(d) ? [...PARTS, ...DRILL_PARTS] : PARTS;
  return hasStoreBody(d) ? STORE_PARTS : PARTS;
}

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
  const ipynb = curr().notebookUrl(MODULE_SLUG, LESSON_SLUG);
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
        {outlineParts().map(p => (
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
  const { prev, next } = curr().prevNext(MODULE_SLUG, LESSON_SLUG);
  const tile = (item, dir) => item && (
    <a href={
      item.module.slug === MODULE.slug
        ? `../${item.lesson.slug}/`
        : `../../${item.module.slug}/${item.lesson.slug}/`
    } style={{
      // flex:1 + the default content-box put the 48px of horizontal padding OUTSIDE the
      // flex basis, and min-width:auto floored each tile at its min-content width — so at
      // 375px the pair came to 363px inside a 320px container and the right-hand tile lost
      // 8px off the page. Basis + wrap is the idiom already used by the concept cards: side
      // by side while they fit, stacked when they do not, at every width and with no
      // JS breakpoint.
      flex: "1 1 260px", minWidth: 0, boxSizing: "border-box",
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
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {tile(prev, "prev") || <div style={{ flex: "1 1 260px" }} />}
          {tile(next, "next") || <div style={{ flex: "1 1 260px" }} />}
        </div>
      </Container>
    </Section>
  );
}

// ─── Store-authored body renderer (Phase C) ───────────────────
// The body bundle now carries the real registry title of every demo the lesson names
// (gen-lesson-pages embeds only those, so the 76 kB registry still never reaches a lesson
// page). This slug fallback stays for a bundle generated before that change - it title-cases,
// which is why an ML page could read "Mle" or "Dqn" and why the titles are the right source.
const DEMO_ACRONYMS = { roc: "ROC", svm: "SVM", knn: "kNN", pr: "PR", glm: "GLM", rbf: "RBF", pca: "PCA", knn2: "kNN" };
const demoLabel = (slug, titles) =>
  (titles && titles[slug]) ||
  slug.split("-").map((w) => DEMO_ACRONYMS[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function StoreLessonBody({ data }) {
  const b = data.body || {};
  const iv = data.interview || {};
  const cards = data.flashcards || [];
  const refs = data.refs || [];
  const demos = data.demos || [];
  const demoTitles = data.demoTitles || {};
  const linkOf = (ref) => {
    if (!ref) return null;
    const [ms] = ref.split("/");
    return curr() && curr().findModule(ms) ? `${BASE}learn/${ms}/` : null;
  };
  return (
    <>
      <LessonSection n="1" id="intuition" title="Intuition" tag="// THE IDEA">
        {(b.intuition || []).map((t, i) => <P key={i}>{t}</P>)}
      </LessonSection>

      <LessonSection n="2" id="math" title="The Math" tag="// NOTATION + MEANING">
        {(b.math || []).map((m, i) => (
          <div key={i}>
            <H3>{m.h}</H3>
            {(m.paras || []).map((t, j) => <P key={j}>{t}</P>)}
            <MathBlock>{m.tex}</MathBlock>
            {/* maxWidth 720 = the prose column. These notes are not labels: all 604 of
                them are sentences (median 260 chars, max 587), and unconstrained they ran
                1280px -- 1.78x wider than the paragraphs they annotate. */}
            {m.texNote && (
              <p className="t-mono-s" style={{ color: "var(--muted)", fontSize: 11, textAlign: "center", margin: "-8px auto 20px", maxWidth: 720, textTransform: "none", letterSpacing: "0.01em" }}>
                {m.texNote}
              </p>
            )}
          </div>
        ))}
      </LessonSection>

      <LessonSection n="3" id="code" title="Code" tag="// PYTHON">
        {(b.code || []).map((c, i) => (
          <div key={i}>
            <H3>{c.h}</H3>
            {(c.paras || []).map((t, j) => <P key={j}>{t}</P>)}
            <CodeBlock>{c.code}</CodeBlock>
            {/* maxWidth 720 = the prose column, same reason as the math note above:
                a caption should not be wider than the paragraphs it sits among. */}
            {c.caption && (
              <p className="t-mono-s" style={{ color: "var(--muted)", fontSize: 11, margin: "-8px 0 20px", maxWidth: 720, textTransform: "none", letterSpacing: "0.01em" }}>{c.caption}</p>
            )}
          </div>
        ))}
      </LessonSection>

      <LessonSection n="4" id="practice" title="In Practice" tag="// USES + PITFALLS">
        <KeyInsight title="Where this shows up">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(b.useCases || []).map((t, i) => <li key={i} style={{ margin: "6px 0" }}>{t}</li>)}
          </ul>
        </KeyInsight>
        <Warn title="How it bites">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(b.pitfalls || []).map((t, i) => <li key={i} style={{ margin: "6px 0" }}>{t}</li>)}
          </ul>
        </Warn>
        {(b.connections || []).length > 0 && (
          <Aside title="Connections across the curriculum">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {b.connections.map((c, i) => {
                const href = linkOf(c.ref);
                return (
                  <li key={i} style={{ margin: "6px 0" }}>
                    {href ? <a href={href} style={{ color: "var(--blue-lt)" }}>{c.ref}</a> : null}
                    {href ? " — " : ""}{c.text}
                  </li>
                );
              })}
            </ul>
          </Aside>
        )}
        {demos.length > 0 && (
          <Aside title="Try it interactively">
            <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: 14 }}>
              Interactive visualizations for the ideas in this lesson:
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {demos.map((slug, i) => (
                <li key={i} style={{ margin: "6px 0" }}>
                  <a href={`${BASE}visualize/${slug}/`} style={{ color: "var(--blue-lt)" }}>{demoLabel(slug, demoTitles)}</a>
                </li>
              ))}
            </ul>
          </Aside>
        )}
      </LessonSection>

      <DrillSections iv={iv} cards={cards} refs={refs} nInterview="5" nFlashcards="6" />
    </>
  );
}

// ─── Drill layer (Interview + Flashcards + refs) ──────────────
// Extracted from StoreLessonBody so a legacy FLAGSHIP page can render it too: the
// flagship owns the body, the store supplies only the drill. Section numbers are
// parameterised because they are 5/6 after a store body and 6/7 after a flagship's
// six parts.
function DrillSections({ iv, cards, refs, nInterview, nFlashcards }) {
  iv = iv || {}; cards = cards || []; refs = refs || [];
  return (
    <>
      <LessonSection n={nInterview} id="interview" title="Interview" tag="// 3-TIER Q&A">
        <H3>Quick grind — one-liners you should own</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(iv.quickGrind || []).map((qa, i) => (
            <details key={i} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "10px 16px", background: "rgba(13,24,52,0.4)" }}>
              <summary style={{ cursor: "pointer", color: "var(--white)", fontSize: 15 }}>{qa.q}</summary>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "10px 0 2px", lineHeight: 1.6 }}>{qa.a}</p>
            </details>
          ))}
        </div>
        <H3>Standard — complete answers with deep-dives</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(iv.standard || []).map((qa, i) => {
            // Some modules ship deepDive as a bare string instead of {q,a}. Read it as an
            // answer continuation with no follow-up question — never as an empty box.
            const dd = typeof qa.deepDive === "string" ? { q: null, a: qa.deepDive } : qa.deepDive;
            return (
              <details key={i} style={{ border: "1px solid var(--border-violet, var(--border))", borderRadius: 6, padding: "12px 18px", background: "rgba(13,24,52,0.4)" }}>
                <summary style={{ cursor: "pointer", color: "var(--white)", fontSize: 15.5, fontWeight: 500 }}>{qa.q}</summary>
                <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "12px 0", lineHeight: 1.65 }}>{qa.a}</p>
                {dd && dd.a && (
                  <div style={{ borderLeft: "2px solid var(--violet-lt)", paddingLeft: 14, margin: "10px 0 4px" }}>
                    <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10 }}>{dd.q ? `// DEEP DIVE — ${dd.q}` : "// DEEP DIVE"}</span>
                    <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 0", lineHeight: 1.6 }}>{dd.a}</p>
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </LessonSection>

      <LessonSection n={nFlashcards} id="flashcards" title="Flashcards" tag="// DRILL">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {cards.map((c, i) => (
            <details key={i} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px", background: "rgba(13,24,52,0.4)" }}>
              <summary style={{ cursor: "pointer", color: "var(--white)", fontSize: 14.5 }}>
                <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 9, marginRight: 8 }}>{(c.type || "card").toUpperCase()}</span>
                {c.front}
              </summary>
              <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "10px 0 2px", lineHeight: 1.6 }}>{c.back}</p>
            </details>
          ))}
        </div>
        {refs.length > 0 && (
          <Aside title="References">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {refs.map((r, i) => (
                <li key={i} style={{ margin: "6px 0" }}>
                  <a href={r.url} target="_blank" rel="noopener" style={{ color: "var(--blue-lt)" }}>{r.title}</a>
                </li>
              ))}
            </ul>
          </Aside>
        )}
      </LessonSection>
    </>
  );
}

// ─── Body renderer ────────────────────────────────────────────
function LessonBody() {
  const Content = window.__DM_LESSON_CONTENT;
  // Flagship page: it owns the body. If the store also carries a drill layer for this
  // lesson (interview/flashcards/refs, no store body), append it after the flagship's
  // six parts — that is how a legacy-jsx lesson gets interview content without losing
  // its hand-built visuals.
  const data = storeData();
  if (Content && hasDrill(data)) {
    return (
      <>
        <Content />
        <DrillSections
          iv={data.interview} cards={data.flashcards} refs={data.refs}
          nInterview="6" nFlashcards="7" />
      </>
    );
  }
  if (!Content && data) return <StoreLessonBody data={data} />;
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
      <main id="main" tabIndex={-1}>
      <ProgressBar />
      <LessonHero />
      <OutlineStrip />
      <LessonBody />
      <PrevNext />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
