// games/self-driving.jsx — a population of cars with ray sensors evolves to drive
// a track. Real neuroevolution: each car is a small NN (5 sensors -> 6 -> 1 steer),
// selection/crossover/mutation between generations. Fitness = distance around the loop.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 440, CX = W / 2, CY = W / 2;
const RXO = 195, RYO = 150, RXI = 95, RYI = 62;       // outer / inner ellipse radii
const SPEED = 2.1, TURN = 0.10, RANGE = 220, POP = 40, MAXF = 2400;
const I = 5, NH = 6;
const SENS = [-Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6, Math.PI / 3];

const rand = Math.random;
const randn = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const newBrain = () => ({ w1: Array.from({ length: NH * I }, randn), b1: Array.from({ length: NH }, randn), w2: Array.from({ length: NH }, randn), b2: randn() });
function think(b, x) { let o = b.b2; for (let j = 0; j < NH; j++) { let s = b.b1[j]; for (let i = 0; i < I; i++) s += b.w1[j * I + i] * x[i]; o += b.w2[j] * Math.tanh(s); } return Math.tanh(o); }
function crossover(a, b) { const c = { w1: [], b1: [], w2: [], b2: rand() < 0.5 ? a.b2 : b.b2 }; for (const k of ["w1", "b1", "w2"]) for (let i = 0; i < a[k].length; i++) c[k][i] = rand() < 0.5 ? a[k][i] : b[k][i]; return c; }
function mutate(b, rate) { for (const k of ["w1", "b1", "w2"]) for (let i = 0; i < b[k].length; i++) if (rand() < rate) b[k][i] += randn() * 0.5; if (rand() < rate) b.b2 += randn() * 0.5; return b; }
const cloneB = (b) => ({ w1: b.w1.slice(), b1: b.b1.slice(), w2: b.w2.slice(), b2: b.b2 });

const onTrack = (x, y) => { const ox = x - CX, oy = y - CY; const outside = (ox * ox) / (RXO * RXO) + (oy * oy) / (RYO * RYO) > 1; const inside = (ox * ox) / (RXI * RXI) + (oy * oy) / (RYI * RYI) < 1; return !outside && !inside; };
function rayEllipse(ox, oy, dx, dy, rx, ry) {
  const a = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  const b = 2 * ((ox * dx) / (rx * rx) + (oy * dy) / (ry * ry));
  const c = (ox * ox) / (rx * rx) + (oy * oy) / (ry * ry) - 1;
  const disc = b * b - 4 * a * c; if (disc < 0) return Infinity;
  const sq = Math.sqrt(disc); let t = Infinity;
  for (const r of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) if (r > 1e-6) t = Math.min(t, r);
  return t;
}
function sense(x, y, ang) { const ox = x - CX, oy = y - CY, dx = Math.cos(ang), dy = Math.sin(ang); return Math.min(RANGE, rayEllipse(ox, oy, dx, dy, RXO, RYO), rayEllipse(ox, oy, dx, dy, RXI, RYI)) / RANGE; }

