// weekly-insights-app.jsx — top-level Weekly Insights section.
// A practitioner-grade ML digest, refreshed weekly. Reads
// `window.WEEKLY_INSIGHTS` (set by weekly-insights.js, loaded before this
// script) and renders newest-first. To publish a new week the only data file
// that needs to change is weekly-insights.js — see comment at top of that file.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const BASE = window.__DM_BASE || "../";

function WeeklyInsightsHero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 150, paddingBottom: 32, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={480} x={"75%"} y={"-15%"} opacity={0.18} />
      <MathWatermarks mode="dark" count={4} opacity={0.05} seed={21} />
      <HudBrackets mode="dark" inset={30} size={30} />
      <Container>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <MonoLabel>WEEKLY INSIGHTS</MonoLabel>
        </div>
        <h1 style={{
          fontFamily: "var(--f-display)", fontWeight: 700, maxWidth: 880,
          fontSize: "clamp(40px, 5vw, 68px)", letterSpacing: "-0.025em", lineHeight: 1.0, margin: 0,
          background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        }}>What changed this week.</h1>
        <div className="t-body" style={{ color: "var(--muted)", maxWidth: 680, fontSize: 18, lineHeight: 1.6, marginTop: 16 }}>
          A weekly digest of practitioner-grade ML developments — post-training and RL, data efficiency, agentic systems, quantization and local inference, fine-tuning, and the broader field. Concrete numbers, the practitioner angle, and a source on every item. Newest week on top.
        </div>
      </Container>
    </Section>
  );
}

function SourceLink({ source }) {
  if (!source) return null;
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="t-mono-s"
       style={{ color: "var(--violet-lt)", textDecoration: "none", fontSize: 11, whiteSpace: "nowrap" }}>
      [{source.label} →]
    </a>
  );
}

function Bullet({ item, mobile }) {
  return (
    <li style={{ marginBottom: 12, listStyle: "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ color: "var(--violet-lt)", marginTop: 3, fontSize: 12 }}>▸</span>
      <span className="t-body" style={{ color: "var(--white)", opacity: 0.86, fontSize: mobile ? 14 : 15, lineHeight: 1.65 }}>
        {item.text} <SourceLink source={item.source} />
      </span>
    </li>
  );
}

function WeekCard({ week, mobile }) {
  return (
    <div id={week.date} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)", padding: mobile ? "24px 22px" : "32px 36px", display: "flex", flexDirection: "column", gap: 18 }}>
      <HudBrackets mode="dark" inset={8} size={16} />
      <div>
        <MonoLabel color="var(--violet-lt)">// WEEK OF {week.range.toUpperCase()}</MonoLabel>
        <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: mobile ? 22 : 26, letterSpacing: "-0.015em", color: "var(--white)", margin: "8px 0 0" }}>TL;DR</h2>
      </div>
      <ul style={{ margin: 0, padding: 0 }}>
        {week.tldr.map((t, i) => <Bullet key={i} item={{ text: t }} mobile={mobile} />)}
      </ul>
      {(week.sections || []).map((s) => (
        <div key={s.header} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <MonoLabel color="var(--blue-lt)">{s.header}</MonoLabel>
          <ul style={{ margin: 0, padding: 0 }}>
            {s.items.map((it, i) => <Bullet key={i} item={it} mobile={mobile} />)}
          </ul>
        </div>
      ))}
      {week.watching && week.watching.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <MonoLabel color="var(--blue-lt)">// WORTH WATCHING</MonoLabel>
          <ul style={{ margin: 0, padding: 0 }}>
            {week.watching.map((it, i) => <Bullet key={i} item={it} mobile={mobile} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function WeeklyList() {
  const mobile = useIsMobile();
  const entries = window.WEEKLY_INSIGHTS || [];
  const weeks = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!weeks.length) {
    return (
      <Section style={{ paddingTop: 8, paddingBottom: 64 }}>
        <Container style={{ maxWidth: 900 }}>
          <div className="t-body" style={{ color: "var(--muted)", fontSize: 15 }}>
            No entries yet — the first weekly digest will appear here.
          </div>
        </Container>
      </Section>
    );
  }
  return (
    <Section style={{ paddingTop: 8, paddingBottom: 64 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.2} />
      <Container style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 20 }}>
        {weeks.map((w) => <WeekCard key={w.date} week={w} mobile={mobile} />)}
        <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 11, marginTop: 8 }}>Published weekly. Older weeks are trimmed to keep this feed scannable.</div>
      </Container>
    </Section>
  );
}

function App() { return (<><TopNav /><WeeklyInsightsHero /><WeeklyList /><Footer /></>); }
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
