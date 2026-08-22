// concept-lesson-app.jsx — a single per-concept sub-lesson page.
// Renders window.DM_SUBLESSON(__DM_MODULE_SLUG, __DM_CONCEPT_SLUG): intuition ->
// the math (KaTeX via <TeX>) -> a code illustration -> takeaways -> a live demo,
// with prev/next within the module's concept sequence and links back to the module
// and to the concept's reference hub page (/concepts/<id>/).

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile, TeX,
} = window;

const CURR = window.CURRICULUM;
const BASE = window.__DM_BASE || "../../../";
const CTX = window.DM_SUBLESSON ? window.DM_SUBLESSON(window.__DM_MODULE_SLUG, window.__DM_CONCEPT_SLUG) : null;
const MOD = CURR ? CURR.findModule(window.__DM_MODULE_SLUG) : null;
const demoTitle = slug => { const d = ((window.PLAY_DEMOS && window.PLAY_DEMOS.demos) || []).find(x => x.slug === slug); return d ? d.title : slug; };
const lessonTitle = id => (CTX && CTX.module.lessons[id] ? CTX.module.lessons[id].title : id);

function Hero() {
  const mobile = useIsMobile();
  const L = CTX.lesson;
  return (
    <Section id="top" padded={false} style={{ paddingTop: 132, paddingBottom: 40, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.22} />
      <GlowBlob color="blue" size={460} x={"70%"} y={"35%"} opacity={0.2} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={(CTX.index + 3) * 5} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 22 }}>
          <a href={BASE + "learn/"} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <a href={BASE + "learn/" + CTX.moduleSlug + "/"} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>
            {MOD ? "MODULE " + MOD.n : "MODULE"}
          </a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel color="var(--violet-lt)">{("0" + (CTX.index + 1)).slice(-2)} / {CTX.order.length}</MonoLabel>
        </div>
        <div style={{ maxWidth: 780, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 4, bottom: 4, width: 3, background: "linear-gradient(to bottom, #3b82f6, #a855f7)", boxShadow: "0 0 16px rgba(59,130,246,0.5)" }} />
          <MonoLabel>{(MOD ? MOD.title : CTX.module.title).toUpperCase()}</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(36px, 4.6vw, 58px)", letterSpacing: "-0.025em",
            lineHeight: 1.03, margin: "12px 0 0",
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>{L.title}</h1>
          <p className="t-body" style={{ color: "var(--muted)", maxWidth: 660, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>{L.oneLine}</p>
        </div>
      </Container>
    </Section>
  );
}

function CodeBlock({ code, caption }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "rgba(5,8,22,0.6)" }}>
        <div style={{ padding: "9px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#f87171" }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#fbbf24" }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#34d399" }} />
          <span className="t-mono-s" style={{ color: "var(--muted)", marginLeft: 8 }}>python</span>
        </div>
        <pre style={{ margin: 0, padding: "18px 20px", overflowX: "auto" }}><code className="t-mono" style={{ color: "var(--blue-br)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre", background: "none", border: "none", padding: 0 }}>{code}</code></pre>
      </div>
      {caption && <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, marginTop: 10, fontStyle: "italic" }}>{caption}</div>}
    </div>
  );
}

function Body() {
  const L = CTX.lesson;
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 16 }}>
      <Container style={{ maxWidth: 820 }}>
        {L.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 34 }}>
            <MonoLabel color="var(--blue-lt)">// {s.h.toUpperCase()}</MonoLabel>
            <div style={{ marginTop: 12 }}>
              {(s.paras || []).map((p, j) => (
                <p key={j} className="t-body" style={{ color: "var(--soft)", fontSize: 16, lineHeight: 1.7, margin: "0 0 14px" }}>{p}</p>
              ))}
              {s.tex && (
                <div style={{ margin: "16px 0", padding: "18px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)", overflowX: "auto" }}>
                  <TeX display>{s.tex}</TeX>
                  {s.texNote && <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, marginTop: 10, textAlign: "center", lineHeight: 1.55 }}>{s.texNote}</div>}
                </div>
              )}
              {s.code && <CodeBlock code={s.code} caption={s.caption} />}
            </div>
          </div>
        ))}
      </Container>
    </Section>
  );
}

