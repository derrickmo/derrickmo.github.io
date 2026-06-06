// landing-app.jsx — page app for `/index.html` (home).
// Hero · About · Services (Research → Teaching → Consulting) · Stack · Work · Lab preview.
// Chrome (TopNav, Footer, Section, Container, MonoLabel) comes from chrome.jsx via window.

const {
  HudBrackets, StatusPill, TechChip,
  GridOverlay, GlowBlob, ParticleField, MathWatermarks, ScanLine,
  NeuralNet, SignalStack, AgentConstellation,
  TransformerBlock, LessonStack,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

// ─── Hero ─────────────────────────────────────────────────────
function Hero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.45} />
      <GlowBlob color="blue" size={620} x={-220} y={-180} opacity={0.4} />
      <GlowBlob color="violet" size={560} x={"60%"} y={"55%"} opacity={0.32} />
      <ParticleField count={90} seed={3} />
      <MathWatermarks mode="dark" count={6} opacity={0.06} seed={9} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <div style={{ position: "absolute", top: 86, left: 48 }}>
        <MonoLabel>SYS::ONLINE</MonoLabel>
      </div>
      <div style={{ position: "absolute", top: 86, right: 48 }}>
        <MonoLabel color="var(--violet-lt)">SYS::READY</MonoLabel>
      </div>
      <div style={{ position: "absolute", bottom: 24, left: 48 }}>
        <MonoLabel>// PORTFOLIO_v2</MonoLabel>
      </div>
      <div style={{ position: "absolute", bottom: 24, right: 48 }}>
        <MonoLabel color="var(--violet-lt)">github.com/derrickmo</MonoLabel>
      </div>

      <Container style={{
        display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 0.85fr) minmax(0, 1.15fr)",
        gap: 56, alignItems: "center", paddingTop: 80,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, position: "relative" }}>
          <div style={{
            position: "absolute", left: -20, top: 26, bottom: 90, width: 3,
            background: "linear-gradient(to bottom, #3b82f6, #a855f7)",
            boxShadow: "0 0 16px rgba(168,85,247,0.5)",
          }} />
          <MonoLabel>// MACHINE LEARNING / DEEP LEARNING ENGINEER</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(56px, 7vw, 104px)", letterSpacing: "-0.03em",
            lineHeight: 0.95, margin: 0,
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Derrick<br/>Mo</h1>
          <div className="t-body" style={{ color: "var(--white)", opacity: 0.86, fontSize: 18, lineHeight: 1.55, maxWidth: 460, marginTop: 2 }}>
            I build production deep-learning systems — computer vision, signal processing, and agentic LLMs — and teach the fundamentals from scratch.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <a href="#services" style={{
              padding: "12px 22px", border: "1px solid var(--blue)",
              borderRadius: 4, color: "var(--white)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
              background: "rgba(59,130,246,0.08)",
              boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>WORK WITH ME →</a>
          </div>
        </div>

        {!mobile && (
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <ScanLine orientation="vertical" mode="dark" style={{ left: -30 }} />
            <NeuralNet layers={[5,7,6,5,4]} width={640} height={480} mode="dark" glow={0.85} pulse />
          </div>
        )}
      </Container>
    </Section>
  );
}

// ─── Hex portrait frame ───────────────────────────────────────
function HexPortrait({ src, size = 360 }) {
  const pts = "50,2 95,27 95,73 50,98 5,73 5,27";
  const hexClip = "polygon(50% 2%, 95% 27%, 95% 73%, 50% 98%, 5% 73%, 5% 27%)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
        <polygon points={pts} fill="none" stroke="var(--blue-lt)" strokeWidth="0.25" opacity="0.35"
          transform="translate(50,50) scale(1.12) translate(-50,-50)" />
        <polygon points={pts} fill="none" stroke="var(--violet-lt)" strokeWidth="0.2" opacity="0.25"
          transform="translate(50,50) scale(1.22) translate(-50,-50)" strokeDasharray="0.5 1" />
      </svg>
      <div style={{ position: "absolute", inset: 0, clipPath: hexClip, WebkitClipPath: hexClip }}>
        <img src={src} alt="Derrick Mo"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <polygon points={pts} fill="none" stroke="var(--blue-lt)" strokeWidth="0.6" />
      </svg>
      {[
        { x: "50%", y: "-6px",  label: "// SUBJECT_PROFILE" },
        { x: "50%", y: "calc(100% - 4px)", label: "ID::DM" },
      ].map((t, i) => (
        <div key={i} className="t-mono-s"
          style={{
            position: "absolute", left: t.x, top: t.y,
            transform: "translateX(-50%)",
            color: "var(--blue-lt)", whiteSpace: "nowrap",
          }}>{t.label}</div>
      ))}
      <div style={{
        position: "absolute", inset: -40, zIndex: -1,
        background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
        filter: "blur(10px)",
      }} />
    </div>
  );
}

