// hf-section-app.jsx — one HuggingFace section overview (/learn/huggingface/<slug>/).
// Reads window.__DM_SECTION_SLUG; renders a condensed overview + GitHub funnel.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  TransformerBlock,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  Connections,
} = window;

const HF = window.HF;
const SEC = HF ? HF.find(window.__DM_SECTION_SLUG) : null;
const BASE = window.__DM_BASE || "../../../";
const FOLDER = SEC ? HF.folder(SEC.dir) : (HF ? HF.repo : "#");

const diffColor = (d) => d === "Beginner" ? "#34d399" : d === "Advanced" ? "var(--violet-lt)" : "var(--blue-lt)";

function Hero() {
  const mobile = useIsMobile();
  if (!SEC) {
    return (
      <Section padded={false} style={{ paddingTop: 200 }}>
        <Container>
          <MonoLabel color="var(--violet-lt)">// ERROR · SECTION NOT FOUND</MonoLabel>
          <h1 style={{ color: "var(--white)", fontFamily: "var(--f-display)", fontSize: 48, marginTop: 12 }}>Section not found.</h1>
          <p style={{ color: "var(--muted)" }}>No section for slug <code>{window.__DM_SECTION_SLUG}</code> in hf-lectures.js.</p>
        </Container>
      </Section>
    );
  }
  const idx = HF.sections.findIndex(s => s.slug === SEC.slug);
  return (
    <Section id="top" padded={false} style={{ paddingTop: 140, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.22} />
      <GlowBlob color="blue" size={480} x={"65%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={idx + 1} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <Container style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href={BASE + "learn/"} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <a href={BASE + "learn/huggingface/"} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>HUGGINGFACE</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel color="var(--blue-lt)">{SEC.title.toUpperCase()}</MonoLabel>
        </div>
      </Container>

      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 20, bottom: 70, width: 3, background: "linear-gradient(to bottom, #3b82f6, #a855f7)", boxShadow: "0 0 16px rgba(59,130,246,0.5)" }} />
          <MonoLabel>SECTION {String(idx).padStart(2, "0")} · HUGGINGFACE</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(38px, 4.8vw, 60px)", letterSpacing: "-0.025em", lineHeight: 1.02, margin: 0,
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>{SEC.title}</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 17, lineHeight: 1.6 }}>{SEC.summary}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <a href={FOLDER} target="_blank" rel="noopener" style={{
              padding: "12px 22px", border: "1px solid var(--blue)", borderRadius: 4, color: "var(--white)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em", background: "rgba(59,130,246,0.08)", boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>OPEN ON GITHUB →</a>
            <a href="#notebooks" style={{
              padding: "12px 22px", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            }}>SEE THE NOTEBOOKS</a>
          </div>
        </div>
        {!mobile && <div style={{ display: "flex", justifyContent: "center" }}>
          <TransformerBlock width={420} height={340} mode="dark" inputLabel="IN" blockLabel={SEC.title.split(" ")[0].toUpperCase()} headLabel="OUT" />
        </div>}
      </Container>

      <Container style={{ marginTop: 44 }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 0, border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.4)" }}>
          {[
            { label: "SECTION", value: String(idx).padStart(2, "0"), sub: "of " + (HF.sections.length - 1) },
            { label: "NOTEBOOKS", value: SEC.notebooks.length.toString(), sub: "self-contained" },
            { label: "FORMAT", value: "Self-guided", sub: "video planned" },
          ].map((c, i, arr) => (
            <div key={c.label} style={{ padding: "18px 20px", borderRight: (!mobile && i < arr.length - 1) ? "1px solid var(--border)" : "none", display: "flex", flexDirection: "column", gap: 4 }}>
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

function Takeaways() {
  if (!SEC) return null;
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 16, paddingBottom: 16 }}>
      <Container>
        <div style={{ marginBottom: 24 }}><MonoLabel>// WHAT YOU'LL TAKE AWAY</MonoLabel></div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : `repeat(${SEC.takeaways.length}, 1fr)`, gap: 16 }}>
          {SEC.takeaways.map((t, i) => (
            <div key={i} style={{ position: "relative", overflow: "hidden", padding: "24px 22px", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.4)", display: "flex", flexDirection: "column", gap: 12 }}>
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

function CodeIllustration() {
  if (!SEC || !SEC.code) return null;
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
          <pre style={{ margin: 0, padding: "18px 20px", overflowX: "auto" }}><code className="t-mono" style={{ color: "var(--blue-br)", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre" }}>{SEC.code}</code></pre>
        </div>
        {SEC.codeCaption && <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, marginTop: 10, fontStyle: "italic" }}>{SEC.codeCaption}</div>}
      </Container>
    </Section>
  );
}

function Notebooks() {
  if (!SEC) return null;
  const mobile = useIsMobile();
  return (
    <Section id="notebooks">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MonoLabel>// THE NOTEBOOKS · {SEC.notebooks.length} TOTAL</MonoLabel>
            <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(30px, 3.4vw, 44px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05 }}>Inside the section.</h2>
          </div>
          <a href={FOLDER} target="_blank" rel="noopener" className="t-mono-s" style={{ padding: "11px 20px", border: "1px solid var(--blue-lt)", borderRadius: 4, color: "var(--white)", textDecoration: "none", background: "rgba(59,130,246,0.12)", whiteSpace: "nowrap" }}>RUN THEM ON GITHUB →</a>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.35)", overflow: "hidden" }}>
          {SEC.notebooks.map((nb, i) => (
            <div key={nb.n} style={{
              display: "grid", gridTemplateColumns: mobile ? "1fr" : "62px 1fr auto", gap: mobile ? 6 : 16, alignItems: mobile ? "start" : "center",
              padding: "18px 24px", borderTop: i === 0 ? "none" : "1px solid var(--border)",
            }}>
              <span className="t-mono" style={{ color: "var(--blue-lt)", fontSize: 13, fontWeight: 600 }}>{nb.n}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--f-display)", fontWeight: 500, fontSize: 17, color: "var(--white)", letterSpacing: "-0.005em" }}>{nb.t}</span>
                <span className="t-small" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}>{nb.d}</span>
                <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginTop: 2 }}>{nb.models}</span>
                {nb.cur && nb.cur.length > 0 && window.CURRICULUM && (
                  <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginTop: 4 }}>
                    IN THE CURRICULUM:{" "}
                    {nb.cur.map((ref, j) => {
                      const [ms, ls] = ref.split("/");
                      const l = window.CURRICULUM.findLesson(ms, ls);
                      if (!l) return null;
                      return (
                        <span key={ref}>
                          {j > 0 && <span> · </span>}
                          <a href={`${BASE}learn/${ms}/`} style={{ color: "var(--blue-lt)", textDecoration: "none" }}
                             title={`Module page — lesson ${l.n}`}>{l.n} {l.title}</a>
                        </span>
                      );
                    })}
                  </span>
                )}
              </div>
              <span className="t-mono-s" style={{ color: diffColor(nb.diff), fontSize: 10, whiteSpace: "nowrap", justifySelf: mobile ? "start" : "end" }}>{nb.diff.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, marginTop: 16, lineHeight: 1.6, maxWidth: 720 }}>
          Each notebook is a complete, runnable walkthrough — no placeholders — and uses small CPU-friendly models with options to scale up.
          <a href={FOLDER} target="_blank" rel="noopener" style={{ color: "var(--blue-lt)" }}> Open the section on GitHub</a> to run them.
        </div>
      </Container>
    </Section>
  );
}

function Formats() {
  const mobile = useIsMobile();
  const items = [
    { label: "Self-guided notebooks", status: "AVAILABLE", note: "Run them now — self-contained, and updated over time.", href: FOLDER },
    { label: "Video walkthrough", status: "PLANNED", note: "A recorded video lecture for this section is planned." },
    { label: "Case study", status: "PLANNED", note: "An applied case study is planned." },
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
            return it.href ? <a key={it.label} href={it.href} target="_blank" rel="noopener" style={style}>{inner}</a> : <div key={it.label} style={style}>{inner}</div>;
          })}
        </div>
      </Container>
    </Section>
  );
}