function SelfDrivingDemo() {
  const canvasRef = _useRef(null), dprRef = _useRef(1);
  const carsRef = _useRef([]), genRef = _useRef(1), bestRef = _useRef(0), histRef = _useRef([]), champRef = _useRef(null);
  const rafRef = _useRef(0), runningRef = _useRef(false), stepsRef = _useRef(1), rateRef = _useRef(0.1), frameRef = _useRef(0);
  const [running, setRunning] = _useState(false);
  const [speed, setSpeed] = _useState(1);
  const [rate, setRate] = _useState(0.1);
  const [stats, setStats] = _useState({ gen: 1, alive: POP, laps: 0, best: 0 });

  const startR = (RXO + RXI) / 2;
  function makeCar(brain) { return { x: CX + startR, y: CY, ang: Math.PI / 2, alive: true, fit: 0, prevA: 0, frames: 0, brain }; }
  function startPop(brains) { carsRef.current = brains.map(makeCar); }
  function initGen() { startPop(Array.from({ length: POP }, newBrain)); genRef.current = 1; bestRef.current = 0; histRef.current = []; }

  function nextGen() {
    const cars = carsRef.current.slice().sort((a, b) => b.fit - a.fit);
    bestRef.current = Math.max(bestRef.current, cars[0].fit);
    champRef.current = cloneB(cars[0].brain);
    histRef.current.push(cars[0].fit / (2 * Math.PI)); if (histRef.current.length > 40) histRef.current.shift();
    const total = cars.reduce((s, c) => s + Math.max(0, c.fit), 0) || 1;
    const pick = () => { let r = rand() * total; for (const c of cars) { r -= Math.max(0, c.fit); if (r <= 0) return c; } return cars[0]; };
    const next = [cloneB(cars[0].brain)]; if (cars[1]) next.push(cloneB(cars[1].brain));
    while (next.length < POP) next.push(mutate(crossover(pick().brain, pick().brain), rateRef.current));
    startPop(next); genRef.current += 1;
  }
  function step() {
    let alive = 0;
    for (const car of carsRef.current) {
      if (!car.alive) continue;
      const inputs = SENS.map(s => sense(car.x, car.y, car.ang + s));
      car.ang += think(car.brain, inputs) * TURN;
      car.x += Math.cos(car.ang) * SPEED; car.y += Math.sin(car.ang) * SPEED;
      car.frames++;
      if (!onTrack(car.x, car.y) || car.frames > MAXF) { car.alive = false; continue; }
      const a = Math.atan2(car.y - CY, car.x - CX);
      let d = a - car.prevA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      car.fit += d; car.prevA = a; alive++;
    }
    if (alive === 0) nextGen();
  }
  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0); ctx.clearRect(0, 0, W, W);
    // track
    ctx.fillStyle = "rgba(96,165,250,0.08)"; ctx.beginPath(); ctx.ellipse(CX, CY, RXO, RYO, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#050816"; ctx.beginPath(); ctx.ellipse(CX, CY, RXI, RYI, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(96,165,250,0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(CX, CY, RXO, RYO, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(CX, CY, RXI, RYI, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(52,211,153,0.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CX + RXI, CY); ctx.lineTo(CX + RXO, CY); ctx.stroke(); // start/finish
    const cars = carsRef.current;
    const lead = cars.filter(c => c.alive).sort((a, b) => b.fit - a.fit)[0];
    for (const car of cars) {
      if (!car.alive) continue;
      ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.ang);
      ctx.fillStyle = car === lead ? "#fbbf24" : "rgba(192,132,252,0.6)";
      ctx.fillRect(-5, -3, 10, 6); ctx.restore();
    }
    if (lead) { for (const s of SENS) { const a = lead.ang + s, dlen = sense(lead.x, lead.y, a) * RANGE; ctx.strokeStyle = "rgba(251,191,36,0.25)"; ctx.beginPath(); ctx.moveTo(lead.x, lead.y); ctx.lineTo(lead.x + Math.cos(a) * dlen, lead.y + Math.sin(a) * dlen); ctx.stroke(); } }
    if (histRef.current.length > 1) {
      const mx = Math.max(0.5, ...histRef.current);
      ctx.strokeStyle = "rgba(52,211,153,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath();
      histRef.current.forEach((v, i) => { const X = W - 100 + i * (90 / 40), Y = 30 - v / mx * 22; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
      ctx.fillStyle = "#475569"; ctx.font = "8px JetBrains Mono, monospace"; ctx.fillText("BEST LAPS / GEN", W - 100, 40);
    }
  }
  function pushStats() {
    const alive = carsRef.current.filter(c => c.alive).length;
    const bestNow = carsRef.current.reduce((s, c) => Math.max(s, c.fit), 0);
    setStats({ gen: genRef.current, alive, laps: (bestNow / (2 * Math.PI)).toFixed(2), best: (bestRef.current / (2 * Math.PI)).toFixed(2) });
  }
  function loop() { if (!runningRef.current) return; for (let i = 0; i < stepsRef.current; i++) step(); draw(); if (++frameRef.current % 5 === 0) pushStats(); rafRef.current = requestAnimationFrame(loop); }
  function start() { if (runningRef.current) return; runningRef.current = true; setRunning(true); loop(); }
  function stop() { runningRef.current = false; setRunning(false); cancelAnimationFrame(rafRef.current); }
  function reset() { stop(); initGen(); draw(); pushStats(); start(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = W * dpr; cv.style.width = W + "px"; cv.style.height = W + "px";
    initGen(); draw(); start();
    return () => stop();
  }, []);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SPEED" value={String(speed)} onChange={v => { const n = parseInt(v); setSpeed(n); stepsRef.current = n; }}
        options={[{ value: "1", label: "1x" }, { value: "3", label: "3x" }, { value: "6", label: "6x" }]} />
      <Slider label="// MUTATION RATE" min={0.01} max={0.4} step={0.01} value={rate} onChange={v => { setRate(v); rateRef.current = v; }} tone="violet" />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => (running ? stop() : start())} primary tone="violet">{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="GENERATION" value={stats.gen} accent="var(--violet-lt)" />
        <StatReadout label="ALIVE" value={stats.alive} />
        <StatReadout label="BEST LAPS (now)" value={stats.laps} accent="#fbbf24" />
        <StatReadout label="BEST EVER" value={stats.best} accent="#34d399" />
      </div>
      <Legend items={[{ color: "#c084fc", label: "CARS (NN)" }, { color: "#fbbf24", label: "LEADER + SENSORS" }, { color: "#34d399", label: "START LINE" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Each car sees only 5 distance rays. No driving rules — just survive longer and go further to reproduce.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Each car is blind except for <b>five distance sensors</b> (the leader's rays are
        drawn) feeding a tiny neural network that outputs one number: how hard to steer.
        The first generation is random and piles into the walls immediately. But the
        cars that happen to steer away from walls travel further around the loop, and
        <b> distance travelled is their fitness</b> — so they become the parents of the
        next generation via <b>crossover</b> and <b>mutation</b>.
      </DemoP>
      <DemoP>
        This is <b>neuroevolution</b> again, but now with continuous control and real
        sensor input — the same setup researchers use to evolve robot and vehicle
        controllers when there's no labelled "correct steering" to learn from. Watch the
        <span style={{ color: "#34d399" }}> best-laps</span> curve climb as the
        population goes from crashing instantly to smoothly carving the whole circuit.
        Bump the speed to fast-forward the generations.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="NEUROEVOLUTION · CONTROL" title="Evolving Drivers"
      subtitle="Cars with five sensors and a tiny neural net evolve to take the track — no rules, just survival of the furthest."
      stage={stage} controls={controls} explainer={explainer}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SelfDrivingDemo />);