// ─── About ────────────────────────────────────────────────────
function About() {
  const mobile = useIsMobile();
  return (
    <Section id="about">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 0.85fr) minmax(0, 1.15fr)", gap: mobile ? 36 : 64, alignItems: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <HexPortrait src={window.__DM_CARTOON || "assets/derrick-cartoon.png"} size={mobile ? 240 : 380} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <MonoLabel>// PROFILE.LOG</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(40px, 4.5vw, 60px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: 0, lineHeight: 1.05,
          }}>
            Production ML, taught from first principles.
          </h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 580, fontSize: 17, lineHeight: 1.6 }}>
            Senior ML engineer based in San Jose, CA. I ship production systems in computer vision, signal processing, and agentic LLMs — and teach the fundamentals from scratch. Research-grade rigor, deployment-grade execution.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
            <a href="about/" style={{
              padding: "12px 22px", border: "1px solid var(--blue)",
              borderRadius: 4, color: "var(--white)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
              background: "rgba(59,130,246,0.08)", boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>READ THE FULL STORY →</a>
            <MonoLabel color="var(--violet-lt)">SAN JOSE, CA</MonoLabel>
          </div>
        </div>
      </Container>
    </Section>
  );
}

// ─── Pillars — Research → Learn → Build ───────────────────────
function Services() {
  const mobile = useIsMobile();
  const pillars = [
    {
      tag: "01 · RESEARCH",
      title: "Research",
      blurb: "Applied research collaborations across NLP, CV, and signal intelligence. Published, deployed, and reproducible.",
      list: ["NLP & transformers", "CV & signal", "Foundation models", "Reproducible papers"],
      tone: "blue",
      href: "research/",
      diagram: <NeuralNet layers={[4,6,5,3]} width={260} height={200} mode="dark" glow={0.6} />,
    },
    {
      tag: "02 · LEARN",
      title: "Learn",
      blurb: "ML and DL from first principles — for people who refuse to treat the framework as a black box. Two full courses, animated concepts, and lessons you can actually follow.",
      list: ["Courses, free & self-guided", "Animated key concepts", "200-lesson program", "Workshops & mentoring"],
      tone: "violet",
      href: "learn/",
      diagram: <LessonStack count={7} width={260} height={200} mode="dark" />,
    },
    {
      tag: "03 · BUILD",
      title: "Build",
      blurb: "Let's build it together: model design, training pipelines, MLOps, agentic systems, deployment. From a few advisory hours to embedded, shoulder-to-shoulder delivery.",
      list: ["Architecture audits", "Model & pipeline design", "Agentic LLM systems", "MLOps & cloud deployment"],
      tone: "blue",
      href: "cases/",
      diagram: <AgentConstellation width={260} height={200} mode="dark" />,
    },
  ];
  return (
    <Section id="services">
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 56 }}>
          <MonoLabel>// HOW I CAN HELP</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(40px, 4.5vw, 60px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: 0, lineHeight: 1.05, maxWidth: 760,
          }}>
            Work with me.
          </h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 16, marginTop: 4 }}>
            Whether you want to collaborate on research, learn the fundamentals, or
            build something together — here's where to start.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
          {pillars.map(p => {
            const accent = p.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
            const border = p.tone === "violet" ? "var(--border-violet)" : "var(--border)";
            return (
              <a key={p.tag} href={p.href} style={{
                position: "relative",
                padding: "26px 24px 28px",
                border: `1px solid ${border}`,
                borderRadius: 6,
                background: "linear-gradient(180deg, rgba(13, 24, 52, 0.4) 0%, rgba(13, 24, 52, 0.1) 100%)",
                display: "flex", flexDirection: "column", gap: 16,
                overflow: "hidden", textDecoration: "none", color: "inherit",
                transition: "transform .25s, border-color .25s, box-shadow .25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 28px ${p.tone === "violet" ? "rgba(192,132,252,0.18)" : "rgba(96,165,250,0.18)"}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = "none"; }}>
                <HudBrackets mode="dark" inset={8} size={20} />
                <MonoLabel color={accent}>{p.tag}</MonoLabel>
                <div style={{
                  height: 200, display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 4, marginBottom: 4,
                }}>{p.diagram}</div>
                <h3 style={{
                  fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 28,
                  letterSpacing: "-0.015em", color: "var(--white)", margin: 0,
                }}>{p.title}</h3>
                <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{p.blurb}</div>
                <ul style={{
                  margin: 0, padding: 0, listStyle: "none",
                  display: "flex", flexDirection: "column", gap: 6, marginTop: 4,
                }}>
                  {p.list.map(item => (
                    <li key={item} className="t-small"
                      style={{ color: "var(--white)", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 4, height: 4, borderRadius: 999, background: accent, boxShadow: `0 0 6px ${accent}` }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <span className="t-mono-s" style={{ color: accent, fontSize: 10, marginTop: 4 }}>ENTER →</span>
              </a>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

// (Tech stack moved to the About page — kept off the portfolio front door.)

// ─── Selected Work (consolidated from /work/ — research left, learn right) ────
function SelectedWorkCard({ id, title, role, status, tech, description, diagram, href }) {
  const external = href && /^https?:/.test(href);
  const wrapProps = href ? (external ? { href, target: "_blank", rel: "noopener" } : { href }) : {};
  return (
    <a {...wrapProps} style={{
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
      <div style={{ position: "relative", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>{diagram}</div>
      <div style={{ position: "relative", padding: "20px 22px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 24, letterSpacing: "-0.015em", color: "var(--white)", margin: 0 }}>{title}</h3>
        <MonoLabel>{role}</MonoLabel>
        <div className="t-body" style={{ color: "var(--muted)", marginTop: 4, fontSize: 14, lineHeight: 1.55 }}>{description}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {tech.map(t => <TechChip key={t} tone="violet" mode="dark">{t}</TechChip>)}
        </div>
      </div>
    </a>
  );
}

function SelectedWork() {
  const mobile = useIsMobile();
  // RESEARCH on the left, LEARN on the right — row-major fill.
  const projects = [
    {
      id: "RESEARCH", title: "Small Language Models Survey", role: "// RESEARCH · ACM TIST · CO-AUTHOR", status: "RESEARCH",
      description: "Co-author on a comprehensive survey of small language models in the era of LLMs — architectures, training, compression, and deployment. Accepted by ACM TIST.",
      tech: ["NLP", "LLM", "SURVEY"], href: "research/",
      diagram: <TransformerBlock width={320} height={200} mode="dark" inputLabel="SLM" blockLabel="SURVEY" headLabel="TIST" />,
    },
    {
      id: "LEARN", title: "ML from Scratch", role: "// LEARN · PYTHON, NUMPY, PYTORCH", status: "LEARN",
      description: "200 notebooks across 20 modules — every algorithm built in NumPy first, from linear regression through transformers, RL, and LLM systems. Condensed on-site; full notebooks on GitHub.",
      tech: ["PYTHON", "PYTORCH", "NUMPY"], href: "https://github.com/derrickmo/machine_learning_tutorials",
      diagram: <LessonStack count={7} width={340} height={200} mode="dark" />,
    },
    {
      id: "RESEARCH", title: "MentalNet", role: "// RESEARCH · AMIA · FIRST AUTHOR", status: "RESEARCH",
      description: "First-author AMIA podium paper — BERT-based detection of mental disease from clinical text, with downstream work on Beck's cognitive patterns.",
      tech: ["BERT", "NLP", "CLINICAL"], href: "research/",
      diagram: <TransformerBlock width={320} height={200} mode="dark" inputLabel="TEXT" blockLabel="BERT" headLabel="DX" />,
    },
    {
      id: "LEARN", title: "Hugging Face Tutorials", role: "// LEARN · TRANSFORMERS, AGENTS, RAG", status: "LEARN",
      description: "38 hands-on notebooks across 7 sections — NLP, vision, audio, multimodal, production, and agentic workflows (MCP, RAG, structured output). Each a complete, runnable walkthrough.",
      tech: ["HUGGINGFACE", "TRANSFORMERS", "AGENTS"], href: "learn/huggingface/",
      diagram: <TransformerBlock width={320} height={200} mode="dark" inputLabel="HF" blockLabel="MODEL" headLabel="HUB" />,
    },
  ];
  return (
    <Section id="work">
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <GlowBlob color="blue" size={460} x={"-10%"} y={"30%"} opacity={0.14} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
          <MonoLabel>// SELECTED WORK</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(32px, 4vw, 48px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: 0, lineHeight: 1.05,
          }}>The public proof.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 16, marginTop: 4 }}>
            Peer-reviewed research on the left, open teaching work on the right.
            Each links to the full thing.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2, 1fr)", gap: 18 }}>
          {projects.map((p, i) => <SelectedWorkCard key={i} {...p} />)}
        </div>
        <div style={{ marginTop: 16 }}>
          <MonoLabel color="var(--muted)">// RESEARCH · LEFT      // LEARN · RIGHT      // MORE TO COME</MonoLabel>
        </div>
      </Container>
    </Section>
  );
}

// ─── Lab preview — links to subpages ──────────────────────────
function LabPreview() {
  const mobile = useIsMobile();
  const cards = [
    {
      href: "learn/", tag: "// LEARN", title: "Complete ML/DL Course",
      features: [
        "ML from Scratch — first principles in NumPy",
        "HuggingFace — vision, NLP, audio, agents",
        "Key Concepts — animated visual explainers",
        "Condensed lectures on-site, notebooks on GitHub",
        "Organized into clear tracks",
      ],
      tone: "blue",
      diagram: <LessonStack count={6} width={300} height={160} mode="dark" />,
    },
    {
      href: "visualize/", tag: "// VISUALIZE", title: "Interactive ML/DL Library",
      features: [
        "Real algorithms, in your browser",
        "Search, clustering, optimization",
        "Attention, tokenization, diffusion",
        "Training, scaling, retrieval",
        "Grouped by concept",
      ],
      tone: "violet",
      diagram: <NeuralNet layers={[3,5,4,3]} width={300} height={160} mode="dark" glow={0.7} />,
    },
    {
      href: "play/", tag: "// PLAY", title: "AI Game Hub",
      features: [
        "Games you play directly in the browser",
        "Watch neural nets learn to play",
        "Beat (or lose to) a minimax engine",
        "An AI that reads your patterns",
        "No backend — all in your tab",
      ],
      tone: "blue",
      diagram: <AgentConstellation width={260} height={160} mode="dark" />,
    },
  ];
  return (
    <Section id="lab">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <GlowBlob color="violet" size={500} x={"75%"} y={"20%"} opacity={0.18} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 48 }}>
          <MonoLabel>// THE LAB</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(40px, 4.5vw, 60px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: 0, lineHeight: 1.05,
          }}>Learn it. Visualize it. Play with it.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 16, marginTop: 4 }}>
            Not a portfolio page — working surfaces you can actually use: two full courses
            and a lab of interactive demos that run the real algorithms in your browser.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {cards.map(c => {
            const accent = c.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
            const border = c.tone === "violet" ? "var(--border-violet)" : "var(--border)";
            return (
              <a key={c.href} href={c.href} style={{
                position: "relative", overflow: "hidden",
                border: `1px solid ${border}`, borderRadius: 6,
                background: "linear-gradient(180deg, rgba(13, 24, 52, 0.5) 0%, rgba(13, 24, 52, 0.2) 100%)",
                padding: "26px 26px 28px",
                display: "flex", flexDirection: "column", gap: 14,
                textDecoration: "none", color: "inherit",
                transition: "transform .25s, border-color .25s, box-shadow .25s",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.boxShadow = `0 0 32px ${c.tone === "violet" ? "rgba(192,132,252,0.2)" : "rgba(96,165,250,0.2)"}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.boxShadow = "none";
                }}>
                <HudBrackets mode="dark" inset={8} size={20} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <MonoLabel color={accent}>{c.tag}</MonoLabel>
                  <span className="t-mono-s" style={{ color: accent, fontSize: 9, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: accent, boxShadow: `0 0 6px ${accent}` }} />LIVE
                  </span>
                </div>
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.diagram}
                </div>
                <h3 style={{
                  fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 28,
                  letterSpacing: "-0.015em", color: "var(--white)", margin: 0,
                }}>{c.title}</h3>
                {c.features ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {c.features.map(f => (
                      <li key={f} className="t-small" style={{ color: "var(--white)", opacity: 0.82, fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ flexShrink: 0, marginTop: 7, width: 4, height: 4, borderRadius: 999, background: accent, boxShadow: `0 0 6px ${accent}` }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{c.blurb}</div>
                )}
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="t-mono-s" style={{ color: accent }}>ENTER →</span>
                </div>
              </a>
            );
          })}
        </div>
        <a href="paths/" style={{
          position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 16,
          padding: "24px 30px", border: "1px solid var(--border-violet)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.12) 0%, rgba(59,130,246,0.06) 100%)",
          textDecoration: "none", color: "inherit",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(192,132,252,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-violet)"; e.currentTarget.style.boxShadow = "none"; }}>
          <HudBrackets mode="dark" inset={8} size={16} />
          <div>
            <MonoLabel color="var(--violet-lt)">// GUIDED PATHS · NOT SURE WHERE TO START?</MonoLabel>
            <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 22, color: "var(--white)", marginTop: 8 }}>
              Follow a curated track — from "Zero to Transformer" to "RL from Scratch" — in the order that builds understanding.
            </div>
            <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
              11 paths through the demos, concepts, and lessons. Progress saves as you go.
            </div>
          </div>
          <span className="t-mono-s" style={{ color: "var(--violet-lt)", whiteSpace: "nowrap" }}>BROWSE PATHS →</span>
        </a>
      </Container>
    </Section>
  );
}

// ─── App root ─────────────────────────────────────────────────
// ─── Concepts in motion (animated explainers) ─────────────────
function ConceptsInMotion() {
  const mobile = useIsMobile();
  const BASE = window.__DM_BASE || "";
  const tiles = [
    { src: "viz/feedforward.html", label: "// FORWARD PASS", name: "Feedforward Net" },
    { src: "viz/convolution.html", label: "// KERNEL SCAN", name: "Convolution" },
    { src: "viz/transformer.html", label: "// SELF-ATTENTION", name: "Transformers" },
    { src: "viz/gradient.html", label: "// OPTIMIZATION", name: "Gradient Descent" },
    { src: "viz/recurrence.html", label: "// SEQUENCE", name: "Recurrence" },
    { src: "viz/embeddings.html", label: "// REPRESENTATION", name: "Embeddings" },
  ];
  return (
    <Section id="motion" style={{ position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <GlowBlob color="violet" size={460} x={"85%"} y={"10%"} opacity={0.16} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
          <MonoLabel color="var(--violet-lt)">// CONCEPTS IN MOTION</MonoLabel>
          <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(32px, 4vw, 48px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05 }}>
            The ideas, animated.
          </h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 16, marginTop: 4 }}>
            A growing gallery of looping visual explainers for the concepts behind modern AI — from attention to diffusion. Built to make the math click at a glance. Browse them all in <a href={`${BASE}learn/key-concepts/`} style={{ color: "var(--violet-lt)", textDecoration: "none" }}>Key Concepts</a>.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {tiles.map(t => (
            <div key={t.src} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(5, 8, 22, 0.5)", display: "flex", flexDirection: "column" }}>
              <HudBrackets mode="dark" inset={8} size={18} />
              <iframe src={`${BASE}${t.src}`} title={t.name} loading="lazy" scrolling="no"
                style={{ width: "100%", height: 210, border: "none", background: "transparent", pointerEvents: "none", display: "block" }} />
              <div style={{ padding: "16px 20px 18px", borderTop: "1px solid var(--border)" }}>
                <div className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18, color: "var(--white)" }}>{t.name}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <a href={`${BASE}learn/key-concepts/`} className="t-mono-s" style={{
            display: "inline-block", padding: "12px 22px", border: "1px solid var(--violet)", borderRadius: 4,
            color: "var(--white)", textDecoration: "none", letterSpacing: "0.1em", background: "rgba(168,85,247,0.10)",
          }}>SEE ALL KEY CONCEPTS →</a>
        </div>
      </Container>
    </Section>
  );
}

// ─── Quick section jump-nav (sticky, follows scroll below the top nav) ─────────
function useNavHeight() {
  const [h, setH] = React.useState(64);
  React.useEffect(() => {
    const measure = () => { const n = document.querySelector("nav"); if (n) setH(n.offsetHeight); };
    measure(); const t = setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t); };
  }, []);
  return h;
}
function SectionJump() {
  const navH = useNavHeight();
  const items = [
    { href: "#motion", label: "IDEAS, ANIMATED" },
    { href: "#lab", label: "LEARN & PLAY" },
    { href: "#work", label: "SELECTED WORK" },
    { href: "#services", label: "WORK WITH ME" },
    { href: "#about", label: "ABOUT" },
  ];
  return (
    <div style={{
      position: "sticky", top: navH, zIndex: 40,
      backdropFilter: "blur(12px)", background: "rgba(5,8,22,0.82)",
      borderTop: "1px solid rgba(96,165,250,0.12)",
      borderBottom: "1px solid rgba(96,165,250,0.12)",
    }}>
      <Container style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "11px 48px", alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginRight: 4 }}>JUMP TO</span>
        {items.map(it => (
          <a key={it.href} href={it.href} className="t-mono-s"
            style={{ padding: "5px 11px", border: "1px solid var(--border)", borderRadius: 999, color: "var(--muted)", textDecoration: "none", fontSize: 10, letterSpacing: "0.08em" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--blue-br)"; e.currentTarget.style.borderColor = "var(--blue-lt)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
            {it.label}
          </a>
        ))}
      </Container>
    </div>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <Hero />
      <SectionJump />
      <ConceptsInMotion />
      <LabPreview />
      <SelectedWork />
      <Services />
      <About />
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
