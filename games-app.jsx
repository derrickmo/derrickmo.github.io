// games-app.jsx — page app for /play/index.html (the AI games hub).
// Reads window.PLAY_GAMES; groups games by category (AI-autonomous first).

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks, NeuralNet,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
} = window;

// ─── Glyphs ───────────────────────────────────────────────────
const GlyphEvolve = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[0, 1, 2, 3].map(g => (
      <g key={g} opacity={0.3 + g * 0.23}>
        {[0, 1, 2].map(b => (
          <circle key={b} cx={28 + g * 36} cy={40 + b * 22 + (g % 2) * 6} r="4.5"
            fill={g === 3 ? "#c084fc" : "#60a5fa"} />
        ))}
      </g>
    ))}
    <path d="M 18 96 Q 60 86, 100 60 T 146 26" stroke="#fbbf24" strokeWidth="2" fill="none" />
    <text x="18" y="112" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#475569">GEN →</text>
  </svg>
);
const GlyphConnect4 = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <rect x="36" y="16" width="88" height="88" rx="6" fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth="1.5" />
    {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => {
      const fill = (r === 3 && c === 1) || (r === 2 && c === 1) ? "#fbbf24" : (r === 3 && c === 2) ? "#c084fc" : "rgba(96,165,250,0.18)";
      return <circle key={`${r}-${c}`} cx={50 + c * 20} cy={30 + r * 20} r="7" fill={fill} />;
    }))}
  </svg>
);
const GlyphRPS = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <text x="34" y="72" fontSize="34">✊</text>
    <text x="66" y="72" fontSize="34">✋</text>
    <text x="98" y="72" fontSize="34">✌</text>
    <path d="M 30 90 Q 80 104, 130 90" stroke="#c084fc" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
  </svg>
);
const Glyph2048 = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <rect x="40" y="16" width="80" height="80" rx="6" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth="1.2" />
    {[["2", 0, 0, "#60a5fa"], ["4", 1, 0, "#93c5fd"], ["16", 0, 1, "#a855f7"], ["2048", 1, 1, "#fbbf24"]].map(([t, c, r, col], i) => (
      <g key={i}>
        <rect x={48 + c * 36} y={24 + r * 36} width="28" height="28" rx="3" fill={col} opacity="0.85" />
        <text x={62 + c * 36} y={42 + r * 36} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill="#050816">{t}</text>
      </g>
    ))}
  </svg>
);
const GlyphTTT = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[60, 16, 60, 104], [100, 16, 100, 104], [40, 44, 120, 44], [40, 76, 120, 76]].map(([x1, y1, x2, y2], i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(96,165,250,0.5)" strokeWidth="1.5" />
    ))}
    <g stroke="#60a5fa" strokeWidth="2.4" fill="none"><line x1="44" y1="20" x2="56" y2="32" /><line x1="56" y1="20" x2="44" y2="32" /></g>
    <circle cx="80" cy="60" r="9" fill="none" stroke="#c084fc" strokeWidth="2.4" />
    <g stroke="#60a5fa" strokeWidth="2.4" fill="none"><line x1="104" y1="84" x2="116" y2="96" /><line x1="116" y1="84" x2="104" y2="96" /></g>
  </svg>
);
const GlyphSnake = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[40, 80], [56, 80], [72, 80], [72, 64], [72, 48], [88, 48], [104, 48]].map(([x, y], i, a) => (
      <rect key={i} x={x} y={y} width="14" height="14" rx="2" fill="#34d399" opacity={0.35 + (i / a.length) * 0.6} />
    ))}
    <rect x="124" y="40" width="11" height="11" rx="2" fill="#fbbf24" />
  </svg>
);
const GlyphCar = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <path d="M 20 96 Q 60 30, 140 24" stroke="rgba(96,165,250,0.4)" strokeWidth="1.5" fill="none" />
    <path d="M 20 70 Q 64 8, 140 0" stroke="rgba(96,165,250,0.25)" strokeWidth="1" fill="none" />
    {[[-26, -18], [-10, -22], [8, -22], [24, -16]].map(([dx, dy], i) => <line key={i} x1="70" y1="64" x2={70 + dx} y2={64 + dy} stroke="rgba(251,191,36,0.4)" strokeWidth="0.8" />)}
    <rect x="62" y="58" width="20" height="12" rx="2" fill="#c084fc" transform="rotate(-14 72 64)" />
  </svg>
);
const GlyphMine = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 5 }).map((_, c) => (
      <rect key={`${r}-${c}`} x={28 + c * 22} y={20 + r * 22} width="20" height="20" rx="2" fill={(r + c) % 3 === 0 ? "rgba(13,24,52,0.7)" : "rgba(96,165,250,0.14)"} stroke="rgba(96,165,250,0.3)" strokeWidth="0.5" />
    )))}
    <circle cx="50" cy="42" r="6" fill="#f87171" />
    <text x="93" y="69" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#60a5fa">2</text>
    <text x="115" y="91" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#c084fc">3</text>
  </svg>
);
const GlyphWordle = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[["#34d399", "#475569", "#fbbf24", "#475569", "#34d399"], ["#475569", "#fbbf24", "#34d399", "#475569", "#475569"]].map((row, r) =>
      row.map((c, i) => <rect key={`${r}-${i}`} x={24 + i * 24} y={36 + r * 26} width="20" height="20" rx="2" fill={c} opacity="0.85" />)
    )}
  </svg>
);

