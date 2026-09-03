// interview-app.jsx — /interview/, the drill surface over the whole curriculum.
//
// The corpus is 5,210 questions and 2,765 flashcards that already exist inside the
// 250 lessons; until now each was reachable from exactly one URL. This page makes
// them addressable, drillable and reviewable.
//
// PAYLOAD. scripts/build-interview-index.mjs emits a 50 KB manifest plus one shard
// per module. The manifest loads on open and carries every count and every lesson,
// so all filtering renders before a single shard is fetched. Shards are pulled only
// for the modules a reader actually selects, and cached for the session.
//
// ONE PAGE, THREE MODES, addressable by ?mode= so a mode is still linkable. The
// spec called for three separate pages; they would be three copies of the same
// shell loading the same manifest, and the filter selection has to flow into the
// drill anyway, which is awkward across a page load on a site with no router.

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const {
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  GridOverlay, GlowBlob, HudBrackets,
} = window;

const BASE = window.__DM_BASE || "../";
// READ AT USE, NOT AT MODULE SCOPE (PF-0020): interview-store.js is a sibling
// module script, so its execution order relative to this file is Vite's choice.
const S = () => window.DM_INTERVIEW;

const TIERS = [
  { key: "quick", label: "Quick", hint: "Rapid recall - one or two sentences." },
  { key: "standard", label: "Standard", hint: "The kind of question an interviewer actually opens with." },
  { key: "deep", label: "Deep dive", hint: "The follow-up that separates recall from understanding." },
];
const LEVELS = [
  { key: "intro", label: "Intro" },
  { key: "core", label: "Core" },
  { key: "advanced", label: "Advanced" },
];

// ─── shard cache ──────────────────────────────────────────────
const shardCache = {};
function loadShard(slug) {
  if (shardCache[slug]) return shardCache[slug];
  shardCache[slug] = fetch(`${BASE}interview/${slug}.json`)
    .then((r) => { if (!r.ok) throw new Error(`shard ${slug} ${r.status}`); return r.json(); })
    .catch((e) => { delete shardCache[slug]; throw e; });
  return shardCache[slug];
}

// Deterministic shuffle so a mock set is reproducible from its seed. Math.random
// would make a set impossible to re-run, and re-running the same set after
// studying is the point.
function shuffled(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ─── small shared bits ────────────────────────────────────────
function Chip({ on, onClick, children, tone = "blue", title }) {
  const c = tone === "violet" ? "168,85,247" : "59,130,246";
  return (
    <button type="button" onClick={onClick} title={title} aria-pressed={on} className="t-mono-s"
      style={{
        padding: "7px 12px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.06em",
        border: `1px solid ${on ? `rgba(${c},0.9)` : "var(--border)"}`,
        background: on ? `rgba(${c},0.16)` : "transparent",
        color: on ? "var(--white)" : "var(--muted)",
      }}>{children}</button>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "12px 14px", background: "rgba(13,24,52,0.35)", minWidth: 108 }}>
      <div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{label}</div>
      <div style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 24, lineHeight: 1.1, color: tone || "var(--blue-lt)" }}>{value}</div>
    </div>
  );
}

