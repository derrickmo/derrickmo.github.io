// demos/canary-rollout.jsx — Canary deployment with an automated metric guard. A
// new model v2 is rolled out in stages (5% -> 25% -> 50% -> 100% of traffic). Each
// request is routed by the current split and "errors" with its version's true rate.
// The guard runs a one-sided z-test of v2's observed error vs the v1 baseline: if v2
// is significantly worse it ROLLS BACK; otherwise it advances the next stage. A
// counterfactual shows how many more users a bad full deploy would have hit. Real
// binomial sampling + sequential test in JS.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const STAGES = [0.05, 0.25, 0.5, 1.0];
const MIN_N = 70;          // min v2 samples per stage before a decision
const V1_ERR = 0.03;       // stable baseline error rate

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function CanaryRolloutDemo() {
  const mobile = useIsMobile ? useIsMobile() : false;
  const [v2err, setV2err] = _useState(0.08);   // candidate true error rate (hidden to the guard)
  const [zcrit, setZcrit] = _useState(3.0);    // guard sensitivity (z threshold)
  const [running, setRunning] = _useState(true);
  const [ui, setUi] = _useState(null);

  const cfg = _useRef({ v2err, zcrit, running });
  _useEffect(() => { cfg.current = { v2err, zcrit, running }; }, [v2err, zcrit, running]);

  const sim = _useRef(null);
  const reset = () => {
    sim.current = {
      rand: rng((Math.random() * 1e9) >>> 0),
      stage: 0, frac: STAGES[0], status: "ramping",   // ramping | promoted | rolledback
      n1: 0, e1: 0, n2: 0, e2: 0, stageN2: 0,
      total: 0, affected: 0, acc: 0,
    };
    setUi(snapshot());
  };
  function snapshot() {
    const S = sim.current; if (!S) return null;
    const p1 = S.n1 ? S.e1 / S.n1 : 0, p2 = S.n2 ? S.e2 / S.n2 : 0;
    return {
      stage: S.stage, frac: S.frac, status: S.status,
      p1, p2, n2: S.n2, total: S.total, affected: S.affected,
      counterfactual: Math.round(cfg.current.v2err * S.total),
    };
  }
  if (!sim.current) reset();

  _useEffect(() => {
    let raf, acc = 0, last = performance.now();
    function gate() {
      const S = sim.current; const { v2err, zcrit } = cfg.current;
      if (S.status !== "ramping") return;
      if (S.stageN2 < MIN_N) return;
      // one-sided two-proportion z-test: is v2 worse than v1?
      const p1 = S.e1 / Math.max(1, S.n1), p2 = S.e2 / Math.max(1, S.n2);
      const p = (S.e1 + S.e2) / Math.max(1, S.n1 + S.n2);
      const se = Math.sqrt(p * (1 - p) * (1 / Math.max(1, S.n1) + 1 / Math.max(1, S.n2)));
      const z = se > 0 ? (p2 - p1) / se : 0;
      if (z > zcrit) { S.status = "rolledback"; S.frac = 0; return; }
      // otherwise advance the stage (or promote at the last one)
      if (S.stage >= STAGES.length - 1) { S.status = "promoted"; }
      else { S.stage++; S.frac = STAGES[S.stage]; S.stageN2 = 0; }
    }
    function frame(now) {
      let dt = now - last; last = now; if (dt > 80) dt = 80;
      const S = sim.current; const { v2err, running } = cfg.current;
      if (running && S.status !== "promoted") {
        acc += dt * 0.05;                  // ~ requests this frame
        let reqs = Math.floor(acc); acc -= reqs;
        for (let i = 0; i < reqs; i++) {
          S.total++;
          const toV2 = S.status === "ramping" && S.rand() < S.frac;
          if (toV2) {
            S.n2++; S.stageN2++;
            if (S.rand() < v2err) { S.e2++; S.affected++; }
          } else {
            S.n1++;
            if (S.rand() < V1_ERR) S.e1++;
          }
        }
        gate();
      }
      raf = requestAnimationFrame(frame);
      // throttle UI updates
      S.acc = (S.acc || 0) + dt;
      if (S.acc > 110) { S.acc = 0; setUi(snapshot()); }
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const statusColor = ui && ui.status === "rolledback" ? "rgba(239,68,68,0.95)" : ui && ui.status === "promoted" ? "var(--blue-lt)" : "var(--violet-lt)";
  const statusText = !ui ? "" : ui.status === "rolledback" ? "ROLLED BACK — guard caught v2's regression" : ui.status === "promoted" ? "PROMOTED — v2 is now serving 100%" : `RAMPING — v2 at ${Math.round(ui.frac * 100)}% of traffic`;

  // visual: traffic split bar + two error gauges
  const SplitBar = () => {
    const f = ui ? ui.frac : 0;
    return (
      <div style={{ width: mobile ? 280 : 360, display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>TRAFFIC SPLIT</span>
        <div style={{ display: "flex", height: 26, borderRadius: 4, overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ width: `${(1 - f) * 100}%`, background: "rgba(96,165,250,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="t-mono-s" style={{ fontSize: 9 }}>v1 {Math.round((1 - f) * 100)}%</span>
          </div>
          <div style={{ width: `${f * 100}%`, background: "rgba(168,85,247,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {f > 0.08 && <span className="t-mono-s" style={{ fontSize: 9 }}>v2 {Math.round(f * 100)}%</span>}
          </div>
        </div>
      </div>
    );
  };
  const Gauge = ({ label, p, color, n }) => (
    <div style={{ flex: 1, minWidth: 130 }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}</span>
      <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginTop: 4, position: "relative", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, p * 100 * 4)}%`, height: "100%", background: color }} />
      </div>
      <span className="t-mono-s" style={{ fontSize: 10, color }}>{(p * 100).toFixed(1)}% err{n != null ? `  ·  n=${n}` : ""}</span>
    </div>
  );

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", padding: "8px 0" }}>
      <span className="t-mono-s" style={{ color: statusColor, fontWeight: 600 }}>{statusText}</span>
      <SplitBar />
      <div style={{ width: mobile ? 280 : 360, display: "flex", gap: 18 }}>
        <Gauge label="v1 (stable)" p={ui ? ui.p1 : 0} color="#60a5fa" />
        <Gauge label="v2 (canary)" p={ui ? ui.p2 : 0} color="#a855f7" n={ui ? ui.n2 : 0} />
      </div>
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>guard = one-sided z-test of v2 error vs v1 baseline, per stage</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <DemoButton onClick={() => { reset(); }} tone="violet" primary>REDEPLOY v2</DemoButton>
      <DemoButton onClick={() => setRunning(r => !r)} tone="blue">{running ? "PAUSE" : "PLAY"}</DemoButton>
      <Slider label="// v2 TRUE ERROR RATE" min={0.01} max={0.2} step={0.005} value={v2err} onChange={setV2err} tone="violet"
        help={`The candidate's real error rate, hidden from the guard (baseline v1 is ${(V1_ERR * 100).toFixed(0)}%). Set it below ~3% and v2 promotes; well above and the guard should roll it back. Set it just barely worse to see the guard struggle to tell the difference.`} />
      <Slider label="// GUARD SENSITIVITY (z)" min={1.5} max={5} step={0.1} value={zcrit} onChange={setZcrit} tone="blue"
        help="How many standard errors worse v2 must look before rollback. Low = twitchy guard that rolls back good deploys on noise (false alarms); high = lax guard that may promote a genuinely worse model. The classic detection threshold tradeoff." />
      <StatReadout label="STATUS" value={ui ? ui.status.toUpperCase() : "-"} accent={statusColor} />
      <StatReadout label="USERS HIT BY v2 ERRORS" value={ui ? ui.affected : 0} accent="var(--violet-lt)" />
      <StatReadout label="IF FULL DEPLOY INSTEAD" value={ui ? "~" + ui.counterfactual : 0} accent="var(--dim)" />
      <Legend items={[{ label: "v1 traffic", color: "#60a5fa" }, { label: "v2 canary", color: "#a855f7" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Shipping a new model is risky: it might be worse in ways your offline tests
        missed. A <b>canary</b> rollout de-risks it by exposing v2 to a small slice of
        live traffic first (5%), watching a health metric, and only widening the slice
        (25% → 50% → 100%) if it stays healthy. The key property is a small <b>blast
        radius</b> — compare <b>users hit by v2 errors</b> to the counterfactual of a
        full deploy: the canary caps how many people a bad model can hurt before you
        catch it.
      </DemoP>
      <DemoP>
        The catch the guard: at each stage it runs a one-sided <b>z-test</b> of v2's
        observed error against v1's baseline. Significantly worse → <b>roll back</b>;
        otherwise → advance. That makes <b>GUARD SENSITIVITY</b> a detection tradeoff:
        too twitchy and ordinary noise rolls back good models (false alarms); too lax
        and a genuinely worse model slips through to 100%. And it's fundamentally
        statistical — at 5% traffic you have few v2 samples, so a <i>small</i> regression
        is hard to distinguish from noise until the canary widens. Set v2's true error
        just barely above baseline and watch the guard struggle.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Progressive delivery — canaries, blue/green, and feature flags — is how mature
        teams ship models and code without all-or-nothing risk, and it's exactly what
        Argo Rollouts, Flagger, and SageMaker/Vertex traffic-splitting automate. The
        same automated-metric-guard idea powers A/B tests and bandit rollouts (route more
        traffic to the better arm — the live cousin of the
        <a href={`${window.__DM_BASE || "../../"}visualize/bandit/`}> multi-armed bandit</a>),
        and shadow deployments that send v2 a copy of traffic with its outputs discarded.
      </DemoP>
      <DemoP>
        Underneath, the guard is hypothesis testing under a sequential, low-sample
        regime — the same significance-vs-power tension as any
        <a href={`${window.__DM_BASE || "../../"}visualize/roc/`}> detection threshold</a>, and
        a close relative of the <a href={`${window.__DM_BASE || "../../"}visualize/drift-detection/`}>drift
        detection</a> that watches an already-deployed model. Canarying catches a bad
        release; drift detection catches a once-good model going stale.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="MLOPS & SERVING"
      title="Canary Rollout"
      subtitle="Ship a new model to a sliver of live traffic, guard it with an automated metric test, and widen or roll back — capping the blast radius of a bad deploy."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CanaryRolloutDemo />);