const GlyphChess = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => (
      <rect key={`${r}-${c}`} x={48 + c * 16} y={28 + r * 16} width="16" height="16" fill={(r + c) % 2 ? "rgba(96,165,250,0.22)" : "rgba(13,24,52,0.6)"} />
    )))}
    <rect x="48" y="28" width="64" height="64" fill="none" stroke="rgba(96,165,250,0.4)" strokeWidth="1" />
    <text x="64" y="52" fontSize="18" fill="#c084fc">♞</text>
    <text x="92" y="80" fontSize="18" fill="#60a5fa">♟</text>
  </svg>
);
const GlyphGo = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <g stroke="rgba(96,165,250,0.3)" strokeWidth="0.8">
      {Array.from({ length: 5 }).map((_, i) => <line key={"h" + i} x1="46" y1={26 + i * 17} x2="114" y2={26 + i * 17} />)}
      {Array.from({ length: 5 }).map((_, i) => <line key={"v" + i} x1={46 + i * 17} y1="26" x2={46 + i * 17} y2="94" />)}
    </g>
    {[[63, 43, "#e0e7ff"], [80, 60, "#1b2440"], [80, 43, "#1b2440"], [97, 60, "#e0e7ff"], [63, 60, "#e0e7ff"]].map(([x, y, c], i) => (
      <circle key={i} cx={x} cy={y} r="6" fill={c} stroke="#60a5fa" strokeWidth="0.6" />
    ))}
  </svg>
);
const GlyphPoker = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <rect x="52" y="30" width="34" height="48" rx="4" fill="#0d1834" stroke="#60a5fa" strokeWidth="1.2" transform="rotate(-8 69 54)" />
    <rect x="74" y="30" width="34" height="48" rx="4" fill="#0d1834" stroke="#c084fc" strokeWidth="1.2" transform="rotate(8 91 54)" />
    <text x="64" y="60" fontSize="16" fill="#60a5fa" transform="rotate(-8 69 54)">A♠</text>
    <text x="86" y="60" fontSize="16" fill="#fb7185" transform="rotate(8 91 54)">K♥</text>
  </svg>
);

const GLYPHS = {
  "neuroevolution": <GlyphEvolve />,
  "chess": <GlyphChess />,
  "go": <GlyphGo />,
  "poker": <GlyphPoker />,
  "snake-dqn": <GlyphSnake />,
  "self-driving": <GlyphCar />,
  "tic-tac-toe": <GlyphTTT />,
  "connect-four": <GlyphConnect4 />,
  "rps": <GlyphRPS />,
  "twenty48": <Glyph2048 />,
  "minesweeper": <GlyphMine />,
  "wordle": <GlyphWordle />,
};

// ─── Hero ─────────────────────────────────────────────────────
function PlayHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 72, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="blue" size={480} x={"70%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={7} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.05fr) minmax(0, 0.95fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 20, bottom: 70, width: 3, background: "linear-gradient(to bottom, #a855f7, #3b82f6)", boxShadow: "0 0 16px rgba(168,85,247,0.5)" }} />
          <MonoLabel color="var(--violet-lt)">// PLAY · AI GAMES</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(48px, 6vw, 84px)", letterSpacing: "-0.025em",
            lineHeight: 0.98, margin: 0,
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Play against AI.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 620, fontSize: 17, lineHeight: 1.6 }}>
            Games you play directly in the browser — watch a neural net teach itself to fly, take on a search engine that never blunders, or face an AI that learns your patterns. No backend, no install: the AI runs in your tab.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <a href="#games" style={{
              padding: "12px 22px", border: "1px solid var(--violet)", borderRadius: 4,
              color: "var(--white)", textDecoration: "none", fontFamily: "var(--f-mono)",
              fontSize: 13, letterSpacing: "0.1em", background: "rgba(168,85,247,0.10)",
              boxShadow: "0 0 24px rgba(168,85,247,0.18)",
            }}>SEE THE LINEUP</a>
          </div>
        </div>
        {!mobile && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <NeuralNet layers={[2, 5, 4, 1]} width={520} height={360} mode="dark" glow={0.85} pulse />
          </div>
        )}
      </Container>
    </Section>
  );
}

