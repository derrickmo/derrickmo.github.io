// research-app.jsx — page app for /research/index.html (Research pillar).
// Flagship: the Small Language Models survey (ACM TIST). Then publications,
// patents, and current research interests.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  NeuralNet, TransformerBlock, AgentConstellation,
  Section, Container, TopNav, Footer, MonoLabel, TechChip, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../";
const SLM_REPO = "https://github.com/FairyFali/SLMs-Survey";

// ─── Hero ─────────────────────────────────────────────────────
function ResearchHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 64, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="blue" size={460} x={"70%"} y={"40%"} opacity={0.2} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={13} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{
            position: "absolute", left: -18, top: 20, bottom: 70, width: 3,
            background: "linear-gradient(to bottom, #a855f7, #3b82f6)",
            boxShadow: "0 0 16px rgba(168,85,247,0.5)",
          }} />
          <MonoLabel>// RESEARCH · COLLABORATION</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(46px, 6vw, 80px)", letterSpacing: "-0.025em",
            lineHeight: 0.98, margin: 0,
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Research<br/>that ships.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 620, fontSize: 17, lineHeight: 1.6 }}>
            Published, peer-reviewed work in NLP and language models — and an active
            interest in reinforcement learning for LLM post-training and agentic
            systems. I'm open to research collaborations.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {["NLP", "LLM", "RL", "AGENTIC", "CV", "TRAINING", "FINE-TUNING", "EVALUATION"].map(t =>
              <TechChip key={t} tone="violet" mode="dark">{t}</TechChip>
            )}
          </div>
        </div>
        {!mobile && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <TransformerBlock width={420} height={320} mode="dark"
              inputLabel="SLM" blockLabel="SURVEY" headLabel="TIST" />
          </div>
        )}
      </Container>
    </Section>
  );
}

// ─── Flagship: SLM Survey ─────────────────────────────────────
function Flagship() {
  const covers = [
    "Architectures & efficient design",
    "Training & inference techniques",
    "Compression — quantization, pruning, distillation",
    "On-device & resource-constrained deployment",
    "Applications and the SLM–LLM relationship",
  ];
  return (
    <Section id="flagship" style={{ paddingTop: 40 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <GlowBlob color="violet" size={420} x={"82%"} y={"30%"} opacity={0.16} />
      <Container>
        <div style={{ marginBottom: 28 }}>
          <MonoLabel>// FLAGSHIP</MonoLabel>
        </div>
        <a href={SLM_REPO} target="_blank" rel="noopener" style={{
          position: "relative", overflow: "hidden", display: "block",
          border: "1px solid var(--border-violet)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.08) 100%)",
          padding: "36px 36px", textDecoration: "none", color: "inherit",
          transition: "transform .25s, border-color .25s, box-shadow .25s",
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.borderColor = "var(--violet-lt)";
            e.currentTarget.style.boxShadow = "0 0 36px rgba(192,132,252,0.22)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "var(--border-violet)";
            e.currentTarget.style.boxShadow = "none";
          }}>
          <HudBrackets mode="dark" inset={12} size={24} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <MonoLabel color="var(--violet-lt)">SURVEY · CO-AUTHOR</MonoLabel>
            <MonoLabel color="var(--blue-lt)">ACM TIST · ACCEPTED</MonoLabel>
          </div>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(28px, 3.4vw, 44px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: "16px 0 0", lineHeight: 1.1, maxWidth: 900,
          }}>A Comprehensive Survey of Small Language Models in the Era of Large Language Models.</h2>
          <div className="t-body" style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, marginTop: 14, maxWidth: 820 }}>
            A broad survey of small language models — how they're built, trained,
            compressed, and deployed, and how they relate to the large models they
            run alongside. Accepted by ACM Transactions on Intelligent Systems and
            Technology.
          </div>
          <div className="t-mono" style={{ color: "var(--white)", opacity: 0.7, fontSize: 13, marginTop: 14 }}>
            Wang F, Zhang Z, Zhang X, Wu Z, <span style={{ color: "var(--violet-lt)" }}>Mo T</span>, …, Wang S.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            {covers.map(c => <TechChip key={c} tone="violet" mode="dark">{c}</TechChip>)}
          </div>
          <div style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="t-mono-s" style={{ color: "var(--violet-lt)" }}>VIEW ON GITHUB →</span>
          </div>
        </a>
      </Container>
    </Section>
  );
}

