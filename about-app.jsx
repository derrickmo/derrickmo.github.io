// about-app.jsx — page app for /about/index.html (About Me).
// Intentionally light: a journey + a love of AI. No credential dumps, no employer
// specifics, no metrics — just who I am and why I do this.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../";

// ─── Framed portrait ──────────────────────────────────────────
function Portrait({ size = 320 }) {
  const clip = "polygon(50% 1%, 95% 25%, 95% 75%, 50% 99%, 5% 75%, 5% 25%)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ position: "absolute", inset: -28, zIndex: -1, background: "radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 70%)", filter: "blur(10px)" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: clip, WebkitClipPath: clip, border: "1px solid var(--blue-lt)" }}>
        <img src={`${BASE}assets/derrick-cartoon.webp`} alt="Derrick Mo" width={size} height={size} decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    </div>
  );
}

function AboutHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 56, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="blue" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="violet" size={460} x={"70%"} y={"40%"} opacity={0.2} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={7} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: mobile ? 32 : 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 20, bottom: 50, width: 3, background: "linear-gradient(to bottom, #3b82f6, #a855f7)", boxShadow: "0 0 16px rgba(59,130,246,0.5)" }} />
          <MonoLabel>// ABOUT · DERRICK MO</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(44px, 5.5vw, 76px)", letterSpacing: "-0.025em", lineHeight: 0.99, margin: 0,
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Hooked on how<br/>machines learn.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 600, fontSize: 18, lineHeight: 1.6 }}>
            I'm Derrick, a machine-learning lifelong learner. I fell for AI and decided to
            spend my time building it, understanding it, and teaching it. This page isn't a
            résumé; it's just the why.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Portrait size={mobile ? 230 : 340} />
        </div>
      </Container>
    </Section>
  );
}

function Journey() {
  const paras = [
    `My journey into AI started the day I watched AlphaGo. Something about a machine learning to play a game of pure intuition lit a fire in me, and I set myself a goal that felt both personal and achievable: build a chess engine that could beat me. I'm only an amateur player, so the bar was honestly quite low, but it was a real, concrete thing to chase. Then AlphaZero arrived and rewired how I thought about all of it. A system teaching itself chess, shogi, and Go from nothing but the rules left me genuinely awestruck, and I haven't stopped chasing that feeling since.`,
    `What I believe, more than anything, is that every machine-learning concept has a story to tell, and none of it has to be dull. Gradient descent is a ball rolling downhill; attention is deciding what to look at; a transformer is a conversation between words. We humans learn best creatively and heuristically, through intuition and narrative, and that is exactly how I try to learn and to teach. It's the whole reason this site exists: to turn the math into something you can feel.`,
    `Above all I think of myself as a lifelong learner. I actively follow the cutting edge, reading the new work and rebuilding it from scratch so I actually understand it, and I genuinely enjoy the parts most people find hard: the computational mathematics underneath, and the messy, satisfying puzzle of getting a deep-learning system to truly work. If that sounds like your kind of fun too, I'd love to talk.`,
  ];
  return (
    <Section id="story" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <Container style={{ maxWidth: 800 }}>
        <h2 className="t-mono-s" style={{ color: "var(--violet-lt)", display: "inline", margin: 0 }}>
          <span aria-hidden="true">// </span>The why
        </h2>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 20 }}>
          {paras.map((p, i) => (
            <p key={i} className="t-body" style={{ color: "var(--white)", opacity: 0.92, fontSize: 17.5, lineHeight: 1.75, margin: 0 }}>{p}</p>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
          <a href={`${BASE}learn/`} className="t-mono-s" style={{ padding: "12px 22px", border: "1px solid var(--blue)", borderRadius: 4, color: "var(--white)", textDecoration: "none", letterSpacing: "0.1em", background: "rgba(59,130,246,0.08)", boxShadow: "0 0 24px rgba(59,130,246,0.18)" }}>SEE WHAT I TEACH →</a>
          <button type="button" onClick={() => window.__dmCopyEmail()} title="Copy email address" className="t-mono-s" style={{ padding: "12px 22px", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", background: "transparent", textDecoration: "none", letterSpacing: "0.1em", cursor: "pointer" }}>SAY HELLO →</button>
        </div>
      </Container>
    </Section>
  );
}

function App() {
  return (<><TopNav />
      <main id="main" tabIndex={-1}><AboutHero /><Journey /></main>
      <Footer /></>);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
