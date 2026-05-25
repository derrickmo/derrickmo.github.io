// genai-course-app.jsx — Learn short course: "How I built this site with GenAI."
// A making-of essay about the human + AI workflow behind this portfolio.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../../";

function P({ children }) {
  return <p className="t-body" style={{ color: "var(--white)", opacity: 0.88, fontSize: 16.5, lineHeight: 1.7, margin: 0 }}>{children}</p>;
}
function H({ children }) {
  return <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(26px, 3vw, 34px)", letterSpacing: "-0.02em", color: "var(--white)", margin: "0 0 6px" }}>{children}</h2>;
}

const TOOLS = [
  { tag: "// AGENT · CODE", name: "Claude Code", tone: "blue",
    desc: "An agentic coding tool that lives in the terminal. I describe what I want in plain language; it reads the whole codebase, writes and edits files, runs the build, and fixes its own errors. Almost every line of this site's React + Vite code was written this way — in a conversation, not an IDE." },
  { tag: "// THINKING PARTNER", name: "Claude (Cowork)", tone: "violet",
    desc: "A shared workspace for thinking out loud — planning the information architecture, weighing tradeoffs, drafting and sharpening copy, and keeping decisions straight across long sessions. This is where the 'what' and 'why' get settled before any code is written." },
  { tag: "// VISUALS", name: "Claude Design", tone: "blue",
    desc: "Generates polished, on-brand visual assets. The looping concept animations in Key Concepts and the social share card were designed here, then handed back to Claude Code to wire into the site — pixels in, working pages out." },
];

function GenAIHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 150, paddingBottom: 40, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="blue" size={500} x={"75%"} y={"-15%"} opacity={0.2} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={21} />
      <HudBrackets mode="dark" inset={30} size={30} />
      <Container>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <a href={`${BASE}learn/`} className="t-mono-s" style={{ color: "var(--muted)", textDecoration: "none" }}>← LEARN</a>
          <span className="t-mono-s" style={{ color: "var(--dim)" }}>/</span>
          <MonoLabel>SHORT COURSE</MonoLabel>
        </div>
        <h1 style={{
          fontFamily: "var(--f-display)", fontWeight: 700, maxWidth: 900,
          fontSize: "clamp(38px, 5vw, 64px)", letterSpacing: "-0.025em", lineHeight: 1.02, margin: 0,
          background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        }}>How I built this site with GenAI.</h1>
        <div className="t-body" style={{ color: "var(--muted)", maxWidth: 700, fontSize: 18, lineHeight: 1.6, marginTop: 16 }}>
          This whole portfolio — the code, the demos, the animations — was built in collaboration with AI. Here's the honest making-of: the tools, the workflow, and what a human still has to bring.
        </div>
      </Container>
    </Section>
  );
}

