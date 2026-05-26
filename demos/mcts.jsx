// demos/mcts.jsx — Monte-Carlo Tree Search, simulation by simulation.
// Real UCT, real rollouts. The "game" is a small toy: at each node you
// pick from 2-3 children; leaves at depth 4 have a random fixed value in
// [0, 1] sampled when the demo loads, and the rollout's "policy" is just
// to descend uniformly at random until it hits a leaf.
//
// Press STEP and watch the four MCTS phases play out on the tree:
//   1. SELECT  — descend by UCB1 from root to a non-fully-expanded node.
//   2. EXPAND  — add one new child of that node.
//   3. ROLLOUT — random rollout from the new child to a leaf.
//   4. BACKUP  — push the leaf value up to root, incrementing N + W on
//                every visited node.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 520, H = 380;
const C_UCB = 1.4;

// ── build a small game tree once (random branching factor 2 or 3, depth 4) ──
let nextId = 0;
function buildTree(depth, rng) {
  const id = nextId++;
  const node = { id, depth, children: [], parent: null, N: 0, Wt: 0, leafValue: null };
  if (depth === 0) {
    node.leafValue = +rng().toFixed(2);
    return node;
  }
  const branches = 2 + (rng() < 0.5 ? 0 : 1);
  for (let i = 0; i < branches; i++) {
    const c = buildTree(depth - 1, rng);
    c.parent = node;
    node.children.push(c);
  }
  return node;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Layout the tree on the canvas (top-down).
function layout(root) {
  const byDepth = {};
  function dfs(n) {
    if (!byDepth[n.depth]) byDepth[n.depth] = [];
    byDepth[n.depth].push(n);
    n.children.forEach(dfs);
  }
  dfs(root);
  const depthMax = Math.max(...Object.keys(byDepth).map(Number));
  const yStep = (H - 70) / (depthMax + 1);
  for (let d = 0; d <= depthMax; d++) {
    const row = byDepth[d] || [];
    row.forEach((n, i) => {
      n.x = ((i + 1) / (row.length + 1)) * W;
      n.y = 40 + (depthMax - d) * yStep;
    });
  }
  return { byDepth, depthMax };
}

function ucb(child, parentN) {
  if (child.N === 0) return Infinity;
  const q = child.Wt / child.N;
  return q + C_UCB * Math.sqrt(Math.log(parentN + 1) / child.N);
}

// One full MCTS iteration; returns a record of what happened.
function iterate(root) {
  // SELECT: from root, descend by UCB until we find a node with an unvisited
  // child (i.e. partly-expanded). We treat depth==0 leaves as terminal.
  const path = [];
  let node = root;
  while (node.depth > 0) {
    const unvisited = node.children.find(c => c.N === 0);
    if (unvisited) { path.push(node); node = unvisited; break; }
    // all children visited at least once — descend by UCB
    let best = node.children[0], bestU = -Infinity;
    for (const c of node.children) { const u = ucb(c, node.N); if (u > bestU) { bestU = u; best = c; } }
    path.push(node); node = best;
  }
  // node is the new "expanded" node (or a terminal leaf)
  const expandedId = node.id;
  // ROLLOUT
  let cur = node;
  const rollPath = [cur.id];
  while (cur.depth > 0) {
    cur = cur.children[Math.floor(Math.random() * cur.children.length)];
    rollPath.push(cur.id);
  }
  const value = cur.leafValue;
  // BACKUP
  const backed = [];
  let walker = node;
  while (walker) { walker.N += 1; walker.Wt += value; backed.push(walker.id); walker = walker.parent; }
  return { selectIds: path.map(p => p.id), expandedId, rolloutIds: rollPath, value, backedIds: backed };
}

function MCTSDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const treeRef = _useRef(null);
  const [seed, setSeed] = _useState(7);
  const [, setVer] = _useState(0);
  const [lastIter, setLastIter] = _useState(null);
  const [iters, setIters] = _useState(0);

  function reset(s = seed) {
    nextId = 0;
    treeRef.current = buildTree(4, mulberry32(s));
    layout(treeRef.current);
    setIters(0); setLastIter(null); setVer(v => v + 1);
  }

  function step(n = 1) {
    let last = null;
    for (let i = 0; i < n; i++) last = iterate(treeRef.current);
    setLastIter(last); setIters(it => it + n); setVer(v => v + 1);
  }

  _useEffect(() => { reset(seed); /* eslint-disable-next-line */ }, [seed]);
  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ });

  function draw() {
    const cv = canvasRef.current; if (!cv || !treeRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const root = treeRef.current;
    const selectSet = new Set(lastIter ? lastIter.selectIds : []);
    const rolloutSet = new Set(lastIter ? lastIter.rolloutIds : []);
    const backedSet = new Set(lastIter ? lastIter.backedIds : []);
    const expandId = lastIter ? lastIter.expandedId : -1;

    // edges first
    function drawEdges(n) {
      for (const c of n.children) {
        const onSelect = selectSet.has(n.id) && (selectSet.has(c.id) || c.id === expandId);
        const onRoll = rolloutSet.has(n.id) && rolloutSet.has(c.id);
        ctx.strokeStyle = onSelect ? "#fbbf24" : onRoll ? "#34d399" : "rgba(148,163,184,0.25)";
        ctx.lineWidth = onSelect || onRoll ? 2.2 : 1;
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(c.x, c.y); ctx.stroke();
        drawEdges(c);
      }
    }
    drawEdges(root);

    // nodes
    function drawNodes(n) {
      const isLeaf = n.depth === 0;
      const isBackup = backedSet.has(n.id);
      const isExpand = n.id === expandId;
      const isSelect = selectSet.has(n.id);
      let stroke = "rgba(148,163,184,0.5)";
      if (isExpand) stroke = "#c084fc";
      else if (isBackup) stroke = "#60a5fa";
      else if (isSelect) stroke = "#fbbf24";
      const r = isLeaf ? 9 : 12;
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,42,0.7)"; ctx.strokeStyle = stroke; ctx.lineWidth = 1.6;
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(224,231,255,0.92)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      if (isLeaf) {
        ctx.fillStyle = "#34d399"; ctx.fillText(n.leafValue.toFixed(2), n.x - 11, n.y + 3);
      } else {
        ctx.fillText(`${n.N}`, n.x - 5, n.y - 1);
        if (n.N > 0) { ctx.fillStyle = "#fbbf24"; ctx.fillText((n.Wt / n.N).toFixed(2), n.x - 12, n.y + 10); }
      }
      for (const c of n.children) drawNodes(c);
    }
    drawNodes(root);
  }

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const phaseTxt = lastIter
    ? `Selected ${lastIter.selectIds.length} → Expanded #${lastIter.expandedId} → Rollout ${lastIter.rolloutIds.length} steps → Value ${lastIter.value.toFixed(2)} → Backed up to ${lastIter.backedIds.length} nodes`
    : "Press STEP to run one MCTS iteration.";
  const controls = (
    <ControlGroup>
      <Slider label="// SEED" min={1} max={32} step={1} value={seed} onChange={setSeed}
        help="Resamples the tree's branching and the leaf values. Different seeds mean different best lines for MCTS to find." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DemoButton onClick={() => step(1)} primary>STEP 1</DemoButton>
        <DemoButton onClick={() => step(10)}>STEP 10</DemoButton>
        <DemoButton onClick={() => step(100)}>STEP 100</DemoButton>
        <DemoButton onClick={() => reset()}>RESET</DemoButton>
      </div>
      <div style={{
        padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 6,
        background: "rgba(13,24,52,0.4)",
      }}>
        <div className="t-mono-s" style={{ color: "var(--blue-lt)", fontSize: 10 }}>LAST ITERATION</div>
        <div className="t-mono" style={{ color: "var(--white)", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>{phaseTxt}</div>
      </div>
      <StatReadout label="TOTAL ITERATIONS" value={iters} />
      <Legend items={[
        { color: "#fbbf24", label: "SELECT path (UCB descent)" },
        { color: "#c084fc", label: "EXPAND (new node)" },
        { color: "#34d399", label: "ROLLOUT to a leaf" },
        { color: "#60a5fa", label: "BACKUP (N, value)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Monte-Carlo Tree Search asks four questions on every iteration. <b style={{ color: "#fbbf24" }}>Select</b>: from
        the root, follow the child with the highest UCB1 score (a mix of "my
        average value here" and "but I haven't visited this branch much") until
        I find a node I haven't fully expanded. <b style={{ color: "#c084fc" }}>Expand</b>: add one new child of that
        node. <b style={{ color: "#34d399" }}>Rollout</b>: simulate the rest of
        the game from there — here, a random walk to a leaf. <b style={{ color: "#60a5fa" }}>Backup</b>: the value at
        the leaf is pushed back up the path you traversed; every node along the
        way bumps its visit count N and its win total W.
      </DemoP>
      <DemoP>
        Watch what happens as you step. Early on the tree is shallow and the
        algorithm explores broadly. As N grows, UCB sharpens — the search
        starts spending all its time refining the apparently-best line. The
        per-node readouts show <b>N</b> on top and the average value <b>W/N</b>
        below. Hit STEP 100 a few times and the visit counts down the
        principal variation should be much larger than everywhere else.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the search that powered <b>AlphaGo</b> (and, scaled with a
        learned policy/value net, <b>AlphaZero</b> and <b>MuZero</b>). It's
        also the engine behind every strong Go program of the modern era,
        a key building block in robotics planning, and the basis for the
        "tree of thoughts" prompting pattern in LLMs (treat a partial
        reasoning trace as a tree node, expand and backup as you go).
      </DemoP>
      <DemoP>
        The deep idea is the exploration-vs-exploitation balance baked into
        UCB1 — the same idea you saw in the multi-armed bandit demo, now
        applied recursively to a tree. Anytime you can simulate forward
        cheaply, and you want anytime search that improves with more time,
        MCTS is a strong starting point.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="MCTS Tree Search"
      subtitle="Monte-Carlo Tree Search, iteration by iteration — select, expand, rollout, backup."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MCTSDemo />);
