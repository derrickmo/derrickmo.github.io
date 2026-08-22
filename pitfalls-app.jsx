// pitfalls-app.jsx — /pitfalls/, the failure-mode index.
//
// 2,246 documented ways to get it wrong, pulled from the pitfalls section of all 250
// lessons plus every flashcard typed "pitfall". The rest of the site answers "teach
// me X"; this answers "why is my thing broken", which is a different question asked
// at a different moment - usually by someone who already knows the topic and is
// looking at a number that is wrong.
//
// SEARCH IS THE PRIMARY INTERFACE, not a taxonomy. Module, category and source come
// straight from the store and are exact. The SYMPTOM facet is different in kind: it
// is a filter over the ~11% of entries that name a general symptom, not a
// classification of the corpus, because most failure modes here are specific to one
// method and belong to no general bucket. The page says that out loud under the
// chips - a reader who assumed the tags were exhaustive would wrongly conclude
// nothing else is in here. scripts/build-pitfalls-index.mjs has the full history,
// including the two routers that were built, measured, and thrown away.

const { useState, useEffect, useMemo, useRef } = React;
const {
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  GridOverlay, GlowBlob, HudBrackets,
} = window;

const BASE = window.__DM_BASE || "../";
const LIMIT = 200;

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

// Highlight the matched term so a reader can see WHY a row came back, which matters
// when the match is in the detail text rather than the visible heading.
function Marked({ text, matcher, q }) {
  // Uses the SAME matcher as the filter, so the highlight never lands on a different
  // substring than the one that made the row match.
  if (!matcher || !q) return text;
  const m = matcher.find(text);
  if (!m) return text;
  const i = m.index;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: "rgba(168,85,247,0.28)", color: "var(--white)", padding: "0 2px", borderRadius: 2 }}>{text.slice(i, i + m[0].length)}</mark>
      {text.slice(i + m[0].length)}
    </>
  );
}

function Row({ r, index, matcher, q, open, onToggle }) {
  const lessonTitle = index.lessonTitles[`${r.m}/${r.lesson}`] || r.lesson;
  const mod = index.modules.find((m) => m.slug === r.m);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13,24,52,0.3)" }}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        style={{ width: "100%", textAlign: "left", padding: "13px 15px", background: "transparent", border: 0, cursor: "pointer", color: "var(--white)" }}>
        <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginBottom: 5 }}>
          {mod ? `${String(mod.n).padStart(2, "0")} ${mod.title}` : r.m} · {lessonTitle}
          {r.kind === "card" ? " · CARD" : ""}
        </div>
        <div className="t-body" style={{ fontSize: 15.5, lineHeight: 1.45 }}><Marked text={r.title} matcher={matcher} q={q} /></div>
      </button>
      {open && (
        <div style={{ padding: "0 15px 15px" }}>
          {r.detail && (
            <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <Marked text={r.detail} matcher={matcher} q={q} />
            </div>
          )}
          <a href={`${BASE}learn/${r.m}/${r.lesson}/`} className="t-mono-s"
            style={{ color: "var(--blue-lt)", textDecoration: "none", display: "inline-block", marginTop: r.detail ? 12 : 4 }}>
            READ THE LESSON: {lessonTitle} →
          </a>
        </div>
      )}
    </div>
  );
}

