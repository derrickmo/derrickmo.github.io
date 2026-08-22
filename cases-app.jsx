// cases-app.jsx — page app for /cases/index.html.
// The Consulting pillar: how Derrick works. Engagement areas, a clear process
// flow, and ways to work together. No fabricated case studies — honest framing.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  AgentConstellation,
  Section, Container, TopNav, Footer, MonoLabel, TechChip, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../";

// ─── Hero ─────────────────────────────────────────────────────
function CasesHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 72, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="blue" size={520} x={"-10%"} y={"-20%"} opacity={0.24} />
      <GlowBlob color="violet" size={480} x={"70%"} y={"45%"} opacity={0.2} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={5} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{
            position: "absolute", left: -18, top: 20, bottom: 70, width: 3,
            background: "linear-gradient(to bottom, #3b82f6, #a855f7)",
            boxShadow: "0 0 16px rgba(59,130,246,0.5)",
          }} />
          <MonoLabel>// BUILD · AI ENGINEERING</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(46px, 6vw, 80px)", letterSpacing: "-0.025em",
            lineHeight: 0.98, margin: 0,
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Let's build it<br/>for real.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 620, fontSize: 17, lineHeight: 1.6 }}>
            I help teams take ML from "interesting notebook" to "running in production" —
            model design, training pipelines, agentic LLM systems, and the MLOps to keep
            them alive. Research-grade rigor, AWS-first delivery, built alongside you.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {["CV", "NLP", "LLM", "AGENTIC", "MLOPS", "AWS"].map(t =>
              <TechChip key={t} tone="violet" mode="dark">{t}</TechChip>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button type="button" onClick={() => window.__dmCopyEmail()} title="Copy email address" style={{
              padding: "12px 22px", border: "1px solid var(--blue)", borderRadius: 4,
              color: "var(--white)", textDecoration: "none", cursor: "pointer",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
              background: "rgba(59,130,246,0.08)", boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>START A CONVERSATION →</button>
            <a href="#process" style={{
              padding: "12px 22px", border: "1px solid var(--border)", borderRadius: 4,
              color: "var(--muted)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            }}>SEE THE PROCESS</a>
          </div>
        </div>
        {!mobile && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <AgentConstellation
              width={420} height={340} mode="dark"
              center={{ label: "SHIP" }}
              satellites={[{ label: "DATA" }, { label: "MODEL" }, { label: "SERVE" }, { label: "EVAL" }]}
            />
          </div>
        )}
      </Container>
    </Section>
  );
}

// ─── What I help with ─────────────────────────────────────────
function Engagements() {
  const mobile = useIsMobile();
  const items = [
    { tag: "01", title: "Architecture & audits", tone: "blue", desc: "A second set of eyes on an ML system or a plan — design review, risk, and a prioritized path to fix what's actually blocking you." },
    { tag: "02", title: "Model & pipeline design", tone: "violet", desc: "Data pipeline, model choice, and training loop across computer vision, NLP, and multimodal — built to train reproducibly and serve fast." },
    { tag: "03", title: "Agentic LLM systems", tone: "blue", desc: "RAG, tool use, multi-agent orchestration, and structured output — with evaluation that catches regressions before users do." },
    { tag: "04", title: "Training & fine-tuning", tone: "violet", desc: "LoRA / QLoRA, instruction tuning, and alignment (RLHF / DPO), plus the efficiency tricks to do it on a sane budget." },
    { tag: "05", title: "MLOps & deployment", tone: "blue", desc: "Inference platforms, containerization, CI/CD, monitoring, and cost optimization — production-grade, AWS-first." },
    { tag: "06", title: "Evaluation & benchmarking", tone: "violet", desc: "Honest eval harnesses and model selection across GPT, Claude, open-source, and domain-specific models." },
  ];
  return (
    <Section id="engagements">
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <Container>
        <div style={{ marginBottom: 36 }}>
          <MonoLabel>// WHAT I HELP WITH</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(32px, 4vw, 50px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: "10px 0 0", lineHeight: 1.05,
          }}>Where I plug in.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {items.map(it => {
            const accent = it.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
            const border = it.tone === "violet" ? "var(--border-violet)" : "var(--border)";
            return (
              <div key={it.tag} style={{
                position: "relative", overflow: "hidden",
                padding: "24px 22px", border: `1px solid ${border}`, borderRadius: 6,
                background: "rgba(13, 24, 52, 0.4)", display: "flex", flexDirection: "column", gap: 10,
              }}>
                <HudBrackets mode="dark" inset={8} size={16} />
                <MonoLabel color={accent}>{it.tag}</MonoLabel>
                <h3 style={{
                  fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 21,
                  letterSpacing: "-0.01em", color: "var(--white)", margin: 0, lineHeight: 1.2,
                }}>{it.title}</h3>
                <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{it.desc}</div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

// ─── Process flow ─────────────────────────────────────────────
function Process() {
  const steps = [
    { n: "01", title: "Scope", desc: "Pin down the real problem, the constraints, and what “done” looks like. If it's fuzzy, a short paid discovery first — no big commitment to find out if we're a fit." },
    { n: "02", title: "Diagnose", desc: "Audit the data, models, and infrastructure. Find the actual bottleneck — data quality, modeling, serving, or evaluation — and write it up plainly." },
    { n: "03", title: "Prototype", desc: "Build the smallest thing that proves the approach, measured against a baseline on your real data. Kill bad ideas cheaply." },
    { n: "04", title: "Productionize", desc: "Harden it: training pipeline, inference, monitoring, and cost. It ships to your stack, not a notebook on my laptop." },
    { n: "05", title: "Hand off", desc: "Documentation, runbooks, and a walkthrough so your team owns it. Optional ongoing advisory if you want me on call." },
  ];
  return (
    <Section id="process">
      <GlowBlob color="violet" size={460} x={"82%"} y={"20%"} opacity={0.16} />
      <Container>
        <div style={{ marginBottom: 36 }}>
          <MonoLabel>// THE PROCESS</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(32px, 4vw, 50px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: "10px 0 0", lineHeight: 1.05,
          }}>How an engagement runs.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 16, marginTop: 8 }}>
            Same shape whether it's a two-week audit or a multi-month build. Each
            stage has a concrete output, so you always know what you're paying for.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start",
              padding: "22px 0", borderTop: i === 0 ? "none" : "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid var(--border-strong)", background: "rgba(59,130,246,0.08)",
                  fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 20, color: "var(--blue-br)",
                }}>{s.n}</div>
                {i < steps.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 18, background: "var(--border)" }} />}
              </div>
              <div style={{ paddingTop: 6 }}>
                <h3 style={{
                  fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 24,
                  letterSpacing: "-0.015em", color: "var(--white)", margin: "0 0 6px",
                }}>{s.title}</h3>
                <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 680 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Ways to work ─────────────────────────────────────────────
function Models() {
  const mobile = useIsMobile();
  const models = [
    { tag: "ADVISORY", title: "Advisory", tone: "blue", desc: "Hourly or a light monthly retainer. Architecture reviews, unblocking your team, sanity-checking a roadmap before you commit budget.", best: "Best for: a team that needs senior ML judgment on tap." },
    { tag: "PROJECT", title: "Project", tone: "violet", desc: "Fixed scope, fixed outcome. A defined deliverable with a baseline and acceptance criteria agreed up front.", best: "Best for: a concrete build with a clear finish line." },
    { tag: "EMBEDDED", title: "Embedded", tone: "blue", desc: "Part-time, hands-on delivery alongside your team for a defined stretch — I write code and ship, not just slides.", best: "Best for: extra senior capacity to get something out the door." },
  ];
  return (
    <Section id="models">
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <Container>
        <div style={{ marginBottom: 36 }}>
          <MonoLabel>// WAYS TO WORK</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(32px, 4vw, 50px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: "10px 0 0", lineHeight: 1.05,
          }}>Three ways to engage.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {models.map(m => {
            const accent = m.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
            const border = m.tone === "violet" ? "var(--border-violet)" : "var(--border)";
            return (
              <div key={m.tag} style={{
                position: "relative", overflow: "hidden",
                padding: "26px 24px", border: `1px solid ${border}`, borderRadius: 6,
                background: "linear-gradient(180deg, rgba(13,24,52,0.5) 0%, rgba(13,24,52,0.15) 100%)",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <HudBrackets mode="dark" inset={8} size={18} />
                <MonoLabel color={accent}>{m.tag}</MonoLabel>
                <h3 style={{
                  fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 26,
                  letterSpacing: "-0.015em", color: "var(--white)", margin: 0,
                }}>{m.title}</h3>
                <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{m.desc}</div>
                <div className="t-small" style={{ color: "var(--white)", opacity: 0.7, fontSize: 13, marginTop: "auto" }}>{m.best}</div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

// ─── Case studies note (honest) ───────────────────────────────
function CasesNote() {
  return (
    <Section style={{ paddingTop: 16, paddingBottom: 24 }}>
      <Container>
        <div style={{
          position: "relative", overflow: "hidden",
          padding: "28px 30px", border: "1px dashed var(--border)", borderRadius: 8,
          background: "rgba(13,24,52,0.3)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap",
        }}>
          <div>
            <MonoLabel color="var(--violet-lt)">// CASE STUDIES</MonoLabel>
            <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, marginTop: 8, maxWidth: 640 }}>
              Written case studies will land here as engagements close and become
              publishable. Until then, the clearest signal of how I work is the
              open-source curriculum, the research, and the interactive lab.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={`${BASE}research/`} className="t-mono-s" style={{ padding: "10px 16px", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", textDecoration: "none" }}>RESEARCH →</a>
            <a href={`${BASE}learn/`} className="t-mono-s" style={{ padding: "10px 16px", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", textDecoration: "none" }}>LEARN →</a>
            <a href={`${BASE}visualize/`} className="t-mono-s" style={{ padding: "10px 16px", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", textDecoration: "none" }}>VISUALIZE →</a>
          </div>
        </div>
      </Container>
    </Section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────
function CasesCta() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Container>
        <div style={{
          position: "relative", overflow: "hidden", padding: "44px 44px",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(59,130,246,0.08) 0%, rgba(168,85,247,0.08) 100%)",
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.5fr auto", gap: 32, alignItems: "center",
        }}>
          <GlowBlob color="blue" size={300} x={-50} y={"40%"} opacity={0.22} />
          <HudBrackets mode="dark" inset={10} size={22} />
          <div>
            <MonoLabel>// HAVE A PROBLEM?</MonoLabel>
            <h3 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 34,
              letterSpacing: "-0.02em", color: "var(--white)", margin: "10px 0 12px",
            }}>Tell me the shape of it.</h3>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 600, fontSize: 15, lineHeight: 1.55 }}>
              A few sentences on the problem and the constraints is enough to start.
              I'll reply within 48 hours with whether and how I can help.
            </div>
          </div>
          <button type="button" onClick={() => window.__dmCopyEmail()} title="Copy email address" style={{
            padding: "14px 26px", border: "1px solid var(--blue-lt)", borderRadius: 4,
            color: "var(--white)", textDecoration: "none", cursor: "pointer",
            fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            background: "rgba(59,130,246,0.18)", boxShadow: "0 0 28px rgba(59,130,246,0.28)",
            whiteSpace: "nowrap",
          }}>START A CONVERSATION →</button>
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
      <CasesHero />
      <Engagements />
      <Process />
      <Models />
      <CasesNote />
      <CasesCta />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