// ─── Game card ────────────────────────────────────────────────
function GameCard({ title, blurb, glyph, tone = "blue", topic, href, status, tech }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  const border = tone === "violet" ? "var(--border-violet)" : "var(--border)";
  const live = status === "LIVE";
  const Wrap = href ? "a" : "div";
  const wrapProps = href ? { href } : {};
  return (
    <Wrap {...wrapProps} style={{
      position: "relative", overflow: "hidden", border: `1px solid ${border}`, borderRadius: 6,
      background: "linear-gradient(180deg, rgba(13, 24, 52, 0.55) 0%, rgba(13, 24, 52, 0.2) 100%)",
      display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit",
      cursor: href ? "pointer" : "default", opacity: live ? 1 : 0.9,
      transition: "transform .25s, border-color .25s, box-shadow .25s",
    }}
      onMouseEnter={e => { if (!href) return; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 28px ${tone === "violet" ? "rgba(192,132,252,0.18)" : "rgba(96,165,250,0.18)"}`; }}
      onMouseLeave={e => { if (!href) return; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = "none"; }}>
      <HudBrackets mode="dark" inset={8} size={18} />
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${border}`, background: "rgba(5, 8, 22, 0.5)", filter: live ? "none" : "grayscale(0.4)" }}>{glyph}</div>
      <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="t-mono-s" style={{ color: accent, fontSize: 10 }}>{topic}</span>
          <span className="t-mono-s" style={{ color: live ? accent : "var(--muted)", fontSize: 9, letterSpacing: "0.12em", display: "inline-flex", alignItems: "center", gap: 5 }}>
            {live && <span style={{ width: 5, height: 5, borderRadius: 999, background: accent, boxShadow: `0 0 6px ${accent}` }} />}
            {live ? "LIVE" : "PLANNED"}
          </span>
        </div>
        <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em", color: "var(--white)", margin: 0 }}>{title}</h3>
        <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>{blurb}</div>
        {tech && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <span style={{ color: accent, fontSize: 9 }}>◆</span>
            <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.06em" }}>{tech}</span>
          </div>
        )}
        {live && <span className="t-mono-s" style={{ color: accent, fontSize: 10, marginTop: 6 }}>PLAY →</span>}
      </div>
    </Wrap>
  );
}

function Games() {
  const reg = window.PLAY_GAMES || {};
  const list = reg.games || [];
  const cats = reg.categories || [{ name: "All", why: "", slugs: list.map(g => g.slug) }];
  const BASE = window.__DM_BASE || "../";
  const liveCount = list.filter(g => g.status === "LIVE").length;
  const mobile = useIsMobile();
  return (
    <Section id="games">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 44 }}>
          <MonoLabel color="var(--violet-lt)">// GAMES · PLAY DIRECTLY</MonoLabel>
          <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(36px, 4vw, 52px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05 }}>The lineup.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 660, fontSize: 16, marginTop: 4 }}>
            Each game runs a real AI in the browser — a genetic algorithm, a game-tree search, a sequence model. Start with the one that's live; more are on the way.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 52 }}>
          {cats.map(cat => {
            const items = cat.slugs.map(s => reg.findGame(s)).filter(Boolean);
            if (!items.length) return null;
            const cols = mobile ? 1 : 3;
            return (
              <div key={cat.name} id={"gcat-" + gameSlug(cat.name)} style={{ scrollMarginTop: 140 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: "clamp(22px, 2.4vw, 28px)", letterSpacing: "-0.015em", color: "var(--white)", margin: 0 }}>{cat.name}</h3>
                    <span style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.4 }} />
                  </div>
                  {cat.why && <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 820 }}>{cat.why}</div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
                  {items.map(g => (
                    <GameCard key={g.slug} topic={g.topic} title={g.title} blurb={g.blurb} tone={g.tone}
                      glyph={GLYPHS[g.slug] || <GlyphEvolve />} tech={g.tech}
                      href={g.status === "LIVE" ? `${BASE}play/${g.slug}/` : null} status={g.status} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

function SuggestCta() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 60, paddingBottom: 60 }}>
      <Container>
        <div style={{
          position: "relative", overflow: "hidden", padding: "44px 44px",
          border: "1px dashed var(--border-violet)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.06) 0%, rgba(59,130,246,0.06) 100%)",
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.4fr auto", gap: 32, alignItems: "center",
        }}>
          <HudBrackets mode="dark" inset={10} size={22} />
          <div>
            <MonoLabel color="var(--violet-lt)">// REQUEST.GAME</MonoLabel>
            <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: "var(--white)", margin: "10px 0 12px" }}>An AI game you'd love to play?</h3>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 580, fontSize: 15, lineHeight: 1.55 }}>
              Send me the idea — a game, an algorithm to pit you against, anything you'd want to feel beat (or out-learn) you.
            </div>
          </div>
          <button type="button" onClick={() => window.__dmCopyEmail()} title="Copy email address" style={{
            padding: "14px 26px", border: "1px solid var(--violet-lt)", borderRadius: 4,
            color: "var(--white)", textDecoration: "none", fontFamily: "var(--f-mono)", cursor: "pointer",
            fontSize: 13, letterSpacing: "0.1em", background: "rgba(168,85,247,0.14)", whiteSpace: "nowrap",
          }}>EMAIL ME AN IDEA →</button>
        </div>
      </Container>
    </Section>
  );
}