function SectionNav() {
  if (!SEC) return null;
  const idx = HF.sections.findIndex(s => s.slug === SEC.slug);
  const prev = idx > 0 ? HF.sections[idx - 1] : null;
  const next = idx < HF.sections.length - 1 ? HF.sections[idx + 1] : null;
  const tile = (s, dir) => s && (
    <a href={`../${s.slug}/`} style={{
      flex: 1, padding: "20px 22px", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.5)",
      textDecoration: "none", color: "inherit", transition: "border-color .2s, transform .15s", display: "flex", flexDirection: "column", gap: 6,
      textAlign: dir === "prev" ? "left" : "right",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue-lt)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>{dir === "prev" ? "← PREVIOUS" : "NEXT →"}</span>
      <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18, color: "var(--white)", letterSpacing: "-0.01em" }}>{s.title}</span>
    </a>
  );
  return (
    <Section style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Container>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {tile(prev, "prev") || <div style={{ flex: 1 }} />}
          {tile(next, "next") || <div style={{ flex: 1 }} />}
        </div>
      </Container>
    </Section>
  );
}

function HFConnections() {
  const tags = (window.CONCEPT_TAGS && window.CONCEPT_TAGS.hf) || {};
  const ids = tags[window.__DM_SECTION_SLUG] || [];
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
      <Hero />
      <Takeaways />
      <CodeIllustration />
      <Notebooks />
      <HFConnections />
      <Formats />
      <SectionNav />
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
