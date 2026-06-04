// demos/autoscaling.jsx — Horizontal autoscaling control loop. A time-varying
// request load scrolls across the screen; an HPA-style controller sizes the replica
// pool to desired = ceil(load / (targetUtil * perReplicaCapacity)). New replicas
// take COLD START seconds to become ready, so demand spikes outrun capacity and
// breach the SLO until the pool catches up. Lower target utilization buys headroom
// (fewer breaches) at higher cost. Real control-loop simulation in JS.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 380, CH = 210, CAP = 20; // each replica serves 20 req/s
const MARGIN = { l: 6, r: 6, t: 18, b: 14 };

function AutoscalingDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [target, setTarget] = _useState(0.7);    // target utilization
  const [cold, setCold] = _useState(6);          // cold-start seconds
  const [maxRep, setMaxRep] = _useState(12);     // replica ceiling
  const [running, setRunning] = _useState(true);
  const [stats, setStats] = _useState({ rep: 1, util: 0, load: 0, cap: CAP, cost: 0, breach: 0 });

  const cfg = _useRef({ target, cold, maxRep, running });
  _useEffect(() => { cfg.current = { target, cold, maxRep, running }; }, [target, cold, maxRep, running]);

  const sim = _useRef(null);
  const reset = () => {
    sim.current = { t: 0, ready: 1, pending: [], hist: [], cost: 0, breachT: 0, totalT: 0, spike: 0 };
  };
  if (!sim.current) reset();

  // base demand pattern: slow sine + faster ripple, plus injected spikes
  function demand(t, spikeEnd) {
    let d = 150 + 90 * Math.sin(t * 0.18) + 30 * Math.sin(t * 0.7 + 1);
    if (t < spikeEnd) d += 160;
    return Math.max(20, d);
  }

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    let raf, last = performance.now();

    function stepSim(dt) {
      const S = sim.current; const { target, cold, maxRep, running } = cfg.current;
      if (!running) return;
      S.t += dt;
      const load = demand(S.t, S.spike);
      // promote pending replicas whose cold start elapsed
      S.pending = S.pending.filter(rt => { if (S.t >= rt) { S.ready++; return false; } return true; });
      const cap = S.ready * CAP;
      const total = S.ready + S.pending.length;
      // HPA-style desired count
      const desired = Math.max(1, Math.min(maxRep, Math.ceil(load / (target * CAP))));
      if (desired > total) { for (let i = 0; i < desired - total; i++) S.pending.push(S.t + cold); }
      else if (desired < S.ready) { S.ready = Math.max(desired, 1); } // scale-in is instant
      const util = cap > 0 ? load / cap : 99;
      const breach = load > cap;
      S.cost += S.ready * dt;             // replica-seconds
      S.totalT += dt; if (breach) S.breachT += dt;
      S.hist.push({ load, cap, ready: S.ready, breach });
      if (S.hist.length > CW - MARGIN.l - MARGIN.r) S.hist.shift();
    }

    function draw() {
      const S = sim.current;
      ctx.fillStyle = "#05060f"; ctx.fillRect(0, 0, CW, CH);
      const gx = MARGIN.l, gy = MARGIN.t, gw = CW - MARGIN.l - MARGIN.r, gh = CH - MARGIN.t - MARGIN.b;
      // y scale
      let ymax = 60; for (const h of S.hist) { ymax = Math.max(ymax, h.load, h.cap); }
      ymax *= 1.1;
      const Y = (v) => gy + gh - (v / ymax) * gh;
      // breach shading
      for (let i = 0; i < S.hist.length; i++) {
        if (S.hist[i].breach) { ctx.fillStyle = "rgba(239,68,68,0.16)"; ctx.fillRect(gx + i, gy, 1, gh); }
      }
      // capacity staircase (blue)
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < S.hist.length; i++) { const x = gx + i, y = Y(S.hist[i].cap); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // demand (amber)
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < S.hist.length; i++) { const x = gx + i, y = Y(S.hist[i].load); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // labels
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillStyle = "#fbbf24"; ctx.fillText("demand", gx + 4, gy + 10);
      ctx.fillStyle = "#60a5fa"; ctx.fillText("capacity", gx + 56, gy + 10);
      ctx.fillStyle = "rgba(239,68,68,0.9)"; ctx.fillText("SLO breach", gx + gw - 70, gy + 10);
      // replica pips (bottom strip)
      const ready = S.ready, pend = S.pending.length;
      for (let i = 0; i < ready; i++) { ctx.fillStyle = "#60a5fa"; ctx.fillRect(gx + i * 9, CH - 9, 7, 6); }
      for (let i = 0; i < pend; i++) { ctx.fillStyle = "rgba(168,85,247,0.7)"; ctx.fillRect(gx + (ready + i) * 9, CH - 9, 7, 6); }
    }

    let uiAcc = 0;
    function frame(now) {
      let dt = (now - last) / 1000; last = now;       // seconds
      if (dt > 0.1) dt = 0.1;
      dt *= 2.2;                                       // sim runs a bit faster than realtime
      stepSim(dt); draw();
      uiAcc += dt;
      if (uiAcc > 0.18) {
        uiAcc = 0; const S = sim.current; const load = demand(S.t, S.spike), cap = S.ready * CAP;
        setStats({ rep: S.ready, pending: S.pending.length, util: cap > 0 ? load / cap : 99, load, cap, cost: S.cost, breach: S.totalT > 0 ? S.breachT / S.totalT : 0 });
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const over = stats.util > 1;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: over ? "rgba(239,68,68,0.95)" : "var(--muted)" }}>
        {over ? "SLO BREACH — demand exceeds ready capacity (waiting on cold starts)" : "AUTOSCALER TRACKING DEMAND"}
      </span>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 0.86 : 1.15), height: CH * (mobile ? 0.86 : 1.15), borderRadius: 4, border: "1px solid var(--border)", background: "#05060f" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>bottom pips: blue = ready replicas, violet = cold-starting · each replica serves {CAP} req/s</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <DemoButton onClick={() => setRunning(r => !r)} tone="violet" primary>{running ? "PAUSE" : "PLAY"}</DemoButton>
      <DemoButton onClick={() => { const S = sim.current; if (S) S.spike = S.t + 8; }} tone="blue">INJECT SPIKE</DemoButton>
      <Slider label="// TARGET UTILIZATION" min={0.3} max={0.95} step={0.05} value={target} onChange={setTarget} tone="violet"
        help="The controller adds replicas to keep utilization near this. Low target = lots of spare headroom, so spikes rarely breach the SLO — but you pay for idle replicas. High target = cheap but fragile: any surge breaches before new replicas warm up." />
      <Slider label="// COLD START" min={0} max={16} step={1} value={cold} onChange={setCold} suffix=" s" tone="violet"
        help="Seconds a new replica takes to become ready (image pull, model load, JIT warmup). This reaction lag is why autoscaling can't react instantly to spikes — the longer it is, the worse the transient breaches. The single biggest enemy of reactive autoscaling." />
      <Slider label="// MAX REPLICAS" min={2} max={20} step={1} value={maxRep} onChange={setMaxRep} tone="blue"
        help="Hard ceiling on the pool. If demand needs more than this, you're capacity-capped and breach no matter what — the case for capacity planning on top of autoscaling." />
      <StatReadout label="REPLICAS" value={stats.rep + (stats.pending ? " (+" + stats.pending + " warming)" : "")} accent="var(--blue-lt)" />
      <StatReadout label="UTILIZATION" value={(stats.util * 100).toFixed(0) + "%"} accent={over ? "rgba(239,68,68,0.95)" : "var(--blue-lt)"} />
      <StatReadout label="SLO VIOLATIONS" value={(stats.breach * 100).toFixed(1) + "% of time"} accent="var(--violet-lt)" />
      <StatReadout label="COST" value={Math.round(stats.cost) + " replica-s"} accent="var(--violet-lt)" />
      <Legend items={[{ label: "demand", color: "#fbbf24" }, { label: "capacity", color: "#60a5fa" }, { label: "breach", color: "#ef4444" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Traffic isn't constant, so a fixed fleet is either wasteful at night or
        overwhelmed at peak. An <b>autoscaler</b> closes the loop: measure load,
        compute how many replicas you'd need to keep utilization near a
        <b> target</b> (desired = ⌈load ÷ (target × per-replica capacity)⌉), and adjust
        the pool. The amber demand line wanders; the blue capacity staircase chases it.
      </DemoP>
      <DemoP>
        The whole difficulty is the <b>cold start</b>. A new replica isn't instant —
        it pulls an image, loads weights, warms up — so when demand spikes (hit
        <b> INJECT SPIKE</b>) capacity can't rise fast enough and you get a red
        <b> SLO breach</b> until the warming replicas (violet pips) come online. Drop
        <b> TARGET UTILIZATION</b> and you carry spare headroom that absorbs spikes —
        far fewer breaches, but the <b>cost</b> (replica-seconds) climbs because you're
        running idle capacity. That headroom-vs-cost dial, plus the cold-start lag, is
        the entire game of capacity management.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is exactly Kubernetes' Horizontal Pod Autoscaler, cloud autoscaling groups,
        and serverless concurrency control — and the cold-start tax is why "scale to
        zero" is hard for big models (loading weights can take many seconds) and why
        teams keep warm pools or provisioned concurrency. The reactive controller here is
        the simplest form; real systems add predictive scaling, scale-in cooldowns to
        avoid flapping, and request <a href={`${window.__DM_BASE || "../../"}visualize/batching/`}>batching</a>
        underneath each replica to raise per-replica capacity in the first place.
      </DemoP>
      <DemoP>
        Underneath it's the same queueing reality as batching: utilization above 100%
        means the queue and latency run away, so the SLO breaks the instant demand
        crosses ready capacity. Choosing the target utilization is a risk/cost decision —
        the serving analogue of a confidence threshold in a
        <a href={`${window.__DM_BASE || "../../"}visualize/model-cascade/`}> cascade</a> — and
        load shedding / admission control is the fallback when even max replicas aren't
        enough.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="MLOPS & SERVING"
      title="Autoscaling"
      subtitle="Size the replica pool to chase a moving load — and watch cold-start lag breach the SLO on spikes while spare headroom trades cost for safety. A live control-loop simulation."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AutoscalingDemo />);
