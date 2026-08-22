// demos/speculative-decoding.jsx — speculative decoding (draft + verify).
//
// A small fast DRAFT model proposes k tokens; the big TARGET model verifies all k
// in one parallel forward pass. The longest prefix the target agrees with is
// accepted; the first disagreement is replaced by a token resampled from the
// target (and if all k are accepted, a free bonus token comes along). So each
// target pass emits accepted+1 tokens instead of 1 — a lossless speedup whose
// size depends on how often the draft agrees (its quality) and the lookahead k.
// Honest simulation: per-token acceptance ~ Bernoulli(agreement), prefix-stopping.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;

function SpeculativeDecodingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);
  const [agree, setAgree] = _useState(0.7);
  const [k, setK] = _useState(4);
  const [speed, setSpeed] = _useState(6);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);
  const st = _useRef(null);

  const fresh = () => ({ toks: [], rounds: 0, accepted: 0, proposed: 0, passes: 0, hist: [], lastRoundStart: 0 });
  if (!st.current) st.current = fresh();
  function reset() { st.current = fresh(); force(x => x + 1); }

  function round() {
    const s = st.current;
    let acc = 0; for (let i = 0; i < k; i++) { if (Math.random() < agree) acc++; else break; }
    s.lastRoundStart = s.toks.length;
    for (let i = 0; i < acc; i++) s.toks.push("accept");
    s.toks.push("target");                 // resample-on-reject, or free bonus if all accepted
    s.rounds += 1; s.accepted += acc; s.proposed += k; s.passes += 1;
    s.hist.push(acc + 1); if (s.hist.length > 120) s.hist.shift();
    if (s.toks.length > 400) s.toks.splice(0, s.toks.length - 400);
  }

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => { if (now - lastRef.current >= 1000 / speed) { lastRef.current = now; round(); force(x => x + 1); } rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, agree, k]);

  const s = st.current;
  const tokensPerPass = s.passes ? s.toks.length >= 400 ? (s.accepted / s.rounds + 1) : (s.toks.length / s.passes) : 0;
  const accRate = s.proposed ? s.accepted / s.proposed : 0;
  // theoretical expected tokens/pass for geometric acceptance: (1 - p^(k+1))/(1 - p)
  const theo = agree === 1 ? k + 1 : (1 - Math.pow(agree, k + 1)) / (1 - agree);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("GENERATED TOKENS  ·  green = draft accepted · violet = target token (per pass)", 20, 22);

    // token grid (most recent ~210)
    const show = s.toks.slice(-210);
    const cols = 30, cs = 15, gap = 2, ox = 20, oy = 36;
    show.forEach((t, i) => {
      const x = ox + (i % cols) * (cs + gap), y = oy + Math.floor(i / cols) * (cs + gap);
      ctx.fillStyle = t === "accept" ? "#34d399" : "#a855f7";
      ctx.fillRect(x, y, cs, cs);
    });

    // tokens-per-pass sparkline
    const spY = oy + 7 * (cs + gap) + 30, spH = 90, spX = 20, spW = W - 40;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("TOKENS PER TARGET PASS  ·  this is the speedup over 1-at-a-time", spX, spY - 6);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(spX, spY, spW, spH);
    const maxY = k + 1;
    const yOf = (v) => spY + spH - (v / maxY) * (spH - 8) - 4;
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(spX, yOf(1)); ctx.lineTo(spX + spW, yOf(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = "9px JetBrains Mono"; ctx.fillText("1× (no speculation)", spX + 4, yOf(1) - 3);
    if (s.hist.length > 1) {
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.6; ctx.beginPath();
      s.hist.forEach((v, i) => { const x = spX + (i / Math.max(1, s.hist.length - 1)) * spW, y = yOf(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
    }
    // theoretical line
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(spX, yOf(theo)); ctx.lineTo(spX + spW, yOf(theo)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(52,211,153,0.8)"; ctx.fillText("expected " + theo.toFixed(2) + "×", spX + spW - 92, yOf(theo) - 3);

    // big readout
    const by = spY + spH + 44;
    ctx.fillStyle = "#60a5fa"; ctx.font = "600 30px Space Grotesk, JetBrains Mono";
    ctx.fillText((s.passes ? tokensPerPass.toFixed(2) : theo.toFixed(2)) + "×", spX, by);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("tokens / target pass (speedup)", spX + 110, by - 4);
    ctx.fillText("draft acceptance: " + (accRate * 100).toFixed(0) + "%   ·   tokens: " + s.toks.length + "   ·   target passes: " + s.passes, spX + 110, by + 14);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// DRAFT AGREEMENT" min={0.3} max={0.95} step={0.05} value={agree} onChange={setAgree} tone="violet"
        help="How often the small draft model's token matches what the target would have chosen. A better-aligned draft is accepted more often, so each target pass emits more tokens — the single biggest lever on the speedup." />
      <Slider label="// LOOKAHEAD (k)" min={1} max={8} step={1} value={k} onChange={setK}
        help="How many tokens the draft proposes per round. Bigger k means more potential tokens per target pass, but acceptance is a prefix — one early miss wastes the rest — so returns diminish, and the sweet spot depends on draft agreement." />
      <Slider label="// SPEED (rounds/sec)" min={1} max={20} step={1} value={speed} onChange={setSpeed}
        help="Speculative rounds per second. Let it run to converge the measured tokens-per-pass toward the theoretical curve." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "GENERATE"}</DemoButton>
      <DemoButton onClick={() => { round(); force(x => x + 1); }}>STEP</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="SPEEDUP" value={(s.passes ? tokensPerPass : theo).toFixed(2) + "×"} accent="#60a5fa" />
        <StatReadout label="ACCEPTANCE" value={(accRate * 100).toFixed(0) + "%"} accent="#34d399" />
      </div>
      <StatReadout label="EXPECTED" value={theo.toFixed(2) + "×"} accent="#a855f7" />
      <Legend items={[
        { color: "#34d399", label: "accepted (free)" },
        { color: "#a855f7", label: "target token" },
        { color: "#60a5fa", label: "tokens/pass" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Autoregressive generation is slow because the big model runs once per
        token. Speculative decoding breaks that: a cheap draft model guesses the
        next k tokens, and the big target model checks all k in a single parallel
        pass. It accepts the longest prefix it agrees with (green), replaces the
        first disagreement with its own token (violet), and — if the draft nailed
        all k — even gets a free bonus token. So one expensive pass emits several
        tokens instead of one.
      </DemoP>
      <DemoP>
        Crucially the output is identical in distribution to running the target
        alone — it's a pure speedup, not an approximation. The size of that speedup
        is the whole game: raise DRAFT AGREEMENT and the green runs get longer and
        tokens-per-pass climbs toward the dashed expected curve; raise LOOKAHEAD k
        and you can win more per pass, but because acceptance stops at the first
        miss, a weak draft wastes the tail and the curve flattens. Tune the draft to
        the target and you get 2–3× for free.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Speculative decoding (Leviathan et al.; Chen et al., 2023) is a leading
        LLM inference-latency optimization, exact rather than lossy. It trades a
        little extra compute (the draft + verifying tokens that get rejected) for
        far fewer sequential steps of the expensive model — and it composes with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kv-cache/`} style={{ color: "#a855f7" }}>KV
        caching</a> and the sampling you tune in the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`} style={{ color: "#a855f7" }}>decoding</a>{" "}
        demo (the accept/reject test is built to preserve the target's exact
        distribution at any temperature).
      </DemoP>
      <DemoP>
        Variants change where the draft comes from: a separate small model, the
        target's own early layers (self-speculation), n-gram/prompt lookup, or
        learned multi-token heads (Medusa, EAGLE). All share this loop and live or
        die on acceptance rate × lookahead. It sits in the efficiency toolkit
        beside quantization, pruning, and MoE — but uniquely it speeds up{" "}
        <i>inference latency</i> with zero quality loss.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Speculative Decoding"
      subtitle="A small draft model guesses ahead; the big model verifies in one pass. Several tokens per expensive step — a lossless speedup set by draft agreement and lookahead."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/llm-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SpeculativeDecodingDemo />);
