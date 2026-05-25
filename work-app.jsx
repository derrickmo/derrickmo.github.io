// work-app.jsx — page app for /work/index.html (Selected Work).
// Layout rule: RESEARCH in the left column, LEARN in the right column.
// Future projects go on the right. 2-col grid fills row-major, so array order is
// [TL research, TR teaching, BL research, BR teaching].

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks, StatusPill, TechChip,
  LessonStack, TransformerBlock,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../";

function ProjectCard({ id, title, role, status, tech, description, diagram, href }) {
  const Wrap = href ? "a" : "div";
  const external = href && /^https?:/.test(href);
  const wrapProps = href ? (external ? { href, target: "_blank", rel: "noopener" } : { href }) : {};
  return (
    <Wrap {...wrapProps} style={{
      position: "relative", border: "1px solid var(--border)", borderRadius: 6,
      background: "linear-gradient(180deg, rgba(13, 24, 52, 0.6) 0%, rgba(13, 24, 52, 0.25) 100%)",
      overflow: "hidden", transition: "transform .25s, border-color .25s, box-shadow .25s",
      textDecoration: "none", color: "inherit", display: "block",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(59, 130, 246, 0.15)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
      <HudBrackets mode="dark" inset={10} size={22} />
      <GridOverlay mode="dark" spacing={50} opacity={0.2} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
        <MonoLabel>// {id}</MonoLabel>
        <StatusPill status={status} mode="dark" />
      </div>
      <div style={{ position: "relative", height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>{diagram}</div>
      <div style={{ position: "relative", padding: "22px 24px 26px", display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 28, letterSpacing: "-0.015em", color: "var(--white)", margin: 0 }}>{title}</h3>
        <MonoLabel>{role}</MonoLabel>
        <div className="t-body" style={{ color: "var(--muted)", marginTop: 4, fontSize: 14, lineHeight: 1.55 }}>{description}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {tech.map(t => <TechChip key={t} tone="violet" mode="dark">{t}</TechChip>)}
        </div>
      </div>
    </Wrap>
  );
}

const PROJECTS = [
  {
    id: "RESEARCH", title: "Small Language Models Survey", role: "// RESEARCH · ACM TIST · CO-AUTHOR", status: "RESEARCH",
    description: "Co-author on a comprehensive survey of small language models in the era of LLMs — architectures, training, compression, and deployment. Accepted by ACM TIST.",
    tech: ["NLP", "LLM", "SURVEY"], href: "research/",
    diagram: <TransformerBlock width={340} height={220} mode="dark" inputLabel="SLM" blockLabel="SURVEY" headLabel="TIST" />,
  },
  {
    id: "LEARN", title: "ML from Scratch", role: "// LEARN · PYTHON, NUMPY, PYTORCH", status: "LEARN",
    description: "200 notebooks across 20 modules — every algorithm built in NumPy first, from linear regression through transformers, RL, and LLM systems. Condensed on-site; full notebooks on GitHub.",
    tech: ["PYTHON", "PYTORCH", "NUMPY"], href: "https://github.com/derrickmo/machine_learning_tutorials",
    diagram: <LessonStack count={7} width={380} height={210} mode="dark" />,
  },
  {
    id: "RESEARCH", title: "MentalNet", role: "// RESEARCH · AMIA · FIRST AUTHOR", status: "RESEARCH",
    description: "First-author AMIA podium paper — BERT-based detection of mental disease from clinical text, with downstream work on Beck's cognitive patterns.",
    tech: ["BERT", "NLP", "CLINICAL"], href: "research/",
    diagram: <TransformerBlock width={340} height={220} mode="dark" inputLabel="TEXT" blockLabel="BERT" headLabel="DX" />,
  },
  {
    id: "LEARN", title: "Hugging Face Tutorials", role: "// LEARN · TRANSFORMERS, AGENTS, RAG", status: "LEARN",
    description: "38 hands-on notebooks across 7 sections — NLP, vision, audio, multimodal, production, and agentic workflows (MCP, RAG, structured output). Each a complete, runnable walkthrough.",
    tech: ["HUGGINGFACE", "TRANSFORMERS", "AGENTS"], href: "learn/huggingface/",
    diagram: <TransformerBlock width={340} height={220} mode="dark" inputLabel="HF" blockLabel="MODEL" headLabel="HUB" />,
  },
];

function WorkHero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 40, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="blue" size={520} x={"-10%"} y={"-20%"} opacity={0.22} />
      <GlowBlob color="violet" size={460} x={"75%"} y={"40%"} opacity={0.18} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={6} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 30, top: 8, bottom: 8, width: 3, background: "linear-gradient(to bottom, #3b82f6, #a855f7)", boxShadow: "0 0 16px rgba(59,130,246,0.5)" }} />
        <div style={{ paddingLeft: 22 }}>
          <MonoLabel>// SELECTED WORK</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(44px, 5.5vw, 76px)",
            letterSpacing: "-0.025em", lineHeight: 0.98, margin: "12px 0 0",
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Open source &amp; research.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>
            The public proof: peer-reviewed research on the left, open learning work on
            the right. Each links to the full thing.
          </div>
        </div>
      </Container>
    </Section>
  );
}

function WorkGrid() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 64 }}>
      <Container>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
          {PROJECTS.map((p, i) => <ProjectCard key={i} {...p} />)}
        </div>
        <div style={{ marginTop: 18 }}>
          <MonoLabel color="var(--muted)">// RESEARCH · LEFT      // LEARN · RIGHT      // MORE TO COME</MonoLabel>
        </div>
      </Container>
    </Section>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <WorkHero />
      <WorkGrid />
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