function App() {
  const mobile = useIsMobile();
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState("");
  const [q, setQ] = useState("");
  const [cats, setCats] = useState([]);
  const [mods, setMods] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [syms, setSyms] = useState([]);
  const [open, setOpen] = useState({});
  const timer = useRef(null);

  useEffect(() => {
    fetch(`${BASE}pitfalls-index.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setIndex)
      .catch(() => setError("Could not load the index. Try a reload."));
  }, []);

  // Debounced: typing re-filters 2,246 rows, and doing that on every keystroke makes
  // the field feel sticky on a slow machine.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQ(raw.trim()), 160);
    return () => clearTimeout(timer.current);
  }, [raw]);

  const modsInCats = useMemo(() => {
    if (!index) return [];
    return cats.length ? index.modules.filter((m) => cats.includes(m.category)) : index.modules;
  }, [index, cats]);

  // A short query is matched on a WORD BOUNDARY, a longer one as a substring.
  // Plain substring search looks fine until you try the query this page exists for:
  // "nan" returned 51 rows led by "Ignoring index mainte(nan)ce". Short technical
  // terms - nan, inf, iid, oom, fp16 - are exactly the ones that hide inside longer
  // words, and they are also exactly what someone staring at a broken run types.
  // Above four characters the reverse is true: partial matching is what makes
  // "calibrat" find "calibration" and "calibrated", so substring wins there.
  // A multi-word query ANDs its terms rather than matching the phrase. "out of
  // memory" as a phrase found exactly ONE row, because the corpus mostly writes
  // "OOM" or "memory blows up" - the words are all there, just not in that order.
  const matcher = useMemo(() => {
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) return null;
    const res = terms.map((t) => {
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return (t.length <= 4 && /^[a-z0-9]+$/i.test(t))
        ? new RegExp("\\b" + esc, "i")
        : new RegExp(esc, "i");
    });
    return {
      test: (text) => res.every((re) => re.test(text)),
      // For a row, every term has to appear SOMEWHERE across title+detail, not all
      // in the same field - otherwise a query whose words straddle the split
      // silently returns nothing.
      testRow: (a, b) => res.every((re) => re.test(a) || re.test(b)),
      // Highlight the first term that is actually present in this text.
      find: (text) => { for (const re of res) { const m = re.exec(text); if (m) return m; } return null; },
    };
  }, [q]);

  const results = useMemo(() => {
    if (!index) return [];
    const catSet = cats.length ? new Set(modsInCats.map((m) => m.slug)) : null;
    return index.rows.filter((r) => {
      if (kinds.length && !kinds.includes(r.kind)) return false;
      // OR within the symptom facet: picking two symptoms widens, it does not narrow
      // to rows carrying both, which is almost never what someone debugging wants.
      if (syms.length && !syms.some((x) => (r.sy || []).includes(x))) return false;
      if (mods.length ? !mods.includes(r.m) : catSet && !catSet.has(r.m)) return false;
      if (!matcher) return true;
      return matcher.testRow(r.title, r.detail);
    });
  }, [index, matcher, cats, mods, kinds, syms, modsInCats]);

  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v));
  const shown = results.slice(0, LIMIT);

  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
        <Section id="top" padded={false} style={{ paddingTop: 132, paddingBottom: 36, position: "relative", overflow: "hidden" }}>
          <GridOverlay mode="dark" spacing={80} opacity={0.35} />
          <GlowBlob color="blue" size={470} x={"80%"} y={"-12%"} opacity={0.16} />
          <HudBrackets mode="dark" inset={28} size={28} />
          <Container>
            <MonoLabel color="var(--blue-lt)">// FAILURE MODES</MonoLabel>
            <h1 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, margin: "14px 0 0",
              fontSize: "clamp(36px, 4.5vw, 60px)", letterSpacing: "-0.025em", lineHeight: 1.0, color: "var(--white)",
            }}>Why is my thing broken?</h1>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 680, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>
              {index ? index.counts.total.toLocaleString() : "2,000+"} documented ways to get it
              wrong, collected from every lesson on the site. Search the symptom you are
              actually seeing - each one links back to the lesson that explains it.
            </div>
          </Container>
        </Section>

        <Section style={{ paddingTop: 0, paddingBottom: 76 }}>
          <Container>
            {error && <div className="t-body" style={{ color: "#f87171" }}>{error}</div>}
            {!index && !error && <div className="t-mono-s" style={{ color: "var(--muted)" }}>LOADING THE INDEX…</div>}
            {index && (
              <>
                <label htmlFor="pf-q" className="sr-only">Search failure modes</label>
                <input id="pf-q" type="search" value={raw} onChange={(e) => setRaw(e.target.value)}
                  placeholder="nan loss, out of memory, leakage, calibration, drift…"
                  className="t-body"
                  style={{
                    width: "100%", maxWidth: 680, padding: "14px 16px", fontSize: 16,
                    background: "rgba(5,8,22,0.6)", color: "var(--white)",
                    border: "1px solid var(--border)", borderRadius: 6, marginBottom: 20,
                  }} />

                {index.symptoms && index.symptoms.length > 0 && (
                  <fieldset style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
                    <legend className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 9, padding: 0 }}>
                      // SYMPTOM
                    </legend>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {index.symptoms.map((s) => (
                        <Chip key={s.id} tone="violet" on={syms.includes(s.id)} onClick={() => toggle(syms, setSyms, s.id)}
                          title={`${s.count} entries name this symptom`}>
                          {s.label} <span style={{ color: "var(--dim)" }}>{s.count}</span>
                        </Chip>
                      ))}
                    </div>
                    {/* Say the coverage out loud. These tags cover about a tenth of the
                        corpus - most failure modes here are specific to one method and
                        belong to no general symptom - and a reader who assumed the tags
                        were exhaustive would wrongly conclude nothing else exists. */}
                    <div className="t-body" style={{ color: "var(--dim)", fontSize: 13, marginTop: 9, maxWidth: 620, lineHeight: 1.55 }}>
                      Only {index.symptomTagged} of {index.counts.total} entries name a general
                      symptom like these — most are specific to one method. Search reaches all
                      of them.
                    </div>
                  </fieldset>
                )}

                <div style={{ display: "flex", gap: mobile ? 14 : 30, flexWrap: "wrap", marginBottom: 8 }}>
                  <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 9, padding: 0 }}>// AREA</legend>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {index.categories.map((c) => (
                        <Chip key={c} on={cats.includes(c)} onClick={() => { toggle(cats, setCats, c); setMods([]); }}>{c}</Chip>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 9, padding: 0 }}>// SOURCE</legend>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <Chip tone="violet" on={kinds.includes("pitfall")} onClick={() => toggle(kinds, setKinds, "pitfall")}
                        title="The pitfalls section of a lesson.">Lesson ({index.counts.pitfalls})</Chip>
                      <Chip tone="violet" on={kinds.includes("card")} onClick={() => toggle(kinds, setKinds, "card")}
                        title="Flashcards typed as a pitfall - the short form.">Flashcard ({index.counts.cards})</Chip>
                    </div>
                  </fieldset>
                </div>

                <fieldset style={{ border: 0, padding: 0, margin: "14px 0 4px" }}>
                  <legend className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 9, padding: 0 }}>// MODULE</legend>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {modsInCats.map((m) => (
                      <Chip key={m.slug} on={mods.includes(m.slug)} onClick={() => toggle(mods, setMods, m.slug)}>
                        {String(m.n).padStart(2, "0")} {m.title} <span style={{ color: "var(--dim)" }}>{m.count}</span>
                      </Chip>
                    ))}
                  </div>
                </fieldset>

                <div className="t-mono-s" role="status" aria-live="polite" style={{ color: "var(--muted)", margin: "22px 0 12px" }}>
                  {results.length.toLocaleString()} MATCHING{results.length > shown.length ? ` - SHOWING FIRST ${LIMIT}` : ""}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {shown.map((r) => (
                    <Row key={r.id} r={r} index={index} matcher={matcher} q={q} open={!!open[r.id]}
                      onToggle={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))} />
                  ))}
                </div>

                {!results.length && (
                  <div className="t-body" style={{ color: "var(--muted)", padding: "20px 0" }}>
                    Nothing matches that. Try a shorter phrase - the index is prose, so
                    "leak" finds more than "data leakage in cross validation".
                  </div>
                )}
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
