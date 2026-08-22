// demos/batching.jsx — Dynamic batching on an inference server. A real-time
// discrete-event simulation: requests arrive at rate lambda, a single "GPU"
// collects them into a batch (up to MAX BATCH, or until BATCH WINDOW elapses),
// then runs the batch in time base + slope*b. Larger batches amortize the fixed
// overhead -> higher throughput, but every request waits longer -> higher tail
// latency. Push lambda past capacity and the queue grows without bound.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 360, CH = 232;
const BASE_MS = 120;   // fixed per-batch overhead (kernel launch, weight load)
const SLOPE_MS = 8;    // marginal cost per item in the batch
const serviceTime = (b) => BASE_MS + SLOPE_MS * b;   // ms for a batch of size b

function BatchingDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [lam, setLam] = _useState(18);     // arrival rate, req/s
  const [maxB, setMaxB] = _useState(8);    // max batch size
  const [winMs, setWinMs] = _useState(40); // batch-formation window, ms
  // A11Y-0002: this loop starts on its own, so it starts PAUSED when the reader
  // has asked for reduced motion. The PLAY control is right there either way.
  const [running, setRunning] = _useState(!window.__DM_REDUCED_MOTION);
  const [stats, setStats] = _useState({ thru: 0, mlat: 0, p99: 0, q: 0, util: 0, served: 0 });

  const cfg = _useRef({ lam, maxB, winMs, running });
  _useEffect(() => { cfg.current = { lam, maxB, winMs, running }; }, [lam, maxB, winMs, running]);

  const sim = _useRef(null);
  const resetSim = () => {
    sim.current = {
      t: 0, credit: 0, queue: [], server: null, served: 0,
      lat: [], hist: [], firstWaitOldest: 0,
    };
  };
  if (!sim.current) resetSim();

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    let raf, lastNow = performance.now();

    function step(dtMs) {
      const S = sim.current; const { lam, maxB, winMs, running } = cfg.current;
      if (!running) return;
      S.t += dtMs;
      // --- arrivals (Poisson-ish via fractional credit) ---
      S.credit += lam * dtMs / 1000;
      while (S.credit >= 1) { S.queue.push(S.t); S.credit -= 1; }
      // --- server completion ---
      if (S.server && S.t >= S.server.end) {
        for (const a of S.server.arr) { S.lat.push(S.server.end - a); S.served++; }
        if (S.lat.length > 200) S.lat.splice(0, S.lat.length - 200);
        S.server = null;
      }
      // --- dispatch a new batch if idle ---
      if (!S.server && S.queue.length) {
        const full = S.queue.length >= maxB;
        const waited = S.t - S.queue[0] >= winMs;
        if (full || waited) {
          const b = Math.min(maxB, S.queue.length);
          const arr = S.queue.splice(0, b);
          S.server = { arr, start: S.t, end: S.t + serviceTime(b), b };
        }
      }
      // --- history sample (queue length + a recent mean latency) ---
      const recent = S.lat.slice(-30);
      const ml = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
      S.hist.push({ q: S.queue.length, ml });
      if (S.hist.length > CW) S.hist.shift();
    }

    function computeStats() {
      const S = sim.current; const { lam, maxB } = cfg.current;
      const cap = maxB * 1000 / serviceTime(maxB);   // req/s at full batches
      const lat = S.lat.slice();
      const mlat = lat.length ? lat.reduce((s, v) => s + v, 0) / lat.length : 0;
      let p99 = 0; if (lat.length) { const s = lat.slice().sort((a, b) => a - b); p99 = s[Math.min(s.length - 1, Math.floor(s.length * 0.99))]; }
      // throughput estimate = min(arrival, capacity) once warm
      const thru = Math.min(lam, cap);
      return { thru, mlat, p99, q: S.queue.length, util: lam / cap, served: S.served, cap };
    }

    function draw() {
      const S = sim.current;
      ctx.fillStyle = "#05060f"; ctx.fillRect(0, 0, CW, CH);

      // ----- queue row -----
      ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText("QUEUE", 8, 16);
      const qn = S.queue.length, shown = Math.min(qn, 40);
      for (let i = 0; i < shown; i++) {
        const x = 8 + i * 8, y = 24;
        ctx.fillStyle = i < (cfg.current.maxB) ? "#60a5fa" : "rgba(96,165,250,0.4)";
        ctx.beginPath(); ctx.arc(x + 3, y + 3, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (qn > shown) { ctx.fillStyle = "rgba(148,163,184,0.8)"; ctx.fillText("+" + (qn - shown), 8 + shown * 8 + 2, 30); }

      // ----- server box -----
      const bx = 8, by = 46, bw = CW - 16, bh = 40;
      ctx.strokeStyle = "rgba(168,85,247,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.fillText("GPU (one batch at a time)", bx + 6, by - 4);
      if (S.server) {
        const frac = Math.max(0, Math.min(1, (S.t - S.server.start) / (S.server.end - S.server.start)));
        ctx.fillStyle = "rgba(168,85,247,0.25)"; ctx.fillRect(bx + 1, by + 1, (bw - 2) * frac, bh - 2);
        for (let i = 0; i < S.server.b; i++) {
          const x = bx + 8 + i * 9; ctx.fillStyle = "#a855f7";
          ctx.beginPath(); ctx.arc(x + 3, by + bh / 2, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#e9d5ff"; ctx.fillText("batch=" + S.server.b + "  " + Math.round(frac * 100) + "%", bx + bw - 96, by + bh / 2 + 3);
      } else {
        ctx.fillStyle = "rgba(148,163,184,0.5)"; ctx.fillText("idle", bx + 8, by + bh / 2 + 3);
      }

      // ----- history sparklines (queue length + mean latency) -----
      const gx = 8, gy = 104, gw = CW - 16, gh = CH - gy - 12;
      ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = "rgba(148,163,184,0.7)";
      ctx.fillText("history: queue length", gx + 4, gy + 12);
      ctx.fillStyle = "rgba(96,165,250,0.9)"; ctx.fillText("queue", gx + gw - 96, gy + 12);
      ctx.fillStyle = "rgba(168,85,247,0.9)"; ctx.fillText("latency", gx + gw - 50, gy + 12);
      const H = S.hist; if (H.length > 1) {
        let qmax = 1, lmax = 1;
        for (const h of H) { if (h.q > qmax) qmax = h.q; if (h.ml > lmax) lmax = h.ml; }
        // queue (blue)
        ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let i = 0; i < H.length; i++) {
          const x = gx + (i / (CW - 1)) * gw, y = gy + gh - (H[i].q / qmax) * (gh - 8);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        // latency (violet)
        ctx.strokeStyle = "#a855f7"; ctx.beginPath();
        for (let i = 0; i < H.length; i++) {
          const x = gx + (i / (CW - 1)) * gw, y = gy + gh - (H[i].ml / lmax) * (gh - 8);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }

    let uiAcc = 0;
    function frame(now) {
      let dt = now - lastNow; lastNow = now;
      if (dt > 100) dt = 100;            // clamp after tab-away
      step(dt);
      draw();
      uiAcc += dt;
      if (uiAcc > 120) { uiAcc = 0; setStats(computeStats()); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const overloaded = stats.util >= 1;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: overloaded ? "var(--violet-lt)" : "var(--muted)" }}>
        {overloaded ? "OVERLOADED — arrivals exceed capacity, queue grows without bound" : "INFERENCE SERVER — requests in, batches out"}
      </span>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 0.92 : 1.2), height: CH * (mobile ? 0.92 : 1.2), borderRadius: 4, border: "1px solid var(--border)", background: "#05060f" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>capacity at this batch size: {stats.cap ? stats.cap.toFixed(1) : "--"} req/s</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <DemoButton onClick={() => setRunning(r => !r)} tone="violet" primary>{running ? "PAUSE" : "PLAY"}</DemoButton>
      <DemoButton onClick={() => { resetSim(); setStats({ thru: 0, mlat: 0, p99: 0, q: 0, util: 0, served: 0 }); }} tone="blue">RESET</DemoButton>
      <Slider label="// ARRIVAL RATE" min={2} max={48} step={1} value={lam} onChange={setLam} suffix=" req/s" tone="blue"
        help="How fast requests arrive. The server's capacity is fixed by the batch settings — push arrivals above it and utilization passes 1, so the queue (and latency) grow without bound. This is the load knob." />
      <Slider label="// MAX BATCH SIZE" min={1} max={24} step={1} value={maxB} onChange={setMaxB} tone="violet"
        help="Most requests the GPU runs at once. A batch costs base + slope*size, so bigger batches amortize the fixed overhead -> more throughput (higher capacity), but each request waits for the batch to fill and run -> higher latency. The core tradeoff." />
      <Slider label="// BATCH WINDOW" min={0} max={150} step={5} value={winMs} onChange={setWinMs} suffix=" ms" tone="violet"
        help="How long the server waits to fill a batch before running a partial one. Longer windows form bigger batches under light load (more throughput) at the cost of added waiting latency; 0 = run whatever's queued immediately." />
      <StatReadout label="THROUGHPUT" value={stats.thru.toFixed(1) + " req/s"} accent="var(--blue-lt)" />
      <StatReadout label="MEAN LATENCY" value={Math.round(stats.mlat) + " ms"} accent="var(--violet-lt)" />
      <StatReadout label="P99 LATENCY" value={Math.round(stats.p99) + " ms"} accent="var(--violet-lt)" />
      <StatReadout label="UTILIZATION" value={(stats.util * 100).toFixed(0) + "%"} accent={overloaded ? "var(--violet-lt)" : "var(--blue-lt)"} />
      <Legend items={[{ label: "queue length", color: "#60a5fa" }, { label: "mean latency", color: "#a855f7" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A GPU is wildly more efficient running many inputs at once than one at a time:
        a batch costs roughly <b>a fixed overhead plus a small per-item cost</b>
        (base + slope·size here). So batching <b>amortizes the overhead</b> — double the
        batch and you barely raise the run time, which means more requests served per
        second. Raise <b>MAX BATCH SIZE</b> and watch the capacity readout (and
        throughput) climb.
      </DemoP>
      <DemoP>
        The catch is <b>latency</b>. Every request now waits for the batch to form (up
        to the <b>BATCH WINDOW</b>) and for the whole batch to finish, so the mean and
        especially the <b>p99 tail</b> grow as batches get bigger. And there's a hard
        wall: the server can only do <i>capacity</i> = batch ÷ batch-time requests per
        second. Push <b>ARRIVAL RATE</b> above it and <b>utilization</b> crosses 100% —
        now arrivals outpace departures, the queue grows every second, and latency runs
        away to infinity. That knee near 100% utilization is the single most important
        fact in serving.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Throughput-vs-latency under batching is the central tradeoff of model serving —
        it's exactly what Triton, vLLM, TensorFlow Serving, and every managed inference
        API tune for you, and continuous/in-flight batching for LLMs is a refinement of
        the same idea (swap finished sequences out of the batch mid-flight instead of
        waiting). It pairs naturally with
        <a href={`${window.__DM_BASE || "../../"}visualize/paged-attention/`}> PagedAttention</a>,
        which is what lets a server hold many concurrent sequences in memory so there's
        a big batch to form in the first place.
      </DemoP>
      <DemoP>
        The runaway-queue behavior past 100% utilization is plain queueing theory
        (Little's law: average queue = arrival rate × wait time), and it's why
        autoscaling and admission control exist — you add replicas or shed load to keep
        utilization off the knee. The same capacity-vs-load reasoning governs request
        routing and <a href={`${window.__DM_BASE || "../../"}visualize/drift-detection/`}>monitoring</a>:
        a deployed model is a queueing system first and a math function second.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Dynamic Batching"
      subtitle="Batch requests to amortize GPU overhead: throughput climbs and tail latency grows, and the queue runs away the instant arrivals outpace capacity. A live serving simulation."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BatchingDemo />);
