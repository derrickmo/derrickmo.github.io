// learn-hub-app.jsx — the Learn landing page. A chooser across the teaching
// sections: ML from Scratch, HuggingFace, Key Concepts, and the GenAI short course.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  NeuralNet, LessonStack, TransformerBlock, AgentConstellation,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const SECTIONS = [
  {
    href: "../paths/", tag: "// GUIDED · TRACKS", title: "Guided Paths", tone: "violet",
    blurb: "Curated routes through the demos, concepts, and lessons — taken in the order that builds understanding. Pick a track, follow it step by step, and your progress is saved as you go.",
    stat: "6 paths · saved progress · start anywhere",
    diagram: <AgentConstellation width={280} height={170} mode="dark" />,
  },
  {
    href: "ml-from-scratch/", tag: "// COURSE · FROM SCRATCH", title: "ML from Scratch", tone: "blue",
    blurb: "A 20-module program covering machine learning and deep learning from first principles. Every algorithm built in NumPy first — derive the math, implement it, then graduate to PyTorch.",
    stat: "20 modules · 200 notebooks · NumPy → PyTorch",
    diagram: <LessonStack count={7} width={300} height={170} mode="dark" />,
  },
  {
    href: "huggingface/", tag: "// COURSE · APPLIED", title: "HuggingFace Tutorial", tone: "violet",
    blurb: "The applied companion: pretrained models put to work across NLP, vision, audio, multimodal, and agentic workflows — the modern practitioner's toolkit.",
    stat: "7 sections · 38 hands-on notebooks",
    diagram: <TransformerBlock width={300} height={170} mode="dark" />,
  },
  {
    href: "key-concepts/", tag: "// REFERENCE · ANIMATED", title: "Key Concepts", tone: "violet",
    blurb: "A growing gallery of looping visual explainers for the ideas behind modern AI — core deep learning, agentic & LLM patterns, and real-world applications. Built to make the math click at a glance.",
    stat: "~25 animations · core DL · agentic · applications",
    diagram: <NeuralNet layers={[3, 5, 4, 2]} width={300} height={170} mode="dark" glow={0.7} />,
  },
  {
    href: "building-with-genai/", tag: "// SHORT COURSE", title: "Building with GenAI", tone: "blue",
    blurb: "A behind-the-scenes walkthrough of how this very site was designed and built in collaboration with AI — the workflow, the tools (Claude Code, Cowork, Design), and what the human still has to do.",
    stat: "1 essay · the making-of this site",
    diagram: <AgentConstellation width={280} height={170} mode="dark" />,
  },
];

function LearnHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="blue" size={480} x={"70%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={11} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 8, bottom: 8, width: 3, background: "linear-gradient(to bottom, #a855f7, #3b82f6)", boxShadow: "0 0 16px rgba(168,85,247,0.5)" }} />
          <MonoLabel>// LEARN</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(44px, 5.5vw, 76px)", letterSpacing: "-0.025em", lineHeight: 0.99, margin: 0,
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Sharing what I build.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 17, lineHeight: 1.6 }}>
            Two full courses, an animated concept reference, and a making-of essay — built to take you from first principles to applied practice. Free, self-guided, and always growing.
          </div>
        </div>
      </Container>
    </Section>
  );
}

function SectionCard({ s }) {
  const accent = s.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  const border = s.tone === "violet" ? "var(--border-violet)" : "var(--border)";
  return (
    <a href={s.href} style={{
      position: "relative", overflow: "hidden", border: `1px solid ${border}`, borderRadius: 8,
      background: "linear-gradient(180deg, rgba(13, 24, 52, 0.55) 0%, rgba(13, 24, 52, 0.2) 100%)",
      textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column",
      transition: "transform .25s, border-color .25s, box-shadow .25s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 30px ${s.tone === "violet" ? "rgba(192,132,252,0.16)" : "rgba(96,165,250,0.16)"}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = "none"; }}>
      <HudBrackets mode="dark" inset={8} size={18} />
      <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${border}`, background: "rgba(5, 8, 22, 0.45)" }}>{s.diagram}</div>
      <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-mono-s" style={{ color: accent, fontSize: 10 }}>{s.tag}</span>
        <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 26, letterSpacing: "-0.015em", color: "var(--white)", margin: 0 }}>{s.title}</h3>
        <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{s.blurb}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{s.stat}</span>
          <span className="t-mono-s" style={{ color: accent, fontSize: 11 }}>ENTER →</span>
        </div>
      </div>
    </a>
  );
}

function Sections() {
  const mobile = useIsMobile();
  return (
    <Section id="sections" style={{ paddingTop: 8 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container>
        <div style={{ marginBottom: 28 }}>
          <MonoLabel color="var(--violet-lt)">// FIVE WAYS IN</MonoLabel>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 18 }}>
          {SECTIONS.map(s => <SectionCard key={s.href} s={s} />)}
        </div>
        <a href={(window.__DM_BASE || "../") + "concepts/"} style={{
          position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 18,
          padding: "22px 28px", border: "1px solid var(--border-violet)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.06) 100%)",
          textDecoration: "none", color: "inherit",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.boxShadow = "0 0 28px rgba(192,132,252,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-violet)"; e.currentTarget.style.boxShadow = "none"; }}>
          <HudBrackets mode="dark" inset={8} size={16} />
          <div>
            <MonoLabel color="var(--violet-lt)">// CONCEPT GRAPH · ONE PLACE PER IDEA</MonoLabel>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 20, color: "var(--white)", marginTop: 8 }}>
              The core ML/DL concepts, each linked to every demo, game, lesson, and animation that touches it.
            </div>
          </div>
          <span className="t-mono-s" style={{ color: "var(--violet-lt)", whiteSpace: "nowrap" }}>OPEN THE GRAPH →</span>
        </a>
        <a href="notes/" style={{
          position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 14,
          padding: "22px 28px", border: "1px solid var(--border)", borderRadius: 8,
          background: "rgba(13,24,52,0.4)", textDecoration: "none", color: "inherit",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue-lt)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(96,165,250,0.14)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
          <HudBrackets mode="dark" inset={8} size={16} />
          <div>
            <MonoLabel color="var(--blue-lt)">// NOTES · ONE IDEA AT A TIME</MonoLabel>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 20, color: "var(--white)", marginTop: 8 }}>
              Short, plain-language intros to the core concepts.
            </div>
          </div>
          <span className="t-mono-s" style={{ color: "var(--blue-lt)", whiteSpace: "nowrap" }}>READ THE NOTES →</span>
        </a>
        <a href={(window.__DM_BASE || "../") + "weekly-insights/"} style={{
          position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 14,
          padding: "22px 28px", border: "1px solid var(--border)", borderRadius: 8,
          background: "rgba(13,24,52,0.4)", textDecoration: "none", color: "inherit",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(192,132,252,0.16)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
          <HudBrackets mode="dark" inset={8} size={16} />
          <div>
            <MonoLabel color="var(--violet-lt)">// WEEKLY INSIGHTS · WHAT CHANGED THIS WEEK</MonoLabel>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 20, color: "var(--white)", marginTop: 8 }}>
              A weekly digest of practitioner-grade ML developments.
            </div>
          </div>
          <span className="t-mono-s" style={{ color: "var(--violet-lt)", whiteSpace: "nowrap" }}>READ THE DIGEST →</span>
        </a>
      </Container>
    </Section>
  );
}

function App() {
  return (<><TopNav /><LearnHero /><Sections /><Footer /></>);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
