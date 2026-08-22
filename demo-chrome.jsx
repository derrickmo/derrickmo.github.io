// demo-chrome.jsx — shared layout for a single Play demo page.
// Provides DemoLayout: header + (stage | controls) + explainer, wrapped in the
// site nav/footer. Loaded after chrome.jsx + controls.jsx, before the demo app.

const { useRef: __useRef, useEffect: __useEffect } = React;
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

// A11Y-0001 -- give every demo canvas an accessible name.
//
// 179 demos and 12 games render their whole output to <canvas>, which exposes
// nothing to a screen reader: the page reads as a heading, some prose, a set of
// controls, and then silence where the algorithm is.
//
// Done here rather than in 191 demo files because the copy already exists in
// play-demos.js / play-games.js -- the same registry the hub card and the topic
// chip read from -- so the label cannot drift from what the demo says it is.
// A demo that wants a better name can set aria-label on its own canvas; this
// only fills in where one is missing.
function __labelCanvases(root, title) {
  if (!root) return;
  const slug = window.__DM_DEMO_SLUG;
  const entry = slug
    ? (((window.PLAY_DEMOS || {}).demos || []).find((d) => d.slug === slug) ||
       ((window.PLAY_GAMES || {}).games || []).find((g) => g.slug === slug))
    : null;
  const blurb = entry && entry.blurb ? entry.blurb : "";
  const name = entry && entry.title ? entry.title : title;
  const label = blurb ? `${name}: ${blurb}` : `${name} - interactive visualization`;
  const canvases = root.querySelectorAll("canvas");
  canvases.forEach((cv, i) => {
    if (cv.getAttribute("aria-label")) return;
    cv.setAttribute("role", "img");
    // Multiple canvases on one stage are panels of one figure; number them so
    // they are distinguishable rather than repeating the same name.
    cv.setAttribute("aria-label", canvases.length > 1 ? `${label} (view ${i + 1} of ${canvases.length})` : label);
  });
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
  // The topic chip is DERIVED from play-demos.js, which is what the /visualize/ hub
  // card shows, so the two can never disagree. It used to be hand-passed per demo,
  // which drifted into 55 variants contradicting the registry on 48 of 179 demos
  // (CQ-0001). Games keep passing it explicitly — their labels are algorithm names
  // ("GAME · MINIMAX + ALPHA-BETA") that no registry field carries — so an explicit
  // prop still wins for anything the demo registry doesn't know about.
  const _registryTopic = (() => {
    if (!_slug || typeof window === "undefined") return null;
    const d = ((window.PLAY_DEMOS || {}).demos || []).find((x) => x.slug === _slug);
    return d && d.topic ? d.topic : null;
  })();
  const _topic = _registryTopic || topic;
  // Same idea for "READ THE LESSON": every demo used to hand-pass the /learn/ HUB, so
  // the link dropped the reader at a 25-module index to find the lesson themselves.
  // play-demos.js carries a `lesson` path per demo; prefer it and fall back to whatever
  // was passed (the hub) for demos that have no single owning lesson yet (CQ-0003).
  const _registryLesson = (() => {
    if (!_slug || typeof window === "undefined") return null;
    const d = ((window.PLAY_DEMOS || {}).demos || []).find((x) => x.slug === _slug);
    return d && d.lesson ? `${_BASE}${d.lesson}` : null;
  })();
  const _lessonHref = _registryLesson || lessonHref;
  // No dep array: a few demos swap their canvas when a control changes shape,
  // and the labeller skips anything already named, so re-running is cheap.
  const _stageRef = __useRef(null);
  __useEffect(() => { __labelCanvases(_stageRef.current, title); });

  // A11Y-0001 part 2 -- narrate the demo's live state.
  //
  // Naming the canvas says what the demo IS; this says what it is DOING, which is
  // the half that makes a running algorithm followable without seeing it. The
  // values already exist as text in the controls column (190 of 191 demos use
  // StatReadout), so this reads the rendered DOM instead of asking every demo to
  // hand-write a status line -- and a demo that adds a readout is covered for free.
  //
  // Two deliberate limits. It announces only when the text CHANGED, and at most
  // once every 2s: a 60 fps live region floods a screen reader and is worse than
  // silence. And it writes through a ref rather than React state, so polling a
  // running simulation never re-renders the demo underneath it.
  const _liveRef = __useRef(null);
  const _statsRef = __useRef(null);
  __useEffect(() => {
    let last = "";
    const id = setInterval(() => {
      const host = _statsRef.current, out = _liveRef.current;
      if (!host || !out) return;
      const txt = Array.from(host.querySelectorAll("[data-dm-stat]"))
        .map((el) => el.getAttribute("data-dm-stat")).join(", ");
      if (txt && txt !== last) { last = txt; out.textContent = txt; }
    }, 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <Section id="top" padded={false} style={{ paddingTop: 132, paddingBottom: 48, position: "relative", overflow: "hidden" }}>
        <GridOverlay mode="dark" spacing={80} opacity={0.35} />
        <GlowBlob color={tone} size={460} x={"80%"} y={"-10%"} opacity={0.18} />
        <HudBrackets mode="dark" inset={28} size={28} />
        <Container>
          {/* breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <a href={_backHref} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← {backLabel}</a>
            <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
            <MonoLabel color={accent}>{_topic}</MonoLabel>
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
            <div ref={_stageRef} role="group" aria-label={`${title} — interactive visualization`} style={{
              position: "relative", overflow: "hidden",
              border: "1px solid var(--border)", borderRadius: 8,
              background: "rgba(5, 8, 22, 0.6)", padding: 16,
              display: "flex", alignItems: "center", justifyContent: "center", minHeight: 360,
            }}>
              <HudBrackets mode="dark" inset={8} size={18} />
              {stage}
            </div>
            <div ref={_statsRef} style={{
              border: "1px solid var(--border)", borderRadius: 8,
              background: "rgba(13, 24, 52, 0.4)", padding: "20px 18px",
            }}>
              {controls}
              <div ref={_liveRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
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
            {(_lessonHref || repoHref) && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                {_lessonHref && (
                  <a href={_lessonHref} className="t-mono-s" style={{
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

      </main>
      <Footer />
    </>
  );
}

// Small helper for explainer paragraphs
function DemoP({ children }) {
  return <p className="t-body" style={{ color: "var(--white)", opacity: 0.88, fontSize: 16, lineHeight: 1.65, margin: 0 }}>{children}</p>;
}

Object.assign(window, { DemoLayout, DemoP });
