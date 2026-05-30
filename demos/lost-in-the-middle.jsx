// demos/lost-in-the-middle.jsx — position bias in long contexts.
//
// Liu et al. (2023) found that an LLM uses information best when it sits at the
// START or END of its context and worst in the MIDDLE — accuracy vs the position
// of the relevant passage is U-shaped, and the dip deepens as the context grows.
//
// We place one "gold" passage (holding the answer) among N retrieved passages
// and model P(answer correct | gold position) as that U-curve, parameterized by
// a middle-drop knob and amplified by context length. A reorder toggle moves the
// gold passage to the front (what reranking does in practice) so you can watch
// the accuracy jump. Honest simulation of the documented curve, not a real model.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
// P(correct) given gold at 1-based position pos out of N
function accAt(pos, N, drop) {
  const xn = N <= 1 ? 0 : (pos - 1) / (N - 1);            // 0=start .. 1=end
  const lengthAmp = 0.45 + 0.55 * clamp01((N - 3) / 17);  // longer context => deeper dip
  const valley = Math.exp(-Math.pow((xn - 0.5) / 0.3, 2)); // 1 at middle, ~0 at ends
  const recency = 0.04 * xn;                               // slight end-of-context boost
  const ends = 0.95;
  return clamp01(ends + recency - drop * lengthAmp * valley);
}

function LostInTheMiddleDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [N, setN] = _useState(15);
  const [gold, setGold] = _useState(8);
  const [drop, setDrop] = _useState(0.55);
  const [reorder, setReorder] = _useState(false);
  const [scan, setScan] = _useState(false);
  const [, force] = _useState(0);

  const goldClamped = Math.min(gold, N);
  const effPos = reorder ? 1 : goldClamped;       // reranking puts the relevant passage first

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic"; ctx.font = "11px JetBrains Mono";

    // ── context strip ──
    const sX = 20, sY = 44, sW = W - 40, cellW = sW / N, ch = 30;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`CONTEXT WINDOW  ·  ${N} retrieved passages, in prompt order (green = the one with the answer)`, sX, sY - 8);
    for (let i = 1; i <= N; i++) {
      const x = sX + (i - 1) * cellW;
      const isGold = i === effPos;
      ctx.fillStyle = isGold ? "rgba(52,211,153,0.85)" : "rgba(96,165,250,0.22)";
      ctx.fillRect(x + 1, sY, cellW - 2, ch);
      ctx.strokeStyle = isGold ? "#34d399" : "rgba(96,165,250,0.3)"; ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, sY, cellW - 2, ch);
    }
    // labels start/end
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("start", sX, sY + ch + 12);
    ctx.fillText("end", sX + sW - 18, sY + ch + 12);
    if (reorder) {
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("↑ reranked to front (was position " + goldClamped + ")", sX, sY + ch + 12);
    }

    // ── U-curve ──
    const aX = 20, aY = 120, aW = W - 40, aH = 200;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("P(answer correct)  vs  position of the gold passage", aX, aY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(aX, aY, aW, aH);
    const xOf = (pos) => aX + (N <= 1 ? 0.5 : (pos - 1) / (N - 1)) * aW;
    const yOf = (a) => aY + aH - a * (aH - 12) - 6;
    // gridlines at 0.5 and 1.0
    ctx.strokeStyle = "rgba(148,163,184,0.15)"; ctx.setLineDash([3, 3]);
    [0.5, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(aX, yOf(v)); ctx.lineTo(aX + aW, yOf(v)); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("100%", aX + 4, yOf(1) + 10); ctx.fillText("50%", aX + 4, yOf(0.5) + 10);
    // curve
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath();
    for (let pos = 1; pos <= N; pos++) {
      const x = xOf(pos), y = yOf(accAt(pos, N, drop));
      if (pos === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // marker at effective position
    const eAcc = accAt(effPos, N, drop);
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xOf(effPos), aY); ctx.lineTo(xOf(effPos), aY + aH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.arc(xOf(effPos), yOf(eAcc), 5, 0, Math.PI * 2); ctx.fill();
    // faint marker at as-retrieved position when reordered
    if (reorder && goldClamped !== effPos) {
      const oAcc = accAt(goldClamped, N, drop);
      ctx.fillStyle = "rgba(248,113,113,0.7)"; ctx.beginPath(); ctx.arc(xOf(goldClamped), yOf(oAcc), 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(248,113,113,0.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xOf(goldClamped), yOf(oAcc)); ctx.lineTo(xOf(effPos), yOf(eAcc)); ctx.stroke();
    }

    // ── big accuracy readout ──
    ctx.fillStyle = eAcc > 0.8 ? "#34d399" : eAcc > 0.6 ? "#fbbf24" : "#f87171";
    ctx.font = "600 34px Space Grotesk, JetBrains Mono";
    ctx.fillText((eAcc * 100).toFixed(0) + "%", aX, aY + aH + 52);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("accuracy with the answer at position " + effPos + " of " + N, aX + 96, aY + aH + 48);
    const worst = accAt(Math.round((N + 1) / 2), N, drop);
    ctx.fillText("middle-position accuracy: " + (worst * 100).toFixed(0) + "%   ·   ends: ~95%", aX + 96, aY + aH + 64);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  });

  // auto-scan sweeps the gold position to trace the curve
  _useEffect(() => {
    if (!scan || reorder) return;
    const loop = (now) => {
      if (now - lastRef.current >= 450) { lastRef.current = now; setGold(g => (g % N) + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [scan, reorder, N]);

  const eAcc = accAt(effPos, N, drop);
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CONTEXT LENGTH (passages)" min={3} max={20} step={1} value={N} onChange={setN}
        help="How many retrieved passages are stuffed into the prompt. The longer the context, the deeper the middle sags — cramming more documents in can actively hurt if the answer lands in the dead zone." />
      <Slider label="// GOLD POSITION" min={1} max={N} step={1} value={goldClamped} onChange={setGold}
        help="Where the answer-bearing passage sits in the prompt. Slide it from front to back and watch accuracy trace the U: strong at the edges, weak in the middle." />
      <Slider label="// MIDDLE DROP" min={0} max={0.8} step={0.05} value={drop} onChange={setDrop} tone="violet"
        help="How badly this particular model loses the middle. Newer long-context models flatten the curve (low drop); weaker or very long-context setups have a deep valley. The position bias, not raw capacity." />
      <Toggle label="// RERANK relevant-to-front" checked={reorder} onChange={setReorder}
        help="Reorder the passages so the most relevant one leads the prompt (what a reranker does). It jumps the gold passage to position 1 — watch accuracy snap up to the edge value regardless of where retrieval originally placed it." />
      <DemoButton onClick={() => setScan(s => !s)} primary>{scan ? "STOP SCAN" : "SCAN POSITIONS"}</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ACCURACY" value={(eAcc * 100).toFixed(0) + "%"} accent={eAcc > 0.8 ? "#34d399" : eAcc > 0.6 ? "#fbbf24" : "#f87171"} />
        <StatReadout label="POSITION" value={effPos + "/" + N} />
      </div>
      <Legend items={[
        { color: "#34d399", label: "gold passage / current" },
        { color: "#a855f7", label: "accuracy curve" },
        { color: "#f87171", label: "as-retrieved (pre-rerank)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Stuffing more retrieved passages into the prompt feels safe — surely the
        answer is in there somewhere. But models don't read a long context evenly.
        Accuracy is highest when the relevant passage is near the <b>start</b> or{" "}
        <b>end</b> and sags in the <b>middle</b>, tracing the U-shaped curve here.
        Slide the gold position across the context and watch the accuracy readout
        rise at the edges and collapse in the center.
      </DemoP>
      <DemoP>
        Two levers make it worse or better. Grow CONTEXT LENGTH and the middle
        valley deepens — more passages, more dead zone. Flip on RERANK and the gold
        passage jumps to the front: accuracy snaps from the red middle value up to
        the green edge value, no model change required. That single move — order
        retrieved chunks by relevance and put the best at the ends — is one of the
        highest-leverage, lowest-cost fixes in a RAG pipeline.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        "Lost in the middle" (Liu et al., 2023) is the empirical position bias of
        transformer context windows: useful information in the middle is
        under-attended, and the effect grows with context length. It's a direct
        consequence of how{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/attention/`} style={{ color: "#a855f7" }}>attention</a>{" "}
        and positional encoding allocate weight over long sequences, and it's why a
        bigger context window is not the same as effectively using it.
      </DemoP>
      <DemoP>
        It's the other half of the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/rag-chunking/`} style={{ color: "#a855f7" }}>RAG
        chunking</a> story: chunking decides <i>what</i> gets retrieved, ordering
        decides <i>whether the model uses it</i>. The practical playbook — rerank
        with a cross-encoder, put the top hit first or last, keep contexts tight
        rather than maximal, and prefer fewer high-precision chunks over many noisy
        ones — all falls out of this curve. Newer long-context models flatten it
        but rarely erase it.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="Lost in the Middle"
      subtitle="Models use the start and end of a long context far better than the middle. Slide the answer's position — and rerank it to the front to fix it."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LostInTheMiddleDemo />);