// ─── Publications ─────────────────────────────────────────────
function Publications() {
  const pubs = [
    {
      cite: "Wang F, Zhang Z, Zhang X, Wu Z, Mo T, …, Wang S. A Comprehensive Survey of Small Language Models in the Era of Large Language Models.",
      venue: "ACM Transactions on Intelligent Systems and Technology (accepted)",
      role: "Co-author", href: SLM_REPO, tone: "violet",
    },
    {
      cite: "Li C, Mo T, …, Huang M. Accurate classification of Beck's cognitive patterns by leveraging pretrained language models.",
      venue: "Applied NLP", role: "Co-author", href: null, tone: "blue",
    },
    {
      cite: "Mo T, Zhou J, Selek S, Liu H, Huang M. MentalNet — BERT-based mental disease detection.",
      venue: "AMIA Symposium · podium", role: "First author", href: null, tone: "blue",
    },
  ];
  return (
    <Section id="publications">
      <Container>
        <div style={{ marginBottom: 28 }}>
          <MonoLabel>// PUBLICATIONS</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(30px, 3.4vw, 44px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: "10px 0 0", lineHeight: 1.05,
          }}>Peer-reviewed work.</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pubs.map((p, i) => {
            const accent = p.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
            const border = p.tone === "violet" ? "var(--border-violet)" : "var(--border)";
            const Wrap = p.href ? "a" : "div";
            const wrapProps = p.href ? { href: p.href, target: "_blank", rel: "noopener" } : {};
            return (
              <Wrap key={i} {...wrapProps} style={{
                position: "relative", overflow: "hidden",
                border: `1px solid ${border}`, borderRadius: 6,
                background: "rgba(13, 24, 52, 0.4)", padding: "22px 24px",
                textDecoration: "none", color: "inherit", display: "block",
              }}>
                <HudBrackets mode="dark" inset={8} size={16} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <MonoLabel color={accent}>{p.role}</MonoLabel>
                  {p.href && <span className="t-mono-s" style={{ color: accent, fontSize: 10 }}>VIEW →</span>}
                </div>
                <div className="t-body" style={{ color: "var(--white)", opacity: 0.92, fontSize: 16, lineHeight: 1.5, marginTop: 10 }}>
                  {p.cite}
                </div>
                {p.venue && <div className="t-mono-s" style={{ color: "var(--muted)", marginTop: 8 }}>{p.venue}</div>}
              </Wrap>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

// ─── Patents ──────────────────────────────────────────────────
function Patents() {
  const mobile = useIsMobile();
  const patents = [
    "Devani S, Beron J, Mo D. Systems and Methods for Optically Measuring Oscillating Micro Kinetics.",
    "Devani S, Mo D, Gulati R. Systems and Methods for Measuring Physiologic Vital Signs and Biomarkers.",
  ];
  return (
    <Section id="patents" style={{ paddingTop: 32 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <Container>
        <div style={{ marginBottom: 24 }}>
          <MonoLabel>// PATENTS · CO-INVENTOR</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(26px, 3vw, 38px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: "10px 0 0", lineHeight: 1.05,
          }}>Issued patents.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          {patents.map((p, i) => (
            <div key={i} style={{
              padding: "22px 24px", border: "1px solid var(--border)", borderRadius: 6,
              background: "rgba(13, 24, 52, 0.4)",
            }}>
              <MonoLabel color="var(--blue-lt)">PATENT</MonoLabel>
              <div className="t-body" style={{ color: "var(--white)", opacity: 0.9, fontSize: 15, lineHeight: 1.5, marginTop: 10 }}>{p}</div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Current interests ────────────────────────────────────────
function Interests() {
  return (
    <Section id="interests">
      <GlowBlob color="blue" size={460} x={"-10%"} y={"40%"} opacity={0.16} />
      <Container style={{ maxWidth: 860 }}>
        <MonoLabel>// CURRENT INTEREST</MonoLabel>
        <h2 style={{
          fontFamily: "var(--f-display)", fontWeight: 700,
          fontSize: "clamp(28px, 3.2vw, 42px)", letterSpacing: "-0.02em",
          color: "var(--white)", margin: "12px 0 18px", lineHeight: 1.1,
        }}>RL for LLM post-training.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p className="t-body" style={{ color: "var(--white)", opacity: 0.9, fontSize: 17, lineHeight: 1.7, margin: 0 }}>
            I'm most interested in reinforcement learning methods that improve data
            efficiency in LLM post-training — treating the training data and the
            policy interface as first-class research objects rather than fixed
            inputs. Recent directions like conditional pre-training data selection
            (CoLoR-Filter) and lightweight RL on top of frozen LLM embeddings
            (Q-probe) are the cleanest expressions of that idea.
          </p>
          <p className="t-body" style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.7, margin: 0 }}>
            A question I keep coming back to: how does a data-selection signal
            interact with downstream RL fine-tuning when the target capability is
            multi-step agentic behavior rather than single-token generation?
            Building production agentic systems showed me how
            brittle agent behavior becomes when the underlying capability
            distribution is mismatched — and convinced me the right level to
            address it is the training data and reward modeling, not downstream
            patches.
          </p>
        </div>
      </Container>
    </Section>
  );
}

// ─── Collaborate CTA ──────────────────────────────────────────
function CollabCta() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Container>
        <div style={{
          position: "relative", overflow: "hidden", padding: "44px 44px",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.08) 0%, rgba(59,130,246,0.08) 100%)",
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.5fr auto", gap: 32, alignItems: "center",
        }}>
          <GlowBlob color="violet" size={300} x={-50} y={"40%"} opacity={0.22} />
          <HudBrackets mode="dark" inset={10} size={22} />
          <div>
            <MonoLabel color="var(--violet-lt)">// COLLABORATE</MonoLabel>
            <h3 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 32,
              letterSpacing: "-0.02em", color: "var(--white)", margin: "10px 0 12px",
            }}>Working on something adjacent?</h3>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 600, fontSize: 15, lineHeight: 1.55 }}>
              I'm open to research collaborations in RL for LLMs, post-training, and
              applied NLP. Send a short note on the direction and I'll reply.
            </div>
          </div>
          <button type="button" onClick={() => window.__dmCopyEmail()} title="Copy email address" style={{
            padding: "14px 26px", border: "1px solid var(--violet-lt)", borderRadius: 4,
            color: "var(--white)", textDecoration: "none", cursor: "pointer",
            fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            background: "rgba(168,85,247,0.16)", whiteSpace: "nowrap",
          }}>GET IN TOUCH →</button>
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
      <ResearchHero />
      <Flagship />
      <Publications />
      <Patents />
      <Interests />
      <CollabCta />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
