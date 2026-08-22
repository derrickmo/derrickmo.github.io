// demos/simulated-annealing.jsx — simulated annealing on the Traveling
// Salesman Problem. Random cities, a "2-opt" move (reverse a random
// segment), Metropolis acceptance with a cooling temperature.
// Real algorithm; watch a tangle of crossings untie itself into a tour.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, SegmentedControl, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 380;

function genCities(n, seed) {
  let a = seed >>> 0;
  const rng = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([40 + rng() * (W - 80), 40 + rng() * (H - 80)]);
  return pts;
}
function tourLen(tour, cities) {
  let L = 0;
  for (let i = 0; i < tour.length; i++) {
    const a = cities[tour[i]], b = cities[tour[(i + 1) % tour.length]];
    const dx = a[0] - b[0], dy = a[1] - b[1]; L += Math.sqrt(dx * dx + dy * dy);
  }
  return L;
}
function twoOpt(tour) {
  const n = tour.length;
  const i = Math.floor(Math.random() * n);
  const k = Math.floor(Math.random() * n);
  if (i === k) return null;
  const lo = Math.min(i, k), hi = Math.max(i, k);
  const next = tour.slice();
  let a = lo, b = hi;
  while (a < b) { const t = next[a]; next[a] = next[b]; next[b] = t; a++; b--; }
  return next;
}

function SADemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const citiesRef = _useRef([]);
  const tourRef = _useRef([]);
  const bestRef = _useRef({ tour: [], len: Infinity });
  const lossesRef = _useRef([]);
  const [n, setN] = _useState(40);
  const [seed, setSeed] = _useState(3);
  const [T, setT] = _useState(60);     // current temperature
  const T0 = 80, alpha = 0.9985;
  const [running, setRunning] = _useState(false);
  const [steps, setSteps] = _useState(0);
  const [, setVer] = _useState(0);

  function reset() {
    citiesRef.current = genCities(n, seed);
    const init = Array.from({ length: n }, (_, i) => i);
    tourRef.current = init;
    bestRef.current = { tour: init.slice(), len: tourLen(init, citiesRef.current) };
    lossesRef.current = [bestRef.current.len];
    setT(T0); setSteps(0); setRunning(false); setVer(v => v + 1);
  }

  function iterate(K = 1) {
    let curLen = tourLen(tourRef.current, citiesRef.current);
    let curT = T;
    for (let k = 0; k < K; k++) {
      const cand = twoOpt(tourRef.current); if (!cand) continue;
      const candLen = tourLen(cand, citiesRef.current);
      const dE = candLen - curLen;
      if (dE < 0 || Math.random() < Math.exp(-dE / Math.max(curT, 1e-3))) {
        tourRef.current = cand; curLen = candLen;
        if (curLen < bestRef.current.len) bestRef.current = { tour: cand.slice(), len: curLen };
      }
      curT *= alpha;
    }
    setT(curT); setSteps(s => s + K);
    lossesRef.current.push(curLen);
    if (lossesRef.current.length > 240) lossesRef.current.shift();
    setVer(v => v + 1);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cities = citiesRef.current, tour = tourRef.current;
    if (!cities.length) return;

    // best tour faint behind
    const best = bestRef.current.tour;
    if (best.length) {
      ctx.strokeStyle = "rgba(96,165,250,0.30)"; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < best.length; i++) {
        const c = cities[best[i]];
        if (i === 0) ctx.moveTo(c[0], c[1]); else ctx.lineTo(c[0], c[1]);
      }
      ctx.closePath(); ctx.stroke();
    }
    // current tour
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < tour.length; i++) {
      const c = cities[tour[i]];
      if (i === 0) ctx.moveTo(c[0], c[1]); else ctx.lineTo(c[0], c[1]);
    }
    ctx.closePath(); ctx.stroke();
    // cities
    for (const [x, y] of cities) {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#e0e7ff"; ctx.fill();
    }

    // loss strip
    const baseY = H - 60, h = 40;
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.beginPath(); ctx.moveTo(20, baseY); ctx.lineTo(W - 20, baseY); ctx.stroke();
    ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("tour length", 24, baseY - 4);
    const arr = lossesRef.current;
    if (arr.length > 1) {
      const max = Math.max(...arr), min = Math.min(...arr);
      ctx.beginPath();
      arr.forEach((v, i) => {
        const x = 20 + ((W - 40) * i) / (arr.length - 1);
        const y = baseY + h - ((v - min) / (max - min + 1e-9)) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.4; ctx.stroke();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset();
  }, []);
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [n, seed]);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ });
  _useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    const loop = () => { iterate(60); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, T]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CITIES" min={15} max={80} step={1} value={n} onChange={setN}
        help="Number of cities. TSP is NP-hard, but simulated annealing handles dozens of cities in seconds." />
      <Slider label="// SEED" min={1} max={32} step={1} value={seed} onChange={setSeed}
        help="Resamples the city positions. Worth trying a few — some layouts are much harder than others." />
      <Slider label="// TEMPERATURE" min={0} max={T0} step={0.1} value={T} onChange={() => {}} tone="violet"
        help="Read-only — the current temperature. Hot = accept some uphill moves (escape local minima); cold = only accept improvements (zero in)." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DemoButton onClick={() => iterate(1)}>STEP 1</DemoButton>
        <DemoButton onClick={() => iterate(500)}>STEP 500</DemoButton>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STEPS" value={steps} />
        <StatReadout label="BEST LENGTH" value={bestRef.current.len.toFixed(0)} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#c084fc", label: "CURRENT TOUR" },
        { color: "#60a5fa", label: "BEST SO FAR" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The Traveling Salesman Problem is NP-hard, but simulated annealing
        finds near-optimal tours surprisingly fast. The move is <b>2-opt</b>:
        pick two edges, reverse the segment between them, see if the new tour
        is shorter. The trick is what to do when it's <i>longer</i> — accept
        it anyway, with probability e<sup>-ΔE/T</sup>. At a high
        <b style={{ color: "#fbbf24" }}> temperature</b> the search jumps
        around freely, willing to take ugly intermediate states to escape
        local minima. As T cools, only improvements survive — the tour
        crystallizes.
      </DemoP>
      <DemoP>
        Hit RUN and watch the violet tour stop crossing itself. The faint
        blue tour is the best one seen so far. The strip at the bottom is
        the current length over time — it ratchets down, with occasional
        bumps where SA accepted a worse move. The schedule here is geometric
        (T ← 0.9985·T) which is the classic recipe.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Simulated annealing is the most general-purpose metaheuristic ever
        invented — wherever you have a discrete or continuous combinatorial
        search and a way to perturb a candidate solution, SA gives you a
        sensible baseline. VLSI layout, hyperparameter search, scheduling,
        protein folding, the original IBM TSP solver: all variations on this
        same pattern. The Metropolis acceptance rule comes straight from
        statistical mechanics — annealing a metal slowly so its atoms settle
        into a low-energy configuration.
      </DemoP>
      <DemoP>
        It's also a useful contrast to gradient descent. SA needs no
        gradients, handles non-smooth landscapes, and provably converges to
        the global optimum (with the right schedule, very slowly). When you
        meet a problem where the loss isn't differentiable — discrete
        choices, combinatorial structure, expensive simulators — reach for
        SA, evolutionary strategies, or Bayesian optimization, not Adam.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Simulated Annealing"
      subtitle="Watch a tangled traveling-salesman tour cool into a clean one — Metropolis acceptance with a falling temperature."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SADemo />);
