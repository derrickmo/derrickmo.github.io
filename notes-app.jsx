// notes-app.jsx — Learn ▸ Notes. Short, plain-language intros to core ideas.
// Each note introduces one concept in a paragraph and points to where to go deeper.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../../";

const NOTES = [
  {
    tag: "// TRANSFORMERS", title: "What attention actually is",
    body: "Attention is a weighted average. For each token, the model scores how relevant every other token is (a dot product), softmaxes those scores into weights that sum to one, and blends the others' values accordingly. \"Self-attention\" just means a sequence attending to itself. Everything else in a transformer is plumbing around this one idea.",
    href: "visualize/attention/", hrefLabel: "SEE THE DEMO →",
  },
  {
    tag: "// OPTIMIZATION", title: "Why gradient descent works",
    body: "Training is just rolling downhill. The loss is a landscape over the model's parameters; the gradient points uphill, so we step the opposite way. Do that a few thousand times with a sensible step size and you settle near a minimum. The whole art is the step size (learning rate) and not getting stuck.",
    href: "visualize/gradient-descent/", hrefLabel: "SEE THE DEMO →",
  },
  {
    tag: "// GENERALIZATION", title: "Overfitting, in a paragraph",
    body: "A model that memorizes the training data looks brilliant on it and useless on anything new. That's overfitting — low bias, high variance. Underfitting is the opposite: too simple to capture the pattern. The goal is the sweet spot between them, which you find by watching performance on data the model never trained on.",
    href: "visualize/overfitting/", hrefLabel: "SEE THE DEMO →",
  },
  {
    tag: "// REPRESENTATION", title: "Embeddings = meaning as geometry",
    body: "An embedding turns a word, image, or user into a vector — a point in space — arranged so that similar things land near each other. Once meaning is geometry, \"find related items\" becomes \"find nearby points,\" and analogies become arithmetic (king − man + woman ≈ queen). It's the substrate under search, recommendations, and RAG.",
    href: "visualize/embeddings/", hrefLabel: "SEE THE DEMO →",
  },
  {
    tag: "// LANGUAGE MODELS", title: "What a language model really does",
    body: "A language model only ever predicts the next token, given everything before it. That's it. Everything impressive — answering, translating, coding — emerges from doing that one thing extremely well over a huge vocabulary. How you sample from its predicted distribution (temperature, top-k, top-p) is what makes it feel safe or wild.",
    href: "visualize/decoding/", hrefLabel: "SEE THE DEMO →",
  },
  {
    tag: "// REINFORCEMENT LEARNING", title: "Reinforcement learning in one idea",
    body: "Supervised learning has an answer key; reinforcement learning has only a reward, often delayed. The agent acts, gets a score, and must figure out which earlier actions deserve the credit. That single shift — learning from consequences instead of labels — is what powers game-players, robots, and the alignment step in modern LLMs.",
    href: "visualize/value-iteration/", hrefLabel: "SEE THE DEMO →",
  },
];

function NotesHero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 150, paddingBottom: 32, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={480} x={"75%"} y={"-15%"} opacity={0.18} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={14} />
      <HudBrackets mode="dark" inset={30} size={30} />
      <Container>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <a href={`${BASE}learn/`} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel>NOTES</MonoLabel>
        </div>
        <h1 style={{
          fontFamily: "var(--f-display)", fontWeight: 700, maxWidth: 880,
          fontSize: "clamp(40px, 5vw, 68px)", letterSpacing: "-0.025em", lineHeight: 1.0, margin: 0,
          background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        }}>One idea at a time.</h1>
        <div className="t-body" style={{ color: "var(--muted)", maxWidth: 660, fontSize: 18, lineHeight: 1.6, marginTop: 16 }}>
          Short, plain-language intros to the concepts that everything else builds on — each one a paragraph, no math degree required, with a link to play with it.
        </div>
      </Container>
    </Section>
  );
}

function NotesList() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 64 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.2} />
      <Container style={{ maxWidth: 880, display: "flex", flexDirection: "column", gap: 16 }}>
        {NOTES.map(n => (
          <div key={n.title} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)", padding: mobile ? "22px 22px" : "26px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
            <HudBrackets mode="dark" inset={8} size={16} />
            <MonoLabel color="var(--violet-lt)">{n.tag}</MonoLabel>
            <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 24, letterSpacing: "-0.015em", color: "var(--white)", margin: 0 }}>{n.title}</h2>
            <p className="t-body" style={{ color: "var(--white)", opacity: 0.86, fontSize: 16, lineHeight: 1.7, margin: 0 }}>{n.body}</p>
            <a href={`${BASE}${n.href}`} className="t-mono-s" style={{ color: "var(--violet-lt)", textDecoration: "none", fontSize: 11, marginTop: 2 }}>{n.hrefLabel}</a>
          </div>
        ))}
        <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 11, marginTop: 8 }}>More notes planned — this list grows over time.</div>
      </Container>
    </Section>
  );
}

function App() { return (<><TopNav />
      <main id="main" tabIndex={-1}><NotesHero /><NotesList /></main>
      <Footer /></>); }
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
