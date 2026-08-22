// demos/reflection.jsx — the self-correction / reflection agent loop.
//
// An agent drafts an answer, a critic scores it and gives feedback, the agent
// revises, repeat — until the critic is satisfied or a budget runs out
// (Reflexion-style). We model the answer's true quality q in [0,1]: each revision
// moves it toward 1 by an amount set by how INFORMATIVE the critic's feedback is,
//     q <- q + 0.55 * (1 - q) * informativeness + noise,
// so an informative critic converges fast and a useless one plateaus. The critic
// is also only ACCURATE some of the time: it can false-pass a bad answer (ship
// garbage) or false-fail a good one (loop forever, burn budget).
//
// The whole point: self-correction is bounded by the verifier. A great critic
// makes reflection shine; a weak one wastes calls or ships the wrong thing.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const PAD = 44;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function ReflectionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [info, setInfo] = _useState(0.6);     // critic informativeness -> convergence speed
  const [acc, setAcc] = _useState(0.85);      // critic accuracy -> false pass/fail rate
  const [thresh, setThresh] = _useState(0.75); // quality bar
  const [budget, setBudget] = _useState(6);    // max revisions
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  const fresh = () => ({ attempts: [{ q: 0.3 + Math.random() * 0.15, verdict: null }], done: false, outcome: null, oColor: "#94a3b8" });
  const st = _useRef(fresh());
  function reset() { st.current = fresh(); force(x => x + 1); }

  function step() {
    const s = st.current; if (s.done) return;
    const i = s.attempts.length - 1;
    const a = s.attempts[i];
    if (a.verdict === null) {
      const trueBar = a.q >= thresh;
      const verdict = Math.random() < acc ? trueBar : !trueBar;  // critic may be wrong
      a.verdict = verdict ? "pass" : "fail";
      if (verdict) {
        s.done = true;
        if (trueBar) { s.outcome = "✓ shipped — meets the bar"; s.oColor = "#34d399"; }
        else { s.outcome = "⚠ shipped BELOW the bar — critic false-passed"; s.oColor = "#f87171"; }
        return;
      }
    }
    // failed -> revise (if budget remains)
    if (s.attempts.length - 1 >= budget) {
      s.done = true;
      const last = s.attempts[s.attempts.length - 1].q;
      if (last >= thresh) { s.outcome = "↯ budget spent — answer met the bar but the critic kept false-failing"; s.oColor = "#fbbf24"; }
      else { s.outcome = "✗ gave up at budget — still below the bar"; s.oColor = "#f87171"; }
      return;
    }
    const qn = clamp01(a.q + 0.55 * (1 - a.q) * info + (Math.random() - 0.5) * 0.06);
    s.attempts.push({ q: qn, verdict: null });
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current;
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("ANSWER QUALITY across revisions  ·  attempt → critique → revise", PAD, 28);

    const pX = PAD, pY = 44, pW = W - 2 * PAD, pH = 240;
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(pX, pY, pW, pH);
    const N = Math.max(budget, s.attempts.length - 1, 1);
    const xOf = (i) => pX + (N === 0 ? 0.5 : i / N) * pW;
    const yOf = (q) => pY + pH - q * (pH - 12) - 6;
    // threshold line
    ctx.strokeStyle = "rgba(52,211,153,0.4)"; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(pX, yOf(thresh)); ctx.lineTo(pX + pW, yOf(thresh)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(52,211,153,0.8)"; ctx.fillText("quality bar", pX + pW - 80, yOf(thresh) - 5);
    // quality polyline
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath();
    s.attempts.forEach((a, i) => { const x = xOf(i), y = yOf(a.q); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    // attempt dots + verdicts
    s.attempts.forEach((a, i) => {
      const x = xOf(i), y = yOf(a.q);
      ctx.fillStyle = a.verdict === "pass" ? "#34d399" : a.verdict === "fail" ? "#f87171" : "#64748b";
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#94a3b8"; ctx.font = "9px JetBrains Mono";
      ctx.fillText("#" + i, x - 6, pY + pH + 14);
    });
    // y labels
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("100%", pX - 30, yOf(1) + 4); ctx.fillText("0%", pX - 20, yOf(0) + 4);

    // critique log for the latest evaluated attempt
    const lastEval = [...s.attempts].reverse().find(a => a.verdict !== null);
    let cy = pY + pH + 44;
    ctx.font = "11px JetBrains Mono"; ctx.fillStyle = "#94a3b8";
    ctx.fillText("CRITIC", PAD, cy);
    if (lastEval) {
      ctx.fillStyle = lastEval.verdict === "pass" ? "#34d399" : "#f87171";
      ctx.fillText(lastEval.verdict === "pass" ? "verdict: PASS" : "verdict: REVISE", PAD + 60, cy);
    }
    cy += 22;
    ctx.font = "600 30px Space Grotesk, JetBrains Mono";
    const cur = s.attempts[s.attempts.length - 1].q;
    ctx.fillStyle = cur >= thresh ? "#34d399" : "#fbbf24";
    ctx.fillText((cur * 100).toFixed(0) + "%", PAD, cy + 6);
    ctx.font = "11px JetBrains Mono"; ctx.fillStyle = "#94a3b8";
    ctx.fillText("current quality  ·  revision " + (s.attempts.length - 1) + " / " + budget, PAD + 88, cy + 2);
    if (s.done && s.outcome) {
      cy += 30; ctx.fillStyle = s.oColor; ctx.font = "12px JetBrains Mono";
      ctx.fillText(s.outcome, PAD, cy);
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 650) { lastRef.current = now; step(); if (st.current.done) setRunning(false); force(x => x + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, info, acc, thresh, budget]);

  const s = st.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CRITIC INFORMATIVENESS" min={0.05} max={0.95} step={0.05} value={info} onChange={setInfo} tone="violet"
        help="How useful the critic's feedback is — how much each revision actually improves the answer. High = quality climbs fast toward the bar; low = revisions barely move it and the loop plateaus, spending calls for nothing." />
      <Slider label="// CRITIC ACCURACY" min={0.5} max={1} step={0.05} value={acc} onChange={setAcc}
        help="How often the critic's pass/fail verdict is correct. Below 1 it makes mistakes: false-passing a sub-bar answer (you ship garbage) or false-failing a good one (you loop and burn budget). Self-correction can't beat a bad verifier." />
      <Slider label="// QUALITY BAR" min={0.4} max={0.95} step={0.05} value={thresh} onChange={setThresh}
        help="The quality the answer must reach to be acceptable. A higher bar needs more revisions — and is more likely to exhaust the budget if the critic isn't informative enough to get there." />
      <Slider label="// BUDGET (max revisions)" min={1} max={12} step={1} value={budget} onChange={setBudget}
        help="How many revise cycles you'll pay for before giving up. Each one is another full model call — the cost side of the reflection tradeoff." />
      <DemoButton onClick={() => { if (s.done) reset(); setRunning(r => !r); }} primary>{running ? "PAUSE" : (s.done ? "RUN AGAIN" : "RUN")}</DemoButton>
      <DemoButton onClick={() => { step(); force(x => x + 1); }}>STEP</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="REVISION" value={(s.attempts.length - 1) + "/" + budget} />
        <StatReadout label="QUALITY" value={(s.attempts[s.attempts.length - 1].q * 100).toFixed(0) + "%"} accent={s.attempts[s.attempts.length - 1].q >= thresh ? "#34d399" : "#fbbf24"} />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "true quality" },
        { color: "#34d399", label: "critic: pass" },
        { color: "#f87171", label: "critic: revise" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Reflection turns one shot into a loop: the agent drafts an answer, a critic
        scores it and says what's wrong, the agent revises, and round on. The
        violet line is the answer's true quality climbing across revisions; the
        green dashed line is the bar it needs to clear; each dot is a critic
        verdict — red "revise" keeps the loop going, green "pass" ships it. With an
        informative critic the quality curve bends up to the bar in a couple of
        rounds.
      </DemoP>
      <DemoP>
        Then break the critic. Drop CRITIC INFORMATIVENESS and the curve flattens
        below the bar — the loop keeps revising but never improves, and you pay for
        every call. Drop CRITIC ACCURACY and two new failure modes appear: a green
        "pass" dot below the bar means it <i>false-passed</i> and shipped a bad
        answer, while an answer that's clearly over the bar but keeps getting red
        dots is being <i>false-failed</i> until the budget runs out. Self-correction
        is only ever as good as the thing doing the correcting.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the Reflexion / self-refine pattern and the core of agentic
        workflows: generate, critique, revise. It's the sequential cousin of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/self-consistency/`} style={{ color: "#a855f7" }}>self-consistency</a>{" "}
        (which votes over parallel samples instead of iterating on one), and the
        critic is exactly where a learned{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/reward-model/`} style={{ color: "#a855f7" }}>reward
        / verifier model</a> plugs in. Verifier-guided revision is also what
        powers test-time-compute reasoning loops.
      </DemoP>
      <DemoP>
        The demo's lesson is the field's hard-won one: LLM self-correction helps
        when there's an <i>external, reliable</i> signal — unit tests, a
        calculator, a retrieval check, a strong reward model — and is weak or even
        harmful when the model is just grading its own homework, because the same
        blind spots that produced the error also pass it. That's why production
        agents wire reflection to tools and verifiers, cap the budget, and prefer a
        trustworthy critic over more rounds.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Self-Correction (Reflection)"
      subtitle="Draft, critique, revise, repeat. Watch quality climb to the bar — then weaken the critic and see reflection stall, ship garbage, or burn the budget."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ReflectionDemo />);
