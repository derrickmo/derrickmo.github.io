// demo-chrome.jsx — shared layout for a single Play demo page.
// Provides DemoLayout: header + (stage | controls) + explainer, wrapped in the
// site nav/footer. Loaded after chrome.jsx + controls.jsx, before the demo app.

const {
  HudBrackets, GridOverlay, GlowBlob,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  Connections,
} = window;

// Resolve concept ids for the current page from its slug + registry tags.
// Tries demos first, then games — the slug + the back-link tell us which.
function __resolveAutoConcepts(slug, backHref) {
  const TAGS = window.CONCEPT_TAGS;
  if (!TAGS || !slug) return [];
  const isGame = !!(backHref && /\/play\/?$/.test(backHref));
  const fromKind = (k) => (TAGS[k] && TAGS[k][slug]) || [];
  // Prefer the "right" registry, fall back to the other in case the back-link
  // is set unusually.
  return isGame ? (fromKind("games").length ? fromKind("games") : fromKind("demos"))
                : (fromKind("demos").length ? fromKind("demos") : fromKind("games"));
}

const _BASE = window.__DM_BASE || "../../";
const { useState: _useState, useEffect: _useEffect } = React;

// "Part of these learning paths" callout. paths.js isn't loaded on demo pages by
// default, so lazy-inject it once, then render the paths that include this item.
function PathsCallout({ kind, refId, accent }) {
  const [, setTick] = _useState(0);
  _useEffect(() => {
    if (window.LEARNING_PATHS || !refId) return;
    if (document.querySelector("script[data-dm-paths]")) return;
    const s = document.createElement("script");
    s.type = "module"; s.src = (window.__DM_BASE || "../../") + "paths.js"; s.setAttribute("data-dm-paths", "1");
    s.onload = () => setTick(t => t + 1);
    document.body.appendChild(s);
  }, [refId]);
  const list = (window.DM_PATHS_FOR && refId) ? window.DM_PATHS_FOR(kind, refId) : [];
  if (!list.length) return null;
  const BASE = window.__DM_BASE || "../../";
  return (
    <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
      <MonoLabel color={accent}>// PART OF THESE LEARNING PATHS</MonoLabel>
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
    </div>
  );
}

function DemoLayout({ topic, title, subtitle, stage, controls, explainer, concepts, relatedConcepts, lessonHref, repoHref, tone = "blue", backHref, backLabel = "VISUALIZE" }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  const mobile = useIsMobile();
  const _backHref = backHref || `${_BASE}visualize/`;
  // Auto-derive concept ids from the page slug if the caller didn't pass any.
  // Demos set window.__DM_DEMO_SLUG so the side-table can find their entry.
  const _slug = typeof window !== "undefined" ? window.__DM_DEMO_SLUG : null;
  const _conceptIds = (relatedConcepts && relatedConcepts.length)
    ? relatedConcepts
    : __resolveAutoConcepts(_slug, _backHref);
  return (
    <>
      <TopNav />
      <Section id="top" padded={false} style={{ paddingTop: 132, paddingBottom: 48, position: "relative", overflow: "hidden" }}>
        <GridOverlay mode="dark" spacing={80} opacity={0.35} />
        <GlowBlob color={tone} size={460} x={"80%"} y={"-10%"} opacity={0.18} />
        <HudBrackets mode="dark" inset={28} size={28} />
        <Container>
          {/* breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <a href={_backHref} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← {backLabel}</a>
            <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
            <MonoLabel color={accent}>{topic}</MonoLabel>
          </div>

          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(36px, 4.5vw, 60px)", letterSpacing: "-0.025em",
            lineHeight: 1.0, margin: 0, color: "var(--white)",
          }}>{title}</h1>
          {subtitle && (
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 680, fontSize: 17, lineHeight: 1.55, marginTop: 14 }}>
              {subtitle}
            </div>
          )}

          {/* stage | controls */}
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1fr) 300px", gap: 24, marginTop: 36, alignItems: "start" }}>
            <div role="group" aria-label={`${title} — interactive visualization`} style={{
              position: "relative", overflow: "hidden",
              border: "1px solid var(--border)", borderRadius: 8,
              background: "rgba(5, 8, 22, 0.6)", padding: 16,
              display: "flex", alignItems: "center", justifyContent: "center", minHeight: 360,
            }}>
              <HudBrackets mode="dark" inset={8} size={18} />
              {stage}
            </div>
            <div style={{
              border: "1px solid var(--border)", borderRadius: 8,
              background: "rgba(13, 24, 52, 0.4)", padding: "20px 18px",
            }}>
              {controls}
            </div>
          </div>
        </Container>
      </Section>

      {explainer && (
        <Section style={{ paddingTop: 8, paddingBottom: 48 }}>
          <GridOverlay mode="dark" spacing={80} opacity={0.2} />
          <Container style={{ maxWidth: 860 }}>
            <MonoLabel color={accent}>// WHAT'S HAPPENING</MonoLabel>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
              {explainer}
            </div>
            {concepts && (
              <div style={{ marginTop: 30, paddingTop: 26, borderTop: "1px solid var(--border)" }}>
                <MonoLabel color={accent}>// CORE CONCEPTS · WHERE THIS SHOWS UP IN ML/DL</MonoLabel>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                  {concepts}
                </div>
              </div>
            )}
            {_conceptIds && _conceptIds.length > 0 && Connections && (
              <Connections ids={_conceptIds} />
            )}
            {_slug && <PathsCallout kind="demo" refId={_slug} accent={accent} />}
            {(lessonHref || repoHref) && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                {lessonHref && (
                  <a href={lessonHref} className="t-mono-s" style={{
                    padding: "12px 20px", border: `1px solid ${accent}`, borderRadius: 4,
                    color: "var(--white)", textDecoration: "none", background: "rgba(59,130,246,0.10)",
                  }}>READ THE LESSON →</a>
                )}
                {repoHref && (
                  <a href={repoHref} target="_blank" rel="noopener" className="t-mono-s" style={{
                    padding: "12px 20px", border: "1px solid var(--border)", borderRadius: 4,
                    color: "var(--muted)", textDecoration: "none",
                  }}>SOURCE ON GITHUB →</a>
                )}
              </div>
            )}
          </Container>
        </Section>
      )}

      <Footer />
    </>
  );
}

// Small helper for explainer paragraphs
function DemoP({ children }) {
  return <p className="t-body" style={{ color: "var(--white)", opacity: 0.88, fontSize: 16, lineHeight: 1.65, margin: 0 }}>{children}</p>;
}

Object.assign(window, { DemoLayout, DemoP });