function Article() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 64 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.2} />
      <Container style={{ maxWidth: 880, display: "flex", flexDirection: "column", gap: 40 }}>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MonoLabel color="var(--violet-lt)">// THE PREMISE</MonoLabel>
          <H>The site is the demo.</H>
          <P>
            I do AI engineering, so the most honest thing I can show is AI engineering applied to
            something real — this site. Rather than hand-coding a portfolio, I treated it as a
            production project run with a small team of AI tools, where my job shifted from typing
            code to <i>directing</i>: setting the vision, making the calls, and reviewing the work.
            Everything you're clicking through is the output of that collaboration.
          </P>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MonoLabel color="var(--violet-lt)">// THE CAST</MonoLabel>
          <H>Three tools, three jobs.</H>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 14, marginTop: 4 }}>
            {TOOLS.map(t => {
              const accent = t.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
              return (
                <div key={t.name} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)", padding: "20px 20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <HudBrackets mode="dark" inset={6} size={16} />
                  <span className="t-mono-s" style={{ color: accent, fontSize: 10 }}>{t.tag}</span>
                  <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 20, color: "var(--white)" }}>{t.name}</div>
                  <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>{t.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MonoLabel color="var(--violet-lt)">// THE LOOP</MonoLabel>
          <H>Plan, build, review, repeat.</H>
          <P>
            Every feature followed the same rhythm. First we'd <b>plan</b> in conversation — what
            the section is for, how it should be structured, what tradeoffs matter — until the
            decision was sharp. Then Claude Code would <b>build</b> it: new pages, real algorithms,
            wiring into the nav and build config, finishing with a clean compile and a smoke test.
            Then I'd <b>review</b> — playtest it, react, correct — and we'd iterate. Big changes
            were sequenced into phases so nothing half-finished shipped.
          </P>
          <P>
            The unglamorous part that makes it work: <b>memory</b>. Long projects outrun any single
            session, so decisions, preferences, and state live in durable notes the AI reloads each
            time. "No timestamps." "No employer work." "Never fake a credential." Written down once,
            honored every session after.
          </P>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MonoLabel color="var(--violet-lt)">// STAGE BY STAGE</MonoLabel>
          <H>How this site actually got built.</H>
          <P>
            It didn't arrive fully formed — it grew in waves, each one a round of "build,
            react, refine." Roughly how it went:
          </P>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
            {[
              { n: "01", t: "Foundation", d: "Stand up the core pages and a coherent design system — nav, the HUD look, tokens, and a build that ships free to static hosting. Get the three pillars (Research, Learn, Build) reading clearly." },
              { n: "02", t: "The teaching library", d: "Condense a 200-notebook curriculum into on-site module lectures, add a second applied course, and wire it all into a Learn hub." },
              { n: "03", t: "Make the math tactile", d: "Build the interactive demos — each computing the real algorithm in the browser (PCA, SVM, attention, diffusion, a live-trained VAE, and more). One reusable demo framework, many demos." },
              { n: "04", t: "Restructure as it grew", d: "Once there was enough, the information architecture got reworked: split the lab into Visualize (demos) and Play (AI games), fold in animated Key Concepts, and tighten every section's voice." },
              { n: "05", t: "Games & polish", d: "Add playable AI games, then a long polish pass — copy, accessibility, sitemap, broken-link cleanup, and a deploy pipeline — toward a v1 worth publishing." },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22, color: "var(--violet-lt)", lineHeight: 1.2, minWidth: 30 }}>{s.n}</span>
                <div>
                  <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 18, color: "var(--white)" }}>{s.t}</div>
                  <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, marginTop: 2 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <P>
            The key thing: almost nothing was right the first time, and that was fine.
            Each feature shipped, got <i>looked at</i>, and came back with feedback —
            "too sparse," "wrong order," "make it playable." Cheap iterations, compounding.
            That tight loop is what AI-assisted building actually feels like.
          </P>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MonoLabel color="var(--violet-lt)">// DIVISION OF LABOR</MonoLabel>
          <H>What the AI did — and what I still own.</H>
          <P>
            The AI is extraordinary at <i>execution</i>: scaffolding pages, implementing a real
            kernelized SVM or a genetic algorithm correctly, refactoring across dozens of files,
            and never tiring on the tedious parts. It turns a paragraph of intent into a working,
            tested feature in minutes.
          </P>
          <P>
            What stays with me is <i>judgment</i>: taste (what's elegant vs. cluttered), truth
            (every claim on this site has to be real — no invented papers, no padded numbers),
            priorities (what's worth building at all), and voice. The AI proposes; I decide. That
            division is the whole point — it's not automation replacing the work, it's leverage
            multiplying it.
          </P>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MonoLabel color="var(--violet-lt)">// TAKEAWAY</MonoLabel>
          <H>Direction is the new bottleneck.</H>
          <P>
            Building with GenAI didn't remove the engineering — it moved it up a level. The scarce
            skill is no longer typing the code; it's knowing what to build, recognizing when the
            output is right, and holding a coherent vision across a long, messy project. If you can
            do that, a single person can ship something that used to take a team. This site is my
            proof of concept — and the same way I built it is the way I help others build theirs.
          </P>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <a href={`${BASE}visualize/`} className="t-mono-s" style={{ padding: "12px 20px", border: "1px solid var(--blue-lt)", borderRadius: 4, color: "var(--white)", textDecoration: "none", background: "rgba(59,130,246,0.10)" }}>SEE THE DEMOS →</a>
          <a href={`${BASE}cases/`} className="t-mono-s" style={{ padding: "12px 20px", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)", textDecoration: "none" }}>WORK WITH ME →</a>
        </div>
      </Container>
    </Section>
  );
}

function App() {
  return (<><TopNav /><GenAIHero /><Article /><Footer /></>);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
