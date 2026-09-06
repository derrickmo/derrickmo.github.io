// demos/ctc-alignment.jsx — CTC's collapse rule, the alignment explosion it creates, and
// the decoding shortcut everyone uses anyway.
//
// Benched headlessly first, brute-forcing all (V+1)^T paths as the control:
//   · the DP alignment count matches brute force exactly (6/6/15/70/210 on five cases)
//   · "CAT" into T frames: 1, 7, 28, 84, 210, 462 for T = 3..8, and 6,096,454 at T = 40
//   · "CATT" needs FIVE frames, not four - the repeated T must be separated by a blank
//   · the forward algorithm reproduces the brute-force sum to ~1e-15 every time
//   · greedy best-path disagrees with the true most probable labelling 4.2% of the time
//     at tau 0.15 and 86.7% at tau 2.0 (T=8) - it is a good shortcut only for a CONFIDENT
//     model, which is exactly the regime production OCR and ASR models live in.
//
// ⚠ The first sweep used r()^(1/s) as a "sharpness" knob, which INVERTS the axis: s=8 was
// the flattest setting, so disagreement appeared to rise with confidence. Redone with a
// real softmax temperature. Read the parameter, not the label you gave it.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, SegmentedControl, DemoButton } = window;

const W = 580, H = 440;
const SYM = ["-", "C", "A", "T"];          // 0 is the blank
const V = 3;
const TARGETS = { CAT: [1, 2, 3], AA: [2, 2], CATT: [1, 2, 3, 3] };

const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mkN = (r) => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// the collapse rule: squash runs of the same label, THEN drop blanks. Both halves matter -
// doing it the other way round would make "AA" unrepresentable.
const collapse = (path) => { const o = []; let p = -1; for (const c of path) { if (c !== p && c !== 0) o.push(c); p = c; } return o; };

const extend = (label) => { const e = [0]; for (const c of label) e.push(c, 0); return e; };

// forward algorithm over the extended sequence: sums every alignment in O(T * S)
function forwardCTC(probs, label) {
  const T = probs.length, ext = extend(label), S = ext.length;
  let a = new Array(S).fill(0);
  a[0] = probs[0][0]; if (S > 1) a[1] = probs[0][ext[1]];
  for (let t = 1; t < T; t++) {
    const b = new Array(S).fill(0);
    for (let s = 0; s < S; s++) {
      let acc = a[s];
      if (s - 1 >= 0) acc += a[s - 1];
      if (s - 2 >= 0 && ext[s] !== 0 && ext[s] !== ext[s - 2]) acc += a[s - 2];
      b[s] = acc * probs[t][ext[s]];
    }
    a = b;
  }
  return a[S - 1] + (S > 1 ? a[S - 2] : 0);
}

// the same recursion with the probabilities replaced by 1 - it COUNTS alignments
function countAlignments(label, T) {
  const ext = extend(label), S = ext.length;
  let a = new Array(S).fill(0); a[0] = 1; if (S > 1) a[1] = 1;
  for (let t = 1; t < T; t++) {
    const b = new Array(S).fill(0);
    for (let s = 0; s < S; s++) {
      if (!a[s]) continue;
      b[s] += a[s];
      if (s + 1 < S) b[s + 1] += a[s];
      if (s + 2 < S && ext[s + 2] !== 0 && ext[s + 2] !== ext[s]) b[s + 2] += a[s];
    }
    a = b;
  }
  return a[S - 1] + (S > 1 ? a[S - 2] : 0);
}

// brute force over every path, so the page can CHECK the forward pass instead of asserting it
function bruteTable(probs) {
  const T = probs.length, tot = new Map(), cur = new Array(T);
  const rec = (i) => {
    if (i === T) {
      const k = collapse(cur).join(",");
      let q = 1; for (let t = 0; t < T; t++) q *= probs[t][cur[t]];
      tot.set(k, (tot.get(k) || 0) + q);
      return;
    }
    for (let c = 0; c <= V; c++) { cur[i] = c; rec(i + 1); }
  };
  rec(0);
  return [...tot.entries()].sort((a, b) => b[1] - a[1]);
}

const show = (key) => (key === "" ? "(empty)" : key.split(",").map((c) => SYM[+c]).join(""));

