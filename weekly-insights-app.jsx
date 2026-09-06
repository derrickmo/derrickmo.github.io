// weekly-insights-app.jsx — top-level Weekly Insights section.
// A practitioner-grade ML digest, refreshed weekly. Reads
// `window.WEEKLY_INSIGHTS` (set by weekly-insights.js, loaded before this
// script) and renders newest-first. To publish a new week the only data file
// that needs to change is weekly-insights.js — see comment at top of that file.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

const { useEffect: __useEffect, useState: __useState } = React;

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

// Section items follow a fixed three-part pattern: what's new, how it works,
// impact. tldr/watching items are plain { text } and fall through to the
// legacy single-line bullet.
function PatternRow({ label, body, mobile, source }) {
  if (!body) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <span className="t-mono-s" style={{ color: "var(--blue-lt)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginRight: 8 }}>{label}</span>
      <span className="t-body" style={{ color: "var(--white)", opacity: 0.86, fontSize: mobile ? 15 : 17, lineHeight: 1.6 }}>
        {body}{source ? <> <SourceLink source={source} /></> : null}
      </span>
    </div>
  );
}

function Bullet({ item, mobile }) {
  const structured = item.whatsNew || item.howItWorks || item.impact;
  if (structured) {
    return (
      <li style={{ marginBottom: 18, listStyle: "none", borderLeft: "2px solid var(--border-violet)", paddingLeft: 14 }}>
        {item.title && (
          <div className="t-body" style={{ fontWeight: 600, color: "var(--white)", fontSize: mobile ? 15 : 16, lineHeight: 1.4, marginBottom: 7 }}>
            {item.title}
          </div>
        )}
        <PatternRow label="What's new" body={item.whatsNew} mobile={mobile} />
        <PatternRow label="How it works" body={item.howItWorks} mobile={mobile} />
        <PatternRow label="Impact" body={item.impact} mobile={mobile} source={item.source} />
        {!item.impact && item.source && (
          <div><SourceLink source={item.source} /></div>
        )}
      </li>
    );
  }
  return (
    <li style={{ marginBottom: 12, listStyle: "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ color: "var(--violet-lt)", marginTop: 3, fontSize: 12 }}>▸</span>
      <span className="t-body" style={{ color: "var(--white)", opacity: 0.86, fontSize: mobile ? 15 : 17, lineHeight: 1.65 }}>
        {item.text} <SourceLink source={item.source} />
      </span>
    </li>
  );
}

function WeekCard({ week, mobile }) {
  return (
    <div id={week.date} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)", padding: mobile ? "24px 22px" : "32px 36px", display: "flex", flexDirection: "column", gap: 18, scrollMarginTop: 110 }}>
      <HudBrackets mode="dark" inset={8} size={16} />
      <div>
        <h2 className="t-mono-s" style={{ color: "var(--violet-lt)", display: "inline", margin: 0 }}>
          <span aria-hidden="true">// </span>Week of {week.range}
        </h2>
        <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: mobile ? 22 : 26, letterSpacing: "-0.015em", color: "var(--white)", margin: "8px 0 0" }}>Summary</h3>
      </div>
      <ul style={{ margin: 0, padding: 0 }}>
        {week.tldr.map((t, i) => <Bullet key={i} item={{ text: t }} mobile={mobile} />)}
      </ul>
      {(week.sections || []).map((s) => (
        <div key={s.header} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <h3 className="t-mono-s" style={{ color: "var(--blue-lt)", margin: 0 }}>
            {s.header.startsWith("// ")
              ? <><span aria-hidden="true">// </span>{s.header.slice(3)}</>
              : s.header}
          </h3>
          {s.intro && (
            <div className="t-body" style={{ color: "var(--muted)", fontSize: mobile ? 13 : 14, lineHeight: 1.55, opacity: 0.92, marginTop: -2, maxWidth: 760 }}>
              {s.intro}
            </div>
          )}
          <ul style={{ margin: 0, padding: 0 }}>
            {s.items.map((it, i) => <Bullet key={i} item={it} mobile={mobile} />)}
          </ul>
        </div>
      ))}
      {week.watching && week.watching.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <h3 className="t-mono-s" style={{ color: "var(--blue-lt)", margin: 0 }}>
            <span aria-hidden="true">// </span>Worth watching
          </h3>
          <ul style={{ margin: 0, padding: 0 }}>
            {week.watching.map((it, i) => <Bullet key={i} item={it} mobile={mobile} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

// Sidebar with all weeks in descending order. Clicking jumps to that week's
// card via the hash anchor (each WeekCard sets `id={week.date}`). On desktop
// the sidebar is sticky; on mobile it becomes a compact "JUMP TO" select.
function WeekIndex({ weeks, activeDate, mobile }) {
  if (!weeks.length) return null;
  if (mobile) {
    return (
      <div style={{
        position: "sticky", top: 64, zIndex: 10,
        backdropFilter: "blur(10px)", background: "rgba(5,8,22,0.86)",
        border: "1px solid var(--border)", borderRadius: 6,
        padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
      }}>
        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>JUMP TO</span>
        <select
          value={activeDate || weeks[0].date}
          onChange={(e) => { window.location.hash = e.target.value; }}
          className="t-mono-s"
          style={{
            flex: 1, padding: "6px 8px", borderRadius: 4,
            border: "1px solid var(--border)", background: "rgba(13,24,52,0.6)",
            color: "var(--white)", fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.08em",
            cursor: "pointer", outline: "none",
          }}
        >
          {weeks.map(w => <option key={w.date} value={w.date}>{w.range}</option>)}
        </select>
      </div>
    );
  }
  return (
    <aside style={{ position: "sticky", top: 110 }}>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, letterSpacing: "0.16em", marginBottom: 12 }}>
        // ARCHIVE · {weeks.length} {weeks.length === 1 ? "week" : "weeks"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, borderLeft: "1px solid var(--border)" }}>
        {weeks.map(w => {
          const active = activeDate === w.date;
          return (
            <a
              key={w.date}
              href={`#${w.date}`}
              className="t-mono-s"
              style={{
                position: "relative",
                display: "block",
                padding: "10px 14px",
                marginLeft: -1,
                borderLeft: active ? "2px solid var(--violet-lt)" : "2px solid transparent",
                color: active ? "var(--violet-lt)" : "var(--muted)",
                textDecoration: "none",
                fontSize: 11,
                letterSpacing: "0.05em",
                lineHeight: 1.45,
                transition: "color .15s, border-color .15s, background .15s",
                background: active ? "rgba(168,85,247,0.06)" : "transparent",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--white)"; e.currentTarget.style.borderLeftColor = "var(--border-violet)"; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderLeftColor = "transparent"; } }}
            >
              <div style={{ fontWeight: 600, color: active ? "var(--violet-lt)" : "var(--white)", marginBottom: 2 }}>
                {w.date}
              </div>
              <div style={{ opacity: 0.7, fontSize: 10 }}>
                {w.range}
              </div>
            </a>
          );
        })}
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9, letterSpacing: "0.05em", marginTop: 18, lineHeight: 1.55, paddingLeft: 14, opacity: 0.7 }}>
        Newest first. Older weeks are trimmed to keep this feed scannable; archived digests live in the source repo.
      </div>
    </aside>
  );
}

function WeeklyList() {
  const mobile = useIsMobile();
  const entries = window.WEEKLY_INSIGHTS || [];
  const weeks = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const [activeDate, setActiveDate] = __useState(weeks.length ? weeks[0].date : null);

  // Track which week is currently in view so the sidebar can highlight it.
  __useEffect(() => {
    if (!weeks.length) return;
    const els = weeks.map(w => document.getElementById(w.date)).filter(Boolean);
    if (!els.length) return;
    const observer = new IntersectionObserver((entries) => {
      // Pick the topmost entry whose rect intersects the viewport.
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) setActiveDate(visible[0].target.id);
    }, { rootMargin: "-100px 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [weeks.length]);

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
      <Container style={{
        maxWidth: mobile ? 900 : 1180,
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1fr) 240px",
        gap: mobile ? 0 : 36,
        alignItems: "start",
      }}>
        {mobile && <WeekIndex weeks={weeks} activeDate={activeDate} mobile />}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          {weeks.map((w) => <WeekCard key={w.date} week={w} mobile={mobile} />)}
        </div>
        {!mobile && <WeekIndex weeks={weeks} activeDate={activeDate} mobile={false} />}
      </Container>
    </Section>
  );
}

function App() { return (<><TopNav />
      <main id="main" tabIndex={-1}><WeeklyInsightsHero /><WeeklyList /></main>
      <Footer /></>); }
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
