// demos/do-intervention.jsx — observation vs intervention (the do-operator).
//
// A confounder Z causes both X and Y, plus X causes Y with true effect β. The
// OBSERVED association of Y on X is biased: regressing Y on X alone picks up
// β PLUS the backdoor path X←Z→Y. INTERVENING — do(X) — severs Z→X (you set X
// yourself), leaving only the causal effect. Backdoor adjustment recovers it by
// conditioning on Z: regress Y on X *and* Z (Frisch–Waugh), and the X-coefficient
// returns to β. Real least-squares estimates on sampled data; toggle the do()
// switch to cut the Z→X arrow and watch the headline estimate jump to the truth.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function slope(a, b) { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let cov = 0, vb = 0; for (let i = 0; i < n; i++) { cov += (a[i] - ma) * (b[i] - mb); vb += (b[i] - mb) ** 2; } return { s: vb ? cov / vb : 0, ia: ma, ib: mb }; }
function resid(a, b) { const { s, ia, ib } = slope(a, b); return a.map((v, i) => v - (ia + s * (b[i] - ib))); }

function DoInterventionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [conf, setConf] = _useState(1.0);
  const [beta, setBeta] = _useState(0.6);
  const [doMode, setDoMode] = _useState(false);
  const [, force] = _useState(0);
  const dataRef = _useRef(null);

  function gen() {
    const N = 240, z = [], x = [], y = [];
    for (let i = 0; i < N; i++) {
      const zi = randn();
      const xi = conf * zi + 0.7 * randn();
      const yi = beta * xi + conf * zi + 0.5 * randn();
      z.push(zi); x.push(xi); y.push(yi);
    }
    dataRef.current = { z, x, y };
  }
  _useEffect(() => { gen(); force(v => v + 1); /* eslint-disable-next-line */ }, [conf, beta]);

  const d = dataRef.current;
  const naive = d ? slope(d.y, d.x).s : 0;
  const adjusted = d ? slope(resid(d.y, d.z), resid(d.x, d.z)).s : 0; // Frisch–Waugh
  const headline = doMode ? adjusted : naive;

  function draw() {
    const cv = canvasRef.current; if (!cv || !d) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText(doMode ? "INTERVENE: do(X)  ·  the Z→X arrow is cut" : "OBSERVE  ·  all arrows active (confounded)", 20, 22);

    // ── causal DAG (left) ──
    const node = (x, y, lab, col) => { ctx.fillStyle = "rgba(15,23,42,0.8)"; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.font = "13px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText(lab, x, y + 5); ctx.textAlign = "left"; };
    const arrow = (x1, y1, x2, y2, col, cut) => {
      const a = Math.atan2(y2 - y1, x2 - x1), sx = x1 + 18 * Math.cos(a), sy = y1 + 18 * Math.sin(a), ex = x2 - 20 * Math.cos(a), ey = y2 - 20 * Math.sin(a);
      ctx.strokeStyle = cut ? "rgba(248,113,113,0.5)" : col; ctx.lineWidth = 2; ctx.setLineDash(cut ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      if (!cut) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 7 * Math.cos(a - 0.4), ey - 7 * Math.sin(a - 0.4)); ctx.lineTo(ex - 7 * Math.cos(a + 0.4), ey - 7 * Math.sin(a + 0.4)); ctx.fill(); }
      else { ctx.fillStyle = "#f87171"; ctx.font = "12px JetBrains Mono"; ctx.fillText("✂", (sx + ex) / 2 - 4, (sy + ey) / 2 - 4); }
    };
    const Zx = 130, Zy = 70, Xx = 70, Xy = 170, Yx = 220, Yy = 170;
    arrow(Zx, Zy, Xx, Xy, "#fbbf24", doMode);   // Z -> X (cut on do)
    arrow(Zx, Zy, Yx, Yy, "#fbbf24", false);     // Z -> Y
    arrow(Xx, Xy, Yx, Yy, "#34d399", false);     // X -> Y (causal)
    node(Zx, Zy, "Z", "#fbbf24"); node(Xx, Xy, "X", "#60a5fa"); node(Yx, Yy, "Y", "#a855f7");
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("Z = confounder", 70, 210); ctx.fillText("X→Y = causal (β)", 70, 224);

    // ── scatter (right): Y vs X colored by z sign ──
    const px = 300, py = 44, pw = 220, ph = 180;
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    d.x.forEach((v, i) => { minx = Math.min(minx, v); maxx = Math.max(maxx, v); miny = Math.min(miny, d.y[i]); maxy = Math.max(maxy, d.y[i]); });
    const sx = (v) => px + ((v - minx) / (maxx - minx)) * pw, sy = (v) => py + ph - ((v - miny) / (maxy - miny)) * ph;
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(px, py, pw, ph);
    d.x.forEach((v, i) => { ctx.fillStyle = d.z[i] > 0 ? "rgba(168,85,247,0.6)" : "rgba(96,165,250,0.6)"; ctx.beginPath(); ctx.arc(sx(v), sy(d.y[i]), 2.2, 0, Math.PI * 2); ctx.fill(); });
    // naive line
    const nl = slope(d.y, d.x); const lineAt = (s, atMeanX, atMeanY) => { ctx.beginPath(); ctx.moveTo(sx(minx), sy(atMeanY + s * (minx - atMeanX))); ctx.lineTo(sx(maxx), sy(atMeanY + s * (maxx - atMeanX))); ctx.stroke(); };
    let mx = 0, my = 0; d.x.forEach((v, i) => { mx += v; my += d.y[i]; }); mx /= d.x.length; my /= d.x.length;
    ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2; lineAt(naive, mx, my);
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); lineAt(adjusted, mx, my); ctx.setLineDash([]);
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("Y vs X (color = Z)", px, py - 4);

    // ── effect estimate bars ──
    const by = 260, mxv = Math.max(Math.abs(naive), Math.abs(adjusted), Math.abs(beta), 0.5) * 1.1;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("ESTIMATED EFFECT OF X ON Y", 20, by - 6);
    const bar = (yy, label, v, col, hi) => {
      ctx.fillStyle = hi ? "#e2e8f0" : "#94a3b8"; ctx.fillText(label, 20, yy + 12);
      ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(190, yy, W - 260, 16);
      ctx.fillStyle = col; ctx.fillRect(190, yy, (W - 260) * Math.min(1, Math.abs(v) / mxv), 16);
      ctx.fillStyle = "#e2e8f0"; ctx.fillText(v.toFixed(2), 190 + (W - 260) * Math.min(1, Math.abs(v) / mxv) + 6, yy + 12);
      if (hi) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(188, yy - 2, W - 256, 20); }
    };
    bar(by + 6, "naive (observed)", naive, "rgba(248,113,113,0.8)", !doMode);
    bar(by + 32, "backdoor-adjusted", adjusted, "rgba(52,211,153,0.85)", doMode);
    bar(by + 58, "true causal β", beta, "rgba(168,85,247,0.7)", false);
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("naive − true = confounding bias of " + (naive - beta).toFixed(2) + "; adjustment ≈ removes it", 20, by + 86);
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
      <Toggle label="// do(X) — INTERVENE" checked={doMode} onChange={setDoMode} tone="violet"
        help="Off = OBSERVE: you read X off confounded data, so the headline estimate is the biased naive association. On = INTERVENE: do(X) cuts the Z→X arrow (you set X yourself), and the headline jumps to the backdoor-adjusted = true causal effect." />
      <Slider label="// CONFOUNDING" min={0} max={2} step={0.1} value={conf} onChange={setConf}
        help="Strength of Z's effect on both X and Y (the backdoor path). At 0 there's no confounding and naive = causal; turn it up and the naive estimate inflates away from the true β while the adjusted estimate stays put." />
      <Slider label="// TRUE EFFECT β" min={-0.5} max={1.5} step={0.1} value={beta} onChange={setBeta} tone="violet"
        help="The actual causal effect of X on Y (the X→Y arrow). The backdoor-adjusted bar should track this regardless of confounding; the naive bar won't." />
      <DemoButton onClick={() => { gen(); force(v => v + 1); }} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label={doMode ? "do(X) EFFECT" : "OBSERVED"} value={headline.toFixed(2)} accent={doMode ? "#34d399" : "#f87171"} />
        <StatReadout label="TRUE β" value={beta.toFixed(2)} accent="#a855f7" />
      </div>
      <StatReadout label="CONFOUNDING BIAS" value={(naive - beta).toFixed(2)} accent={Math.abs(naive - beta) < 0.1 ? "#34d399" : "#f87171"} />
      <Legend items={[
        { color: "#f87171", label: "naive / observed" },
        { color: "#34d399", label: "adjusted = causal" },
        { color: "#a855f7", label: "true β" },
        { color: "#fbbf24", label: "confounder Z" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Z is a confounder: it pushes up both X and Y. So when you simply observe
        that high-X cases tend to have high Y and fit a line (the red, naive
        estimate), part of that slope is the real effect X→Y and part is the
        backdoor X←Z→Y leaking through. The red bar sits above the true β by exactly
        the confounding bias. Pulling CONFOUNDING up makes the gap explode — pure
        correlation masquerading as effect.
      </DemoP>
      <DemoP>
        The do-operator is the fix in principle: do(X) means you <i>set</i> X
        yourself, which severs the Z→X arrow (flip the toggle to cut it) and leaves
        only the genuine X→Y path. You can't always run that experiment, so backdoor
        adjustment estimates it from observational data instead — condition on Z
        (regress Y on X <i>and</i> Z) and the green adjusted estimate snaps back to
        the true β no matter how strong the confounding. Same data, right question.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the heart of causal inference (Pearl): P(Y | X) — what you see — is
        not P(Y | do(X)) — what happens if you act. The do-operator formalizes
        intervention as cutting incoming arrows to the variable you set, and the
        back-door criterion tells you which variables to condition on to recover the
        causal effect from observation. It's the rigorous version of the reversal in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/simpsons-paradox/`} style={{ color: "#a855f7" }}>Simpson's
        paradox</a> and decides which{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/regression/`} style={{ color: "#a855f7" }}>regression</a>{" "}
        controls actually answer your question.
      </DemoP>
      <DemoP>
        It underpins A/B testing and randomized trials (randomization is do(X) by
        construction — it breaks confounding), quasi-experimental methods (matching,
        instrumental variables, difference-in-differences), and uplift modeling. The
        catch the demo hides: you can only adjust for confounders you've measured —
        condition on the wrong variable (a collider or mediator) and you introduce
        bias instead of removing it, which is why the causal graph, not the data,
        has to come first.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="do() & Backdoor Adjustment"
      subtitle="Observing X is not setting X. A confounder biases the naive estimate; cut its arrow with do(X), or adjust for it, to recover the true causal effect."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DoInterventionDemo />);