// ─── The ML behind the games ──────────────────────────────────
function MLConcepts() {
  const mobile = useIsMobile();
  const BASE = window.__DM_BASE || "../";
  const concepts = [
    { tag: "// SEARCH", name: "Minimax & alpha-beta", desc: "Look ahead through the game tree, assume the opponent plays perfectly, and pick the move with the best worst-case outcome.", games: "Tic-Tac-Toe · Connect Four" },
    { tag: "// EVOLUTION", name: "Genetic algorithms", desc: "No gradients — keep the fittest, breed and mutate them, repeat. Evolution used as an optimizer for neural-net controllers.", games: "Neuroevolution · Drivers" },
    { tag: "// SEQUENCE", name: "Markov models", desc: "Predict the next move from recent history. The same next-token idea that underlies language models, in miniature.", games: "Rock-Paper-Scissors" },
    { tag: "// CHANCE", name: "Expectimax", desc: "Minimax against randomness: average over chance outcomes instead of a worst-case adversary.", games: "2048" },
    { tag: "// REWARD", name: "Deep Q-learning", desc: "Learn the long-run value of each action from delayed reward — the basis of reinforcement-learning game agents.", games: "Snake" },
    { tag: "// INFORMATION", name: "Entropy & probability", desc: "Choose the move that eliminates the most uncertainty; reason about hidden state from the clues you can see.", games: "Wordle · Minesweeper" },
  ];
  return (
    <Section id="concepts" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          <MonoLabel color="var(--violet-lt)">// THE ML CONCEPT BEHIND THE GAMES</MonoLabel>
          <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(30px, 3.6vw, 46px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05 }}>It's all real AI underneath.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 660, fontSize: 16, marginTop: 4 }}>
            Every game here runs a genuine algorithm in your browser — not scripted "AI." Here's the technique behind each, and where to dig deeper in the <a href={`${BASE}visualize/`} style={{ color: "var(--violet-lt)", textDecoration: "none" }}>demos</a> and <a href={`${BASE}learn/key-concepts/`} style={{ color: "var(--violet-lt)", textDecoration: "none" }}>Key Concepts</a>.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
          {concepts.map(c => (
            <div key={c.name} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.4)", padding: "20px 20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
              <HudBrackets mode="dark" inset={6} size={16} />
              <span className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10 }}>{c.tag}</span>
              <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 19, color: "var(--white)" }}>{c.name}</div>
              <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, flex: 1 }}>{c.desc}</div>
              <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9, letterSpacing: "0.06em", marginTop: 4 }}>{c.games}</div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Quick jump-nav (sticky; categories + the ML concepts section) ──
const gameSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
function GamesJump() {
  const navH = useNavHeight();
  const reg = window.PLAY_GAMES || {};
  const cats = reg.categories || [];
  const items = [...cats.map(c => ({ href: "#gcat-" + gameSlug(c.name), label: c.name.toUpperCase() })), { href: "#concepts", label: "THE ML BEHIND" }];
  return (
    <div style={{ position: "sticky", top: navH, zIndex: 40, backdropFilter: "blur(12px)", background: "rgba(5,8,22,0.82)", borderTop: "1px solid rgba(96,165,250,0.12)", borderBottom: "1px solid rgba(96,165,250,0.12)" }}>
      <Container style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "11px 48px", alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginRight: 4 }}>JUMP TO</span>
        {items.map(it => (
          <a key={it.href} href={it.href} className="t-mono-s"
            style={{ padding: "5px 11px", border: "1px solid var(--border)", borderRadius: 999, color: "var(--muted)", textDecoration: "none", fontSize: 10, letterSpacing: "0.06em" }}
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
  return (<><TopNav /><PlayHero /><GamesJump /><Games /><MLConcepts /><SuggestCta /><Footer /></>);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