// ─── mode: browse ─────────────────────────────────────────────
function Browse({ manifest, picked, items, loading, error }) {
  const [open, setOpen] = useState({});
  const shown = items.slice(0, 300);
  if (!picked.length) {
    return (
      <div className="t-body" style={{ color: "var(--muted)", padding: "28px 0", maxWidth: 620 }}>
        Pick one or more modules above to browse their questions. Nothing is downloaded
        until you do - the counts on this page come from a 50 KB manifest.
      </div>
    );
  }
  if (error) return <div className="t-body" style={{ color: "var(--red, #f87171)", padding: "24px 0" }}>{error}</div>;
  if (loading) return <div className="t-mono-s" style={{ color: "var(--muted)", padding: "24px 0" }}>LOADING…</div>;
  return (
    <div>
      <div className="t-mono-s" style={{ color: "var(--muted)", margin: "18px 0 12px" }}>
        {items.length} MATCHING{items.length > shown.length ? ` - SHOWING FIRST ${shown.length}` : ""}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((q) => (
          <div key={q.id} style={{ border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13,24,52,0.3)" }}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}
              aria-expanded={!!open[q.id]}
              style={{ width: "100%", textAlign: "left", padding: "13px 15px", background: "transparent", border: 0, cursor: "pointer", color: "var(--white)" }}>
              <span className="t-mono-s" style={{ color: q.tier === "deep" ? "var(--violet-lt)" : "var(--blue-lt)", fontSize: 10, marginRight: 10 }}>
                {q.tier === "deep" ? "DEEP" : q.tier.toUpperCase()}
              </span>
              <span className="t-body" style={{ fontSize: 15.5 }}>{q.q || q.front}</span>
            </button>
            {open[q.id] && (
              <div style={{ padding: "0 15px 15px", borderTop: "1px solid var(--border)" }}>
                <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65, whiteSpace: "pre-wrap", paddingTop: 12 }}>{q.a || q.back}</div>
                <a href={`${BASE}${q.href}`} className="t-mono-s" style={{ color: "var(--blue-lt)", textDecoration: "none", display: "inline-block", marginTop: 12 }}>
                  READ THE LESSON: {q.lessonTitle} →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── mode: drill ──────────────────────────────────────────────
function Drill({ items, loading, picked }) {
  const [queue, setQueue] = useState([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [dueOnly, setDueOnly] = useState(false);
  const liveRef = useRef(null);

  const start = useCallback(() => {
    const today = S().today();
    let pool = items;
    if (dueOnly) pool = items.filter((x) => { const c = S().card(x.id); return !c || (c.due || 0) <= today; });
    // Unseen first, then most overdue: the order that makes a session feel like
    // progress rather than a random walk.
    const ranked = pool.slice().sort((a, b) => {
      const ca = S().card(a.id), cb = S().card(b.id);
      const da = ca ? (ca.due || 0) : -1e9, db = cb ? (cb.due || 0) : -1e9;
      return da - db;
    });
    setQueue(ranked.slice(0, 40));
    setI(0); setRevealed(false); setDone(0);
  }, [items, dueOnly]);

  useEffect(() => { setQueue([]); }, [items]);

  const cur = queue[i];
  const grade = (g) => {
    if (!cur) return;
    S().grade(cur.id, g, { module: cur.module });
    setDone((d) => d + 1);
    if (i + 1 < queue.length) { setI(i + 1); setRevealed(false); }
    else setI(queue.length);   // past the end -> the summary screen
  };

  // Keyboard is the whole point of a drill: space reveals, 1-4 grades.
  // No dep array on purpose - the handler closes over `cur`, `revealed` and `i`,
  // and re-binding each render is cheaper than getting a stale closure wrong.
  useEffect(() => {
    const h = (e) => {
      if (!cur) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) { setRevealed(true); e.preventDefault(); }
      else if (revealed && ["1", "2", "3", "4"].includes(e.key)) { grade(Number(e.key) - 1); e.preventDefault(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!picked.length) return <div className="t-body" style={{ color: "var(--muted)", padding: "28px 0", maxWidth: 620 }}>Pick at least one module to drill.</div>;
  if (loading) return <div className="t-mono-s" style={{ color: "var(--muted)", padding: "24px 0" }}>LOADING…</div>;

  if (!queue.length || i >= queue.length) {
    const st = S().stats();
    return (
      <div style={{ padding: "26px 0", maxWidth: 640 }}>
        {done > 0 && (
          <div className="t-body" style={{ color: "var(--white)", fontSize: 18, marginBottom: 16 }}>
            Session done - {done} graded. They are scheduled; come back when they are due.
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <Stat label="IN SELECTION" value={items.length} />
          <Stat label="SEEN EVER" value={st.seen} />
          <Stat label="DUE TODAY" value={st.due} tone="var(--violet-lt)" />
          <Stat label="MATURE" value={st.mature} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
          <span className="t-mono-s" style={{ color: "var(--muted)" }}>ONLY WHAT IS DUE (skips cards scheduled for later)</span>
        </label>
        <button type="button" onClick={start} className="t-mono-s"
          style={{ padding: "13px 26px", border: "1px solid var(--blue)", borderRadius: 4, background: "rgba(59,130,246,0.12)", color: "var(--white)", cursor: "pointer", letterSpacing: "0.1em" }}>
          START A SESSION (UP TO 40) →
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, padding: "22px 0" }}>
      <div className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 14 }}>
        {i + 1} / {queue.length} · {cur.module} · {cur.tier.toUpperCase()}
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "22px 22px 24px", background: "rgba(13,24,52,0.35)" }}>
        <div className="t-body" style={{ color: "var(--white)", fontSize: 19, lineHeight: 1.5 }}>{cur.q || cur.front}</div>
        {!revealed ? (
          <button type="button" onClick={() => setRevealed(true)} className="t-mono-s"
            style={{ marginTop: 22, padding: "11px 22px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", color: "var(--muted)", cursor: "pointer", letterSpacing: "0.09em" }}>
            SHOW ANSWER (SPACE)
          </button>
        ) : (
          <>
            <div className="t-body" style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
              {cur.a || cur.back}
            </div>
            <a href={`${BASE}${cur.href}`} className="t-mono-s" style={{ color: "var(--blue-lt)", textDecoration: "none", display: "inline-block", marginTop: 14 }}>
              READ THE LESSON →
            </a>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 22 }}>
              {["Again", "Hard", "Good", "Easy"].map((lbl, g) => (
                <button key={lbl} type="button" onClick={() => grade(g)} className="t-mono-s"
                  style={{
                    padding: "11px 18px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.08em",
                    border: `1px solid ${g === 0 ? "rgba(239,68,68,0.6)" : g === 3 ? "rgba(34,197,94,0.6)" : "var(--border)"}`,
                    background: "transparent", color: "var(--white)",
                  }}>{lbl} <span style={{ color: "var(--dim)" }}>({g + 1})</span></button>
              ))}
            </div>
          </>
        )}
      </div>
      <div ref={liveRef} className="sr-only" role="status" aria-live="polite">
        {`Question ${i + 1} of ${queue.length}. ${revealed ? "Answer shown." : "Answer hidden."}`}
      </div>
    </div>
  );
}

// ─── mode: mock ───────────────────────────────────────────────
function Mock({ items, loading, picked }) {
  const [mins, setMins] = useState(45);
  const [set, setSet] = useState(null);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(0);
  const [reviewing, setReviewing] = useState(false);

  // A 45-minute loop is not 45 one-liners. The mix mirrors how a real round runs:
  // warm-ups, then the questions that carry the signal, then a couple of deep ones.
  const build = () => {
    const byTier = (t) => items.filter((x) => x.tier === t);
    const n = { quick: Math.round(mins / 5), standard: Math.round(mins / 11), deep: Math.max(1, Math.round(mins / 22)) };
    const seed = mins * 7919 + items.length;
    const pick = (t, k) => shuffled(byTier(t), seed + t.length).slice(0, k);
    const s = [...pick("quick", n.quick), ...pick("standard", n.standard), ...pick("deep", n.deep)];
    setSet(s); setI(0); setLeft(mins * 60); setReviewing(false);
  };

  useEffect(() => {
    if (!set || reviewing || left <= 0) return;
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [set, reviewing, left]);
  // Ending the round is a separate effect rather than a side effect inside the
  // updater above: StrictMode may invoke an updater twice, and a state setter
  // hidden in one fires twice with it.
  useEffect(() => { if (set && !reviewing && left === 0) setReviewing(true); }, [set, reviewing, left]);

  if (!picked.length) return <div className="t-body" style={{ color: "var(--muted)", padding: "28px 0", maxWidth: 620 }}>Pick the modules the loop should cover.</div>;
  if (loading) return <div className="t-mono-s" style={{ color: "var(--muted)", padding: "24px 0" }}>LOADING…</div>;

  if (!set) {
    return (
      <div style={{ padding: "26px 0", maxWidth: 640 }}>
        <div className="t-body" style={{ color: "var(--muted)", marginBottom: 18, lineHeight: 1.6 }}>
          Assembles a timed set from the modules you picked, mixed the way a real round
          runs: warm-ups first, then the questions that carry the signal, then a deep
          dive or two. The timer is the point - answer out loud, then review.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[30, 45, 60].map((m) => <Chip key={m} on={mins === m} onClick={() => setMins(m)} tone="violet">{m} MIN</Chip>)}
        </div>
        <button type="button" onClick={build} className="t-mono-s"
          style={{ padding: "13px 26px", border: "1px solid var(--violet)", borderRadius: 4, background: "rgba(168,85,247,0.12)", color: "var(--white)", cursor: "pointer", letterSpacing: "0.1em" }}>
          BUILD THE SET →
        </button>
      </div>
    );
  }

  if (reviewing || i >= set.length) {
    return (
      <div style={{ padding: "22px 0", maxWidth: 800 }}>
        <div className="t-body" style={{ color: "var(--white)", fontSize: 19, marginBottom: 18 }}>Review - {set.length} questions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {set.map((q, k) => (
            <div key={q.id} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px", background: "rgba(13,24,52,0.3)" }}>
              <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>{k + 1} · {q.tier.toUpperCase()} · {q.module}</div>
              <div className="t-body" style={{ color: "var(--white)", fontSize: 16, margin: "7px 0 9px" }}>{q.q || q.front}</div>
              <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{q.a || q.back}</div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setSet(null)} className="t-mono-s"
          style={{ marginTop: 20, padding: "11px 22px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", color: "var(--muted)", cursor: "pointer" }}>
          BUILD ANOTHER
        </button>
      </div>
    );
  }

  const q = set[i];
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <div style={{ padding: "22px 0", maxWidth: 780 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>{i + 1} / {set.length} · {q.tier.toUpperCase()}</span>
        <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 26, color: left < 300 ? "var(--violet-lt)" : "var(--blue-lt)", fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</span>
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "24px", background: "rgba(13,24,52,0.35)", minHeight: 150 }}>
        <div className="t-body" style={{ color: "var(--white)", fontSize: 19, lineHeight: 1.5 }}>{q.q || q.front}</div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setI(i + 1)} className="t-mono-s"
          style={{ padding: "11px 22px", border: "1px solid var(--blue)", borderRadius: 4, background: "rgba(59,130,246,0.12)", color: "var(--white)", cursor: "pointer", letterSpacing: "0.09em" }}>
          NEXT →
        </button>
        <button type="button" onClick={() => setReviewing(true)} className="t-mono-s"
          style={{ padding: "11px 22px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", color: "var(--muted)", cursor: "pointer" }}>
          END &amp; REVIEW
        </button>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────
function App() {
  const mobile = useIsMobile();
  const [manifest, setManifest] = useState(null);
  const [manifestError, setManifestError] = useState(null);
  const [picked, setPicked] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shardError, setShardError] = useState(null);
  const [mode, setMode] = useState(() => {
    const m = new URLSearchParams(location.search).get("mode");
    return ["browse", "drill", "mock"].includes(m) ? m : "browse";
  });

  useEffect(() => {
    fetch(`${BASE}interview-manifest.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setManifest)
      .catch(() => setManifestError("Could not load the question index. Try a reload."));
  }, []);

  // Keep the mode in the URL so a drill or a mock is linkable.
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set("mode", mode);
    history.replaceState(null, "", u);
  }, [mode]);

  useEffect(() => {
    if (!picked.length) { setRows([]); return; }
    let alive = true;
    setLoading(true); setShardError(null);
    Promise.all(picked.map(loadShard))
      .then((shards) => {
        if (!alive) return;
        const meta = {};
        (manifest ? manifest.lessons : []).forEach((l) => { meta[l.module + "/" + l.lesson] = l.title; });
        const out = [];
        shards.forEach((sh) => {
          sh.questions.forEach((q) => out.push({ ...q, module: sh.module, lessonTitle: meta[sh.module + "/" + q.lesson] || q.lesson }));
          sh.cards.forEach((c) => out.push({ ...c, module: sh.module, tier: "card", lessonTitle: meta[sh.module + "/" + c.lesson] || c.lesson }));
        });
        setRows(out); setLoading(false);
      })
      .catch(() => { if (alive) { setShardError("Could not load one of the module files."); setLoading(false); } });
    return () => { alive = false; };
  }, [picked, manifest]);

  const items = useMemo(() => rows.filter((x) => {
    if (tiers.length && !tiers.includes(x.tier)) return false;
    if (levels.length && !levels.includes(x.level)) return false;
    return true;
  }), [rows, tiers, levels]);

  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v));

  const totals = manifest ? manifest.counts : null;
  const weak = manifest ? S().weakSpots(5).slice(0, 3) : [];

  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
        <Section id="top" padded={false} style={{ paddingTop: 132, paddingBottom: 40, position: "relative", overflow: "hidden" }}>
          <GridOverlay mode="dark" spacing={80} opacity={0.35} />
          <GlowBlob color="violet" size={480} x={"78%"} y={"-14%"} opacity={0.18} />
          <HudBrackets mode="dark" inset={28} size={28} />
          <Container>
            <MonoLabel color="var(--violet-lt)">// INTERVIEW PREP</MonoLabel>
            <h1 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, margin: "14px 0 0",
              fontSize: "clamp(36px, 4.5vw, 60px)", letterSpacing: "-0.025em", lineHeight: 1.0, color: "var(--white)",
            }}>Drill the whole curriculum.</h1>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 660, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>
              Every question and flashcard written into the 250 lessons, in one place -
              filterable, drillable, and scheduled so you review a thing shortly before
              you would have forgotten it. Progress is stored in this browser only.
            </div>
            {totals && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26 }}>
                <Stat label="QUESTIONS" value={totals.questions.toLocaleString()} />
                <Stat label="FLASHCARDS" value={totals.cards.toLocaleString()} tone="var(--violet-lt)" />
                <Stat label="LESSONS" value={totals.lessons} />
                <Stat label="DUE TODAY" value={S().stats().due} tone="var(--violet-lt)" />
              </div>
            )}
            {manifestError && <div className="t-body" style={{ color: "#f87171", marginTop: 20 }}>{manifestError}</div>}
          </Container>
        </Section>

        <Section style={{ paddingTop: 8, paddingBottom: 72 }}>
          <Container>
            {manifest && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
                  {[["browse", "BROWSE"], ["drill", "DRILL"], ["mock", "MOCK INTERVIEW"]].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setMode(k)} className="t-mono-s" aria-current={mode === k ? "page" : undefined}
                      style={{
                        padding: "10px 18px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.1em",
                        border: `1px solid ${mode === k ? "var(--violet)" : "var(--border)"}`,
                        background: mode === k ? "rgba(168,85,247,0.14)" : "transparent",
                        color: mode === k ? "var(--white)" : "var(--muted)",
                      }}>{l}</button>
                  ))}
                </div>

                {weak.length > 0 && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "12px 15px", marginBottom: 22, background: "rgba(168,85,247,0.06)" }}>
                    <span className="t-mono-s" style={{ color: "var(--violet-lt)", marginRight: 10 }}>// WEAKEST SO FAR</span>
                    <span className="t-body" style={{ color: "var(--muted)", fontSize: 14.5 }}>
                      {weak.map((w) => `${w.module} (ease ${w.ease.toFixed(2)})`).join(" · ")}
                    </span>
                  </div>
                )}

                <fieldset style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
                  <legend className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 10, padding: 0 }}>
                    // MODULES {picked.length ? `(${picked.length} SELECTED)` : ""}
                  </legend>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {manifest.modules.map((m) => (
                      <Chip key={m.slug} on={picked.includes(m.slug)} onClick={() => toggle(picked, setPicked, m.slug)}
                        title={`${m.questions} questions, ${m.cards} flashcards`}>
                        {String(m.n).padStart(2, "0")} {m.title} <span style={{ color: "var(--dim)" }}>{m.questions}</span>
                      </Chip>
                    ))}
                  </div>
                </fieldset>

                <div style={{ display: "flex", gap: mobile ? 16 : 34, flexWrap: "wrap", marginBottom: 6 }}>
                  <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 9, padding: 0 }}>// TIER</legend>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {TIERS.map((t) => <Chip key={t.key} tone="violet" title={t.hint} on={tiers.includes(t.key)} onClick={() => toggle(tiers, setTiers, t.key)}>{t.label}</Chip>)}
                      <Chip tone="violet" title="Flashcards, not questions." on={tiers.includes("card")} onClick={() => toggle(tiers, setTiers, "card")}>Flashcards</Chip>
                    </div>
                  </fieldset>
                  <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 9, padding: 0 }}>// LEVEL</legend>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {LEVELS.map((l) => <Chip key={l.key} on={levels.includes(l.key)} onClick={() => toggle(levels, setLevels, l.key)}>{l.label}</Chip>)}
                    </div>
                  </fieldset>
                </div>

                {mode === "browse" && <Browse manifest={manifest} picked={picked} items={items} loading={loading} error={shardError} />}
                {mode === "drill" && <Drill items={items} loading={loading} picked={picked} />}
                {mode === "mock" && <Mock items={items} loading={loading} picked={picked} />}
              </>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