function Takeaways() {
  const L = CTX.lesson;
  if (!L.takeaways || !L.takeaways.length) return null;
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 16 }}>
      <Container style={{ maxWidth: 820 }}>
        <MonoLabel>// TAKEAWAYS</MonoLabel>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {L.takeaways.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.35)" }}>
              <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 16, color: "var(--blue-lt)", lineHeight: 1.3 }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="t-body" style={{ color: "var(--white)", opacity: 0.9, fontSize: 15, lineHeight: 1.55 }}>{t}</span>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function Explore() {
  const L = CTX.lesson;
  return (
    <Section style={{ paddingTop: 16, paddingBottom: 16 }}>
      <Container style={{ maxWidth: 820 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {L.demo && (
            <a href={BASE + "visualize/" + L.demo + "/"} style={{
              flex: "1 1 260px", position: "relative", overflow: "hidden", textDecoration: "none", color: "inherit",
              padding: "20px 22px", border: "1px solid var(--border-violet)", borderRadius: 8,
              background: "linear-gradient(120deg, rgba(168,85,247,0.12) 0%, rgba(59,130,246,0.07) 100%)",
            }}>
              <HudBrackets mode="dark" inset={8} size={16} />
              <MonoLabel color="var(--violet-lt)">// SEE IT LIVE</MonoLabel>
              <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 19, color: "var(--white)", marginTop: 8 }}>{demoTitle(L.demo)}</div>
              <div className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 11, marginTop: 8 }}>OPEN DEMO →</div>
            </a>
          )}
          <a href={BASE + "concepts/" + CTX.conceptId + "/"} style={{
            flex: "1 1 260px", textDecoration: "none", color: "inherit",
            padding: "20px 22px", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)",
          }}>
            <MonoLabel color="var(--blue-lt)">// REFERENCE</MonoLabel>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 19, color: "var(--white)", marginTop: 8 }}>Concept page</div>
            <div className="t-mono-s" style={{ color: "var(--blue-lt)", fontSize: 11, marginTop: 8 }}>EQUATION · PREREQS · EVERY SURFACE →</div>
          </a>
        </div>
      </Container>
    </Section>
  );
}

function LessonNav() {
  const mobile = useIsMobile();
  const tile = (id, dir) => id && (
    <a href={BASE + "learn/" + CTX.moduleSlug + "/" + id + "/"} style={{
      flex: 1, padding: "18px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.5)",
      textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 6,
      textAlign: dir === "prev" ? "left" : "right",
    }}>
      <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{dir === "prev" ? "← PREVIOUS" : "NEXT →"}</span>
      <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 17, color: "var(--white)" }}>{lessonTitle(id)}</span>
    </a>
  );
  return (
    <Section style={{ paddingTop: 24, paddingBottom: 60 }}>
      <Container style={{ maxWidth: 820 }}>
        <a href={BASE + "learn/" + CTX.moduleSlug + "/"} className="t-mono-s" style={{ color: "var(--blue-lt)", textDecoration: "none", display: "inline-block", marginBottom: 18 }}>
          ← BACK TO {MOD ? MOD.title.toUpperCase() : "MODULE"}
        </a>
        <div style={{ display: "flex", gap: 14, flexDirection: mobile ? "column" : "row" }}>
          {tile(CTX.prev, "prev") || <div style={{ flex: 1 }} />}
          {tile(CTX.next, "next") || <div style={{ flex: 1 }} />}
        </div>
      </Container>
    </Section>
  );
}

function NotFound() {
  return (
    <Section padded={false} style={{ paddingTop: 200 }}>
      <Container>
        <MonoLabel color="var(--violet-lt)">// ERROR · SUB-LESSON NOT FOUND</MonoLabel>
        <h1 style={{ color: "var(--white)", fontFamily: "var(--f-display)", fontSize: 44, marginTop: 12 }}>Sub-lesson not found.</h1>
        <p style={{ color: "var(--muted)" }}>No lesson for <code>{window.__DM_MODULE_SLUG} / {window.__DM_CONCEPT_SLUG}</code> in sub-lessons.js.</p>
      </Container>
    </Section>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      {CTX ? <><Hero /><Body /><Takeaways /><Explore /><LessonNav /></> : <NotFound />}
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
