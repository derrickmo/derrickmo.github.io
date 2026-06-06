// demos/successor-representation.jsx — the Successor Representation (Dayan, 1993).
//
// The SR M(s,s') is the expected discounted number of future visits to s' when
// starting in s and following a policy. It factorizes value into DYNAMICS and
// REWARD:  V(s) = Σ_s' M(s,s') R(s').  Learn M once under the policy (TD on
// one-hot "reward" vectors), and when the reward moves you recompute V instantly
// as M·R — no relearning of the dynamics. That's the demo: a random-walk agent
// learns M; click the right grid to move the reward and watch V update at once
// while the successor map on the left is unchanged.
//   M(s,·) ← M(s,·) + α[ e_s + γ M(s',·) − M(s,·) ]
// Real TD-learned SR; V is the exact M·R.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const COLS = 7, ROWS = 7, CELL = 18;
const S = COLS * ROWS;
const GAP = 16, GX2 = COLS * CELL + GAP;
const CW = GX2 + COLS * CELL + 2, CH = ROWS * CELL + 30;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const WALLS = new Set(["2,2", "2,3", "4,3", "4,4", "3,5"]);
const isWall = (x, y) => WALLS.has(x + "," + y);
const idx = (x, y) => y * COLS + x;
const xy = i => [i % COLS, Math.floor(i / COLS)];

