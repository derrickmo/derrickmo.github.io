// demos/bloom-filter.jsx — Bloom filter: probabilistic set membership.
//
// A Bloom filter answers "have I seen this key?" with a bit array of m bits and k
// hash functions, using a fraction of the memory a real set would. To INSERT, set
// the k bits the key hashes to. To QUERY, check those k bits: if any is 0 the key
// is DEFINITELY absent (no false negatives, ever); if all are 1 it's "probably
// present" — but those bits might have been set by OTHER keys, a false positive.
// As more keys go in, more bits flip on and the false-positive rate climbs as
// (1 − e^{−kn/m})^k. We stream insertions, light up the bit array, query a pool of
// keys we never inserted to measure the real FP rate, and compare it to the
// formula — plus show the optimal k = (m/n)·ln 2.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 460, PRIME = 2147483647, POOL = 600, ABSENT = 5000000;

function BloomDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [m, setM] = _useState(256);
  const [k, setK] = _useState(3);
  const [nTarget, setNTarget] = _useState(60);
  const [running, setRunning] = _useState(true);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function reset() {
    const r = rng(98765);
    const A = [], B = []; for (let i = 0; i < 8; i++) { A.push(1 + Math.floor(r() * (PRIME - 1))); B.push(Math.floor(r() * PRIME)); }
    sim.current = { bits: new Uint8Array(m), A, B, ni: 0, lastBits: [], fp: 0 };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [m, k, nTarget]);

  const hashes = (st, x) => { const out = []; for (let i = 0; i < k; i++) out.push(((st.A[i] * x + st.B[i]) % PRIME) % m); return out; };

  function insertNext() {
    const st = sim.current; if (!st || st.ni >= nTarget) return;
    const hs = hashes(st, st.ni); for (const h of hs) st.bits[h] = 1;
    st.lastBits = hs; st.ni++;
  }
  function fpRate(st) {
    let hit = 0; for (let j = 0; j < POOL; j++) { const hs = hashes(st, ABSENT + j); let all = true; for (const h of hs) if (!st.bits[h]) { all = false; break; } if (all) hit++; }
    return hit / POOL;
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 60) { last = now; const st = sim.current; if (st) { if (st.ni < nTarget) insertNext(); st.fp = fpRate(st); } }
      draw(); setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, m, k, nTarget]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    let setCount = 0; for (let i = 0; i < m; i++) if (st.bits[i]) setCount++;

    // ---- bit array grid ----
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText(`BIT ARRAY  ${m} bits  ·  ${setCount} set (${Math.round(100 * setCount / m)}% full)`, 16, 20);
    const cols = 32, rows = Math.ceil(m / cols);
    const gx = 18, gy = 32, cell = Math.min(15, (W - 36) / cols), cs = cell - 2;
    const lastSet = new Set(st.lastBits);
    for (let i = 0; i < m; i++) {
      const cx2 = gx + (i % cols) * cell, cy2 = gy + Math.floor(i / cols) * cell;
      if (lastSet.has(i)) ctx.fillStyle = "#fbbf24";
      else ctx.fillStyle = st.bits[i] ? "rgba(168,85,247,0.85)" : "rgba(148,163,184,0.13)";
      ctx.fillRect(cx2, cy2, cs, cs);
    }
    const gridBot = gy + rows * cell + 6;
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("amber = bits just set by inserting key #" + (st.ni - 1 >= 0 ? st.ni - 1 : 0), gx, gridBot);

    // ---- false-positive comparison ----
    const py = gridBot + 24;
    const theo = Math.pow(1 - Math.exp(-k * st.ni / m), k);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("FALSE-POSITIVE RATE  (queries on " + POOL + " keys never inserted)", 16, py);
    const bx = 16, bw = W - 200, by = py + 16, bmax = Math.max(0.02, theo, st.fp) * 1.25;
    ctx.fillStyle = "rgba(148,163,184,0.12)"; ctx.fillRect(bx, by, bw, 16); ctx.fillRect(bx, by + 22, bw, 16);
    ctx.fillStyle = "#a855f7"; ctx.fillRect(bx, by, (st.fp / bmax) * bw, 16);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "10px JetBrains Mono"; ctx.fillText("measured  " + (st.fp * 100).toFixed(1) + "%", bx + bw + 8, by + 13);
    ctx.fillStyle = "#34d399"; ctx.fillRect(bx, by + 22, (theo / bmax) * bw, 16);
    ctx.fillStyle = "#e2e8f0"; ctx.fillText("formula  " + (theo * 100).toFixed(1) + "%", bx + bw + 8, by + 35);

    // ---- FP-vs-load curve ----
    const cx0 = 16, cy0 = by + 58, cw = W - 32, chh = H - cy0 - 22;
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText("FP rate vs keys inserted  (theoretical curve, you are the dot)", cx0, cy0 - 6);
    ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.strokeRect(cx0, cy0, cw, chh);
    const nMaxAxis = Math.max(nTarget, 1);
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const nn = (i / 80) * nMaxAxis; const fpc = Math.pow(1 - Math.exp(-k * nn / m), k); const x = cx0 + (i / 80) * cw, y = cy0 + chh - fpc * chh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    const dx = cx0 + (st.ni / nMaxAxis) * cw, dy = cy0 + chh - theo * chh;
    ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.arc(dx, dy, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("0", cx0, cy0 + chh + 12); ctx.fillText(nTarget + " keys", cx0 + cw - 44, cy0 + chh + 12);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const kOpt = st && st.ni > 0 ? Math.max(1, Math.round((m / st.ni) * Math.LN2)) : 1;
  const bitsPer = st && st.ni > 0 ? (m / st.ni).toFixed(1) : "—";
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// BITS  m" min={64} max={512} step={32} value={m} onChange={setM} tone="violet"
        help="Size of the bit array. More bits = lower false-positive rate for the same number of keys, at the cost of memory. The whole point of a Bloom filter is using far fewer bits than storing the keys themselves." />
      <Slider label="// HASH FUNCTIONS  k" min={1} max={8} step={1} value={k} onChange={setK}
        help={`Bits set per key. Too few and absent keys easily slip through; too many and the array fills up fast. The sweet spot is k = (m/n)*ln2 ≈ ${kOpt} here — fewer or more both raise the false-positive rate.`} />
      <Slider label="// KEYS INSERTED  n" min={10} max={200} step={10} value={nTarget} onChange={setNTarget}
        help="How many keys to insert. Watch the bit array fill and the false-positive rate climb as the load n/m grows — a Bloom filter degrades gracefully but predictably as it gets crowded." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => reset()}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="FALSE-POS RATE" value={st ? (st.fp * 100).toFixed(1) + "%" : "—"} accent={st && st.fp < 0.05 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="FALSE-NEG RATE" value="0%" accent="#34d399" />
        <StatReadout label="BITS / KEY" value={bitsPer} accent="#a855f7" />
        <StatReadout label="OPTIMAL k" value={kOpt} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "set bit" },
        { color: "#fbbf24", label: "just-set bits" },
        { color: "#34d399", label: "formula / curve" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Each key you insert flips on k bits (the amber ones for the latest key). To
        ask "is key X in the set?", you check its k bits: if even one is still 0, X was
        never inserted — guaranteed, because inserting always SETS bits, never clears
        them. That's the Bloom filter's superpower: zero false negatives. The catch is
        the other direction. If all k of X's bits happen to be 1, you answer "probably
        yes" — but those bits could have been set by completely different keys. That's a
        false positive, and the measured bar counts exactly how often it happens for
        keys we never inserted.
      </DemoP>
      <DemoP>
        The measured rate (violet) tracks the formula (1 − e^(−kn/m))^k (green)
        almost exactly, and the curve shows it climbing as the array fills — push KEYS
        INSERTED up and the dot rides the curve toward 100%. The trade-offs are all
        here: more BITS lowers the rate, and for a given load there's an OPTIMAL k =
        (m/n)·ln 2; below or above it the rate worsens (too few bits per key leak, too
        many saturate the array). A Bloom filter answers membership in O(k) time with a
        handful of bits per key and no false negatives — which is why it guards caches,
        databases, and crawlers from doing expensive lookups for things that aren't
        there.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The Bloom filter is the classic space-efficient set-membership structure: a few
        bits per key, O(k) insert/query, no false negatives, tunable false positives.
        It's everywhere as a cheap "definitely-not-here" gatekeeper — databases (Cassandra,
        BigTable, RocksDB) skip disk reads for absent keys, CDNs and browsers screen
        URLs, crawlers dedupe seen pages, and it cuts network round-trips in distributed
        systems. It rounds out the streaming/sketch toolbox alongside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/count-min-sketch/`} style={{ color: "#a855f7" }}>Count-Min sketches</a>{" "}
        (frequencies) and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/reservoir-sampling/`} style={{ color: "#a855f7" }}>reservoir sampling</a>{" "}
        (uniform samples) — all trading exactness for tiny, fixed memory.
      </DemoP>
      <DemoP>
        Caveats: a standard Bloom filter can't delete (clearing a bit could break other
        keys — counting Bloom filters fix this) and can't be resized or enumerate its
        contents. You must size m and k for the EXPECTED load; oversaturate it and the
        false-positive rate explodes. Variants address the gaps: counting Bloom (deletes),
        scalable Bloom (growth), and cuckoo filters (deletes + often better space at low
        FP rates). Like all hashed structures, the analysis assumes good, independent
        hash functions. Use it only where a rare false "yes" is cheap and a false "no"
        would be unacceptable.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Bloom Filter"
      subtitle="Answer set membership with a tiny bit array and k hashes: never a false negative, only tunable false positives. Watch the array fill, the false-positive rate climb as (1-e^{-kn/m})^k, and find the optimal number of hash functions."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BloomDemo />);
