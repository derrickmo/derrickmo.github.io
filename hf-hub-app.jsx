// hf-hub-app.jsx — HuggingFace Tutorial hub (/learn/huggingface/).
// Lists the 7 sections; each links to its section overview page. Funnels to GitHub.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  TransformerBlock,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const HF = window.HF;
const BASE = window.__DM_BASE || "../../";

function HubHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="blue" size={480} x={"65%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={7} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <Container style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href={BASE + "learn/"} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel color="var(--blue-lt)">HUGGINGFACE TUTORIAL</MonoLabel>
        </div>
      </Container>

      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{
            position: "absolute", left: -18, top: 20, bottom: 70, width: 3,
            background: "linear-gradient(to bottom, #a855f7, #3b82f6)", boxShadow: "0 0 16px rgba(168,85,247,0.5)",
          }} />
          <MonoLabel>// LEARN · HANDS-ON</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(44px, 5.5vw, 76px)", letterSpacing: "-0.025em", lineHeight: 0.98, margin: 0,
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>HuggingFace,<br/>end to end.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 620, fontSize: 17, lineHeight: 1.6 }}>
            38 hands-on notebooks across 7 sections — transformer fundamentals,
            NLP, computer vision, audio, multimodal, production best practices, and
            agentic workflows. Each notebook is a complete, runnable walkthrough,
            not a fill-in-the-blank exercise.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <a href={HF.repo} target="_blank" rel="noopener" style={{
              padding: "12px 22px", border: "1px solid var(--blue)", borderRadius: 4,
              color: "var(--white)", textDecoration: "none", fontFamily: "var(--f-mono)", fontSize: 13,
              letterSpacing: "0.1em", background: "rgba(59,130,246,0.08)", boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>OPEN ON GITHUB →</a>
            <a href="#sections" style={{
              padding: "12px 22px", border: "1px solid var(--border)", borderRadius: 4,
              color: "var(--muted)", textDecoration: "none", fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            }}>SEE THE SECTIONS</a>
          </div>
        </div>
        {!mobile && <div style={{ display: "flex", justifyContent: "center" }}>
          <TransformerBlock width={460} height={360} mode="dark" inputLabel="HF" blockLabel="MODELS" headLabel="HUB" />
        </div>}
      </Container>

      <Container style={{ marginTop: 44 }}>
        <div style={{
          display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 0,
          border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.4)",
        }}>
          {[
            { label: "SECTIONS", value: HF.sections.length.toString(), sub: "domains" },
            { label: "NOTEBOOKS", value: HF.totalNotebooks().toString(), sub: "self-contained" },
            { label: "MODALITIES", value: "Text · Vision · Audio", sub: "+ multimodal" },
            { label: "STACK", value: "transformers", sub: "+ diffusers, peft" },
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

function SectionsGrid() {
  const mobile = useIsMobile();
  return (
    <Section id="sections">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          <MonoLabel>// SECTIONS · {HF.sections.length} DOMAINS · {HF.totalNotebooks()} NOTEBOOKS</MonoLabel>
          <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(32px, 3.8vw, 48px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05 }}>The seven sections.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {HF.sections.map((s, i) => (
            <a key={s.slug} href={`${s.slug}/`} style={{
              position: "relative", overflow: "hidden", padding: "24px 24px",
              border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13, 24, 52, 0.4)",
              textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 10,
              transition: "transform .2s, border-color .2s, box-shadow .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "var(--blue-lt)"; e.currentTarget.style.boxShadow = "0 0 26px rgba(96,165,250,0.16)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
              <HudBrackets mode="dark" inset={8} size={16} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <MonoLabel color="var(--violet-lt)">{String(i).padStart(2, "0")}</MonoLabel>
                <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{s.notebooks.length} NOTEBOOKS</span>
              </div>
              <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em", color: "var(--white)", margin: 0 }}>{s.title}</h3>
              <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, flex: 1 }}>{s.blurb}</div>
              <span className="t-mono-s" style={{ color: "var(--blue-lt)", fontSize: 10 }}>ENTER →</span>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function Formats() {
  const mobile = useIsMobile();
  const items = [
    { label: "Self-guided notebooks", status: "AVAILABLE", note: "All 38 on GitHub — self-contained, and updated over time.", href: HF.repo },
    { label: "Video walkthrough", status: "PLANNED", note: "Recorded video lectures are planned." },
    { label: "Case study", status: "PLANNED", note: "Applied case studies are planned." },
  ];
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 40 }}>
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

function App() {
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <HubHero />
      <SectionsGrid />
      <Formats />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