function SuccessorRepresentationDemo() {
  const cvRef = _useRef(null);
  const [gamma, setGamma] = _useState(0.92);
  const [lr, setLr] = _useState(0.25);
  const [speed, setSpeed] = _useState(50);
  const [running, setRunning] = _useState(true);
  const [steps, setSteps] = _useState(0);
  const [sel, setSel] = _useState(idx(0, 0));
  const [, force] = _useState(0);

  const gRef = _useRef(gamma), lRef = _useRef(lr), spRef = _useRef(speed);
  _useEffect(() => { gRef.current = gamma; }, [gamma]);
  _useEffect(() => { lRef.current = lr; }, [lr]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  const stRef = _useRef(null);
  function init() {
    const M = Array.from({ length: S }, () => new Float64Array(S));
    const R = new Float64Array(S); R[idx(COLS - 1, 0)] = 1; // default reward top-right
    let pos = idx(0, ROWS - 1);
    stRef.current = { M, R, pos, steps: 0 };
    setSteps(0);
  }

  function neighbors(p) {
    const [x, y] = xy(p); const out = [];
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !isWall(nx, ny)) out.push(idx(nx, ny)); }
    return out;
  }

  function trainStep() {
    const st = stRef.current, M = st.M, g = gRef.current, al = lRef.current;
    let s = st.pos;
    if (isWall(...xy(s))) s = idx(0, ROWS - 1);
    const nbrs = neighbors(s);
    const sp = nbrs.length ? nbrs[Math.floor(Math.random() * nbrs.length)] : s;
    const Ms = M[s], Msp = M[sp];
    for (let k = 0; k < S; k++) Ms[k] += al * ((k === s ? 1 : 0) + g * Msp[k] - Ms[k]);
    // occasional random restart for coverage
    st.pos = Math.random() < 0.03 ? randValid() : sp;
    st.steps++;
  }
  function randValid() { let p; do { p = Math.floor(Math.random() * S); } while (isWall(...xy(p))); return p; }

  function heat(ctx, ox, valFn, opts) {
    let mx = 1e-9; for (let i = 0; i < S; i++) if (!isWall(...xy(i))) mx = Math.max(mx, valFn(i));
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = idx(x, y), px = ox + x * CELL, py = 24 + y * CELL;
      if (isWall(x, y)) { ctx.fillStyle = "#334155"; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); continue; }
      const t = Math.max(0, valFn(i) / mx);
      ctx.fillStyle = `rgba(168,85,247,${0.06 + 0.85 * t})`;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      if (opts && opts.reward && stRef.current.R[i] > 0) { ctx.fillStyle = "rgba(52,211,153,0.85)"; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); ctx.fillStyle = "#06281c"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("R", px + CELL / 2, py + CELL / 2); }
    }
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const st = stRef.current; if (!st) return;
    ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("successor map M(s,·)  [click to pick s]", 0, 12);
    ctx.fillText("value V = M·R  [click to move reward]", GX2, 12);
    // left: SR of selected source
    heat(ctx, 0, i => st.M[sel][i], null);
    // mark selected source
    { const [sx, sy] = xy(sel); ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.strokeRect(sx * CELL + 1, 24 + sy * CELL + 1, CELL - 2, CELL - 2); }
    // agent
    { const [ax, ay] = xy(st.pos); ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(ax * CELL + CELL / 2, 24 + ay * CELL + CELL / 2, 4, 0, Math.PI * 2); ctx.fill(); }
    // right: V = M R
    heat(ctx, GX2, i => { let v = 0; const Mi = st.M[i], R = st.R; for (let k = 0; k < S; k++) v += Mi[k] * R[k]; return v; }, { reward: true });
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, []);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / Math.max(1, spRef.current);
      if (t - last > interval) { last = t; const burst = Math.max(1, Math.round(spRef.current / 6)); for (let i = 0; i < burst; i++) trainStep(); setSteps(stRef.current.steps); draw(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running]);

  _useEffect(() => { if (!running) draw(); /* eslint-disable-next-line */ }, [sel, running]);

  function onClick(e) {
    const cv = cvRef.current, rect = cv.getBoundingClientRect();
    const sx = CW / rect.width, sy = CH / rect.height;
    const px = (e.clientX - rect.left) * sx, py = (e.clientY - rect.top) * sy;
    const gy = Math.floor((py - 24) / CELL); if (gy < 0 || gy >= ROWS) return;
    if (px < COLS * CELL) { // left grid: pick source
      const gx = Math.floor(px / CELL); if (gx < 0 || gx >= COLS || isWall(gx, gy)) return;
      setSel(idx(gx, gy));
    } else if (px >= GX2) { // right grid: toggle reward
      const gx = Math.floor((px - GX2) / CELL); if (gx < 0 || gx >= COLS || isWall(gx, gy)) return;
      const i = idx(gx, gy); stRef.current.R[i] = stRef.current.R[i] > 0 ? 0 : 1; force(v => v + 1); draw();
    }
  }

  const reset = () => { init(); setTimeout(draw, 0); };
  const clearR = () => { stRef.current.R.fill(0); force(v => v + 1); draw(); };

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH} onClick={onClick}
        style={{ width: CW * 1.7, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530", cursor: "pointer" }} />
      <Legend items={[
        { label: "occupancy / value", color: "#a855f7" },
        { label: "reward R", color: "#34d399" },
        { label: "source s / agent", color: "#fbbf24" },
        { label: "wall", color: "#334155" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// DISCOUNT γ" min={0.7} max={0.98} step={0.01} value={gamma} onChange={setGamma} tone="violet"
        help="How far into the future the successor map looks. Higher γ spreads each state's expected future occupancy farther across the grid, so value reaches from more distant rewards. Changing γ relearns M." />
      <Slider label="// LEARNING RATE" min={0.05} max={0.5} step={0.05} value={lr} onChange={setLr}
        help="TD step size for the successor-feature update. The SR is learned exactly like a value function, but its 'reward' is the one-hot state-occupancy vector." />
      <Slider label="// SPEED" min={4} max={160} value={speed} onChange={setSpeed} suffix=" /s"
        help="Random-walk steps per second. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "LEARN M"}</DemoButton>
        <DemoButton onClick={clearR}>CLEAR R</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STEPS" value={steps} accent="var(--dim)" />
        <StatReadout label="γ" value={gamma.toFixed(2)} accent="var(--violet-lt)" />
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, lineHeight: 1.5 }}>
        Click the LEFT grid to choose the source state s and see its successor map. Click the RIGHT grid to move the reward — V = M·R updates instantly, M never changes.
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        The <b>successor representation</b> answers "starting here and following my
        policy, where will I spend my discounted future time?" That's the left grid —
        the successor map M(s,·) of the highlighted source state, learned by a
        random-walk agent with the very same TD update as value learning, but
        bootstrapping a one-hot occupancy vector instead of a reward.
      </DemoP>
      <DemoP>
        The payoff is the factorization <b>V(s) = Σ M(s,s') R(s')</b>. Dynamics
        (M) and reward (R) are stored separately, so when the goal moves you just
        re-multiply — <b>no relearning</b>. Click around the right grid to drop the
        reward somewhere new: the value map recomputes <i>instantly</i> as M·R while
        the successor map on the left doesn't budge. A model-free Q-learner would
        have to re-explore from scratch. Raise γ and each state's reach spreads
        farther, so value carries from more distant rewards.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The SR sits between model-free and model-based RL: like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gridworld-rl/`} style={{ color: "#a855f7" }}>Q-learning</a>{" "}
        it's learned by TD from experience, but like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/value-iteration/`} style={{ color: "#a855f7" }}>value
        iteration</a> it captures the environment's structure — so it transfers
        across tasks that share dynamics but differ in reward, exactly the fast
        re-evaluation you just saw, and the spirit of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dyna-q/`} style={{ color: "#a855f7" }}>Dyna-Q</a>.
      </DemoP>
      <DemoP>
        It has real neuroscience standing — successor-like predictive maps appear in
        hippocampal place and entorhinal grid cells — and the deep version,
        <b> successor features</b>, generalizes M from states to learned features for
        transfer across many reward functions. The matrix M is also just{" "}
        <i>(I − γP)⁻¹</i> for the policy's transition matrix P, the same discounted-
        occupancy object behind{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/markov/`} style={{ color: "#a855f7" }}>Markov
        chains</a> and PageRank.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Successor Representation"
      subtitle="Separate where you'll go from what you want. Learn the successor map once, then move the reward and value recomputes instantly as V = M·R — no relearning."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SuccessorRepresentationDemo />);