function CTCDemo() {
  const cvRef = _useRef(null);
  const [T, setT] = _useState(6);
  const [tau, setTau] = _useState(0.6);
  const [target, setTarget] = _useState("CAT");
  const [seedTick, setSeedTick] = _useState(7);

  const label = TARGETS[target];
  const r = mulberry32(1000 + seedTick), N = mkN(r);
  const probs = Array.from({ length: T }, () => {
    const z = Array.from({ length: V + 1 }, () => N() / tau);
    const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / s);
  });

  const argmaxPath = probs.map((row) => row.indexOf(Math.max(...row)));
  const greedy = collapse(argmaxPath);
  const table = bruteTable(probs);
  const map = new Map(table);
  const best = table[0];
  const pGreedy = map.get(greedy.join(",")) || 0;
  const agrees = greedy.join(",") === best[0];

  const nAlign = countAlignments(label, T);
  const pTarget = nAlign > 0 ? forwardCTC(probs, label) : 0;
  const pTargetBrute = map.get(label.join(",")) || 0;
  const fwdErr = Math.abs(pTarget - pTargetBrute);

  let minT = 0;
  for (let t = 1; t <= 12; t++) if (countAlignments(label, t) > 0) { minT = t; break; }

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 54;

    // ── the emission matrix: rows are symbols, columns are frames ──
    const gw = W - pad - 24, cw = gw / T, ch = 26;
    ctx.font = "11px JetBrains Mono, monospace";
    for (let s = 0; s <= V; s++) {
      ctx.fillStyle = "#64748b";
      ctx.fillText(s === 0 ? "blank" : SYM[s], 14, 34 + s * ch + 17);
      for (let t = 0; t < T; t++) {
        const p = probs[t][s];
        ctx.fillStyle = `rgba(96,165,250,${0.08 + 0.88 * p})`;
        ctx.fillRect(pad + t * cw + 1, 34 + s * ch + 1, cw - 2, ch - 2);
        if (argmaxPath[t] === s) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.6; ctx.strokeRect(pad + t * cw + 1, 34 + s * ch + 1, cw - 2, ch - 2); }
        ctx.fillStyle = p > 0.45 ? "#0b1530" : "#94a3b8";
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillText(p.toFixed(2), pad + t * cw + cw / 2 - 11, 34 + s * ch + 17);
      }
    }
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("frame ->", pad, 26);
    for (let t = 0; t < T; t++) ctx.fillText(String(t + 1), pad + t * cw + cw / 2 - 3, 34 + (V + 1) * ch + 13);

    // ── the collapse, drawn as a strip ──
    const yC = 34 + (V + 1) * ch + 34;
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("argmax per frame:", 14, yC);
    ctx.font = "600 13px JetBrains Mono, monospace";
    ctx.fillText(argmaxPath.map((c) => SYM[c]).join(" "), 150, yC);
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("collapse ->", 14, yC + 20);
    ctx.font = "600 13px JetBrains Mono, monospace";
    ctx.fillStyle = agrees ? "#34d399" : "#f87171";
    ctx.fillText(greedy.map((c) => SYM[c]).join("") || "(empty)", 150, yC + 20);

    // ── the top labellings by SUMMED probability ──
    const yB = yC + 44, bh = 17, top = table.slice(0, 6);
    const mx = top[0][1] || 1;
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("most probable LABELLINGS (every alignment summed):", 14, yB);
    top.forEach(([k, v], i) => {
      const y = yB + 10 + i * bh;
      const isG = k === greedy.join(","), isT = k === label.join(",");
      const col = isG ? (agrees ? "#34d399" : "#f87171") : isT ? "#c084fc" : "#60a5fa";
      ctx.fillStyle = col + "33";
      ctx.fillRect(150, y, (v / mx) * (W - 230), bh - 3);
      ctx.fillStyle = col;
      ctx.fillText(show(k), 14, y + bh - 6);
      ctx.fillText(v.toFixed(4), W - 68, y + bh - 6);
    });
    ctx.fillStyle = "#64748b";
    ctx.fillText(table.length.toLocaleString() + " distinct labellings from " +
      Math.pow(V + 1, T).toLocaleString() + " paths", 14, H - 10);
  }, [T, tau, target, seedTick]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.3, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="FRAMES T" min={4} max={8} step={1} value={T} onChange={setT}
        help="Every path is one of 4^T. The demo brute-forces all of them so the forward algorithm can be checked rather than trusted, which is why T stops at 8." />
      <Slider label="TEMPERATURE τ" min={0.15} max={2} step={0.05} value={tau} onChange={setTau}
        help="Small tau = a confident model with a peaked distribution per frame. Large tau = an uncertain one. This is the control that decides whether greedy decoding is safe." />
      <SegmentedControl label="// TARGET LABEL" value={target} onChange={setTarget}
        options={[{ value: "CAT", label: "CAT" }, { value: "AA", label: "AA" }, { value: "CATT", label: "CATT" }]}
        help="AA and CATT contain a repeat, so they need a blank between the two identical symbols - which is why their minimum frame count is higher than their length." />
      <DemoButton onClick={() => setSeedTick((s) => s + 1)}>NEW EMISSIONS</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label={"ALIGNMENTS OF " + target} value={nAlign.toLocaleString()} accent="#c084fc" />
        <StatReadout label="MIN FRAMES NEEDED" value={String(minT)} accent="#c084fc" />
        <StatReadout label={"P(" + target + ") FORWARD"} value={pTarget.toFixed(6)} accent="#60a5fa" />
        <StatReadout label="FORWARD vs BRUTE FORCE"
          value={fwdErr < 1e-12 ? "agree to float" : "MISMATCH " + fwdErr.toExponential(1)}
          accent={fwdErr < 1e-12 ? "#34d399" : "#f87171"} />
        <StatReadout label="GREEDY LABEL" value={greedy.map((c) => SYM[c]).join("") || "(empty)"} accent={agrees ? "#34d399" : "#f87171"} />
        <StatReadout label="TRUE BEST LABEL" value={show(best[0])} accent="#34d399" />
        <StatReadout label="P(GREEDY) / P(BEST)" value={(best[1] > 0 ? pGreedy / best[1] : 1).toFixed(3)} accent={agrees ? "#34d399" : "#fbbf24"} />
        <StatReadout label="DISTINCT LABELLINGS" value={table.length.toLocaleString()} accent="#94a3b8" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        CTC exists because nobody labelled which audio frame or which pixel column produced which
        character. All you have is an image and the word in it. CTC's answer is to let the model
        emit a symbol or a <em>blank</em> at every frame, then define a collapse rule — squash runs
        of the same symbol, then drop the blanks — and score a labelling by summing over
        <strong> every path that collapses to it</strong>. The heat grid is the model's per-frame
        distribution; the yellow boxes are its argmax.
      </DemoP>
      <DemoP>
        The order of the two collapse steps is load-bearing, and the TARGET LABEL control shows why.
        Squashing repeats first means a genuine double letter needs a blank wedged between its two
        halves, so <strong>CATT needs five frames, not four</strong>, and AA needs three, not two.
        Watch the ALIGNMENTS readout: "CAT" has 1 alignment at T=3, 7 at T=4, 84 at T=6, 462 at T=8 —
        and 6,096,454 at T=40, which is why the sum is computed by a dynamic program rather than
        enumerated. That program is the forward algorithm, and the page does not ask you to take it
        on faith: it brute-forces all 4<sup>T</sup> paths in parallel and prints the difference, which
        holds at floating-point zero.
      </DemoP>
      <DemoP>
        The last two readouts are the part that matters in production. Decoding by taking the argmax
        at each frame and collapsing — greedy, or "best path" — is not the same question as finding
        the most probable <em>labelling</em>, because the labelling's probability is a sum over
        alignments and the best path may belong to a labelling that has no others. Drag TEMPERATURE.
        Measured over 120 random emission matrices at T=8: at <strong>τ = 0.15</strong> the two agree
        <strong>96%</strong> of the time, at <strong>τ = 1</strong> only <strong>28%</strong>, and at
        τ = 2 greedy is wrong <strong>87%</strong> of the time, landing on a labelling worth 0.56 of
        the best one's probability. Best-path
        decoding is a good shortcut precisely because trained models are confident — and it degrades
        exactly where a model is unsure, which is where you would most want the decode to be right.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is how OCR and speech recognition avoid per-frame annotation, and it is why a CTC model
        reports character error rate rather than a per-frame accuracy — there is no frame-level
        ground truth to score against. The same monotonic-alignment assumption is also its limit:
        CTC cannot reorder, so it does not do translation, and it assumes frame independence given
        the input, which is why a language model is usually fused in at decode time.
      </DemoP>
      <DemoP>
        The gap between the best path and the best labelling is the same gap that
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/beam-search/`}>beam search</a>{" "}
        exists to close: prefix beam search for CTC keeps a beam of <em>labellings</em> and merges
        the paths that collapse together, rather than keeping the highest-scoring paths. And the
        forward recursion here is the same object as the
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/hmm-viterbi/`}>HMM forward pass</a>:
        sum over hidden state sequences instead of maximising over them.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="CTC & the Alignment Problem"
      subtitle="Score a label by summing every frame alignment that collapses to it - and watch greedy decoding pick a different word."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/ocr/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CTCDemo />);
