// demos/branch-and-bound.jsx — branch-and-bound on the 0/1 knapsack.
//
// Brute force tries all 2^n subsets. Branch-and-bound explores the same binary
// decision tree (include / exclude each item) but PRUNES whole subtrees it can
// prove are hopeless. At each node it computes an optimistic upper bound via the
// fractional (LP) relaxation: greedily fill the remaining capacity with the
// best value-per-weight items, taking a fraction of the last. If that bound
// can't beat the best complete solution found so far (the incumbent), the
// subtree is discarded unopened. Toggle BOUNDING off to watch the tree explode
// back to brute force.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 480;

function BranchAndBoundDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [n, setN] = _useState(7);
  const [capPct, setCapPct] = _useState(0.5);
  const [bounding, setBounding] = _useState(true);
  const [speed, setSpeed] = _useState(6);
  const [seed, setSeed] = _useState(1);
  const [frame, setFrame] = _useState(0);
  const traceRef = _useRef({ nodes: [], layout: {}, edges: [], stats: {}, items: [], cap: 0 });

  // build the B&B trace deterministically from (n, capPct, bounding, seed)
  function build() {
    // seeded RNG
    let s = seed * 2654435761 >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const items = Array.from({ length: n }, () => {
      const w = 1 + Math.floor(rnd() * 9);
      const v = 1 + Math.floor(rnd() * 9);
      return { v, w, r: v / w };
    }).sort((a, b) => b.r - a.r); // sort by value/weight for the bound
    const totalW = items.reduce((s, it) => s + it.w, 0);
    const cap = Math.max(items[0].w, Math.round(totalW * capPct));

    const nodes = []; // {id, depth, bound, status, v, w}
    const edges = []; // [parentId, childId]
    let best = 0, bestNodeId = null, pruned = 0;

    // optimistic bound: take whole items by ratio, fraction of the last
    function ub(i, curV, curW) {
      let b = curV, rem = cap - curW;
      for (let j = i; j < n; j++) {
        if (items[j].w <= rem) { b += items[j].v; rem -= items[j].w; }
        else { b += items[j].v * (rem / items[j].w); break; }
      }
      return b;
    }
    function rec(i, curV, curW, path, parent) {
      const id = path || "root";
      const bound = ub(i, curV, curW);
      const node = { id, depth: path.length, bound, v: curV, w: curW, status: "branch" };
      nodes.push(node);
      if (parent !== null) edges.push([parent, id]);
      // prune: optimistic bound can't beat incumbent
      if (bounding && bound <= best + 1e-9 && i > 0) { node.status = "pruned"; pruned++; return; }
      if (i === n) {
        node.status = "leaf";
        if (curV > best) { best = curV; bestNodeId = id; node.status = "incumbent"; }
        return;
      }
      // branch: include item i first (if it fits), then exclude
      if (curW + items[i].w <= cap) rec(i + 1, curV + items[i].v, curW + items[i].w, path + "1", id);
      rec(i + 1, curV, curW, path + "0", id);
    }
    rec(0, 0, 0, "", null);

    // mark the incumbent path green even if later overwritten — recolor final best
    nodes.forEach(nd => { if (nd.id === bestNodeId) nd.status = "incumbent"; });

    // layout: x by visited-leaf order, internal = mean of children, y by depth
    const childMap = {};
    edges.forEach(([p, c]) => { (childMap[p] = childMap[p] || []).push(c); });
    const layout = {};
    let leafX = 0;
    (function place(id) {
      const kids = childMap[id] || [];
      if (!kids.length) { layout[id] = { x: leafX++, depth: nodes.find(nd => nd.id === id).depth }; return layout[id]; }
      let sum = 0; kids.forEach(k => { sum += place(k).x; });
      layout[id] = { x: sum / kids.length, depth: nodes.find(nd => nd.id === id).depth };
      return layout[id];
    })("root");
    const maxX = Math.max(leafX - 1, 1);
    const stats = {
      visited: nodes.length, pruned, best,
      brute: Math.pow(2, n),
      saved: Math.round((1 - nodes.length / Math.max(1, Math.pow(2, n + 1) - 1)) * 100),
    };
    traceRef.current = { nodes, layout, edges, stats, items, cap, maxX };
  }
  _useEffect(() => { build(); setFrame(0); /* eslint-disable-next-line */ }, [n, capPct, bounding, seed]);

  // animate reveal
  _useEffect(() => {
    const total = traceRef.current.nodes.length;
      // A11Y-0002: this loop starts on its own and never stops, so under reduced
      // motion we jump to the end. The loop only reveals the trace one node at a
      // time, so the final frame is the whole explored tree.
    if (window.__DM_REDUCED_MOTION) { setFrame(total); return; }
    let last = performance.now();
    const tick = (now) => {
      if (now - last > 240 / speed) {
        last = now;
        setFrame(f => (f < total ? f + 1 : f));
      }
      if (traceRef.current.nodes.length && frameLessThan()) rafRef.current = requestAnimationFrame(tick);
    };
    function frameLessThan() { return true; }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [speed, n, capPct, bounding, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    const { nodes, layout, edges, stats, maxX } = traceRef.current;
    if (!nodes.length) return;
    const pad = 28, topY = 44;
    const PX = (x) => pad + (x / (maxX || 1)) * (W - 2 * pad);
    const dy = Math.min(56, (H - topY - 40) / (n + 1));
    const PY = (d) => topY + d * dy;

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("DECISION TREE  ·  ↙ include item   ↘ exclude   (greyed = not yet visited)", pad, 22);

    const shown = frame;
    const idIndex = {}; nodes.forEach((nd, i) => idIndex[nd.id] = i);

    // edges first
    ctx.lineWidth = 1.4;
    edges.forEach(([p, c]) => {
      const ip = idIndex[p], ic = idIndex[c];
      const vis = ic < shown;
      const a = layout[p], b = layout[c];
      ctx.strokeStyle = vis ? "rgba(148,163,184,0.5)" : "rgba(148,163,184,0.08)";
      ctx.beginPath(); ctx.moveTo(PX(a.x), PY(a.depth)); ctx.lineTo(PX(b.x), PY(b.depth)); ctx.stroke();
    });

    // nodes
    nodes.forEach((nd, i) => {
      const vis = i < shown, p = layout[nd.id];
      const x = PX(p.x), y = PY(p.depth);
      let col = "rgba(96,165,250,0.85)"; // branch
      if (nd.status === "pruned") col = "#f87171";
      else if (nd.status === "incumbent") col = "#34d399";
      else if (nd.status === "leaf") col = "rgba(148,163,184,0.7)";
      ctx.fillStyle = vis ? col : "rgba(148,163,184,0.10)";
      ctx.beginPath(); ctx.arc(x, y, nd.status === "pruned" ? 5 : 4, 0, 7); ctx.fill();
      if (vis && nd.status === "pruned") {
        ctx.strokeStyle = "#f87171"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x - 6, y + 9); ctx.lineTo(x + 6, y + 9); ctx.stroke(); // cut bar
      }
    });

    // stat banner
    ctx.font = "11px JetBrains Mono";
    ctx.fillStyle = "#60a5fa"; ctx.fillText("visited " + Math.min(shown, nodes.length) + " / " + nodes.length + " nodes", pad, H - 28);
    ctx.fillStyle = "#f87171"; ctx.fillText("pruned " + stats.pruned, pad + 200, H - 28);
    ctx.fillStyle = "#34d399"; ctx.fillText("best value " + stats.best.toFixed(0), pad + 300, H - 28);
    ctx.fillStyle = "#94a3b8"; ctx.fillText("brute force would open up to 2^" + n + " = " + stats.brute + " leaves", pad, H - 12);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const { stats } = traceRef.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Toggle label="// BOUNDING (prune)" checked={bounding} onChange={setBounding}
        help="On: discard a subtree the moment its optimistic LP bound can't beat the best solution found. Off: explore every branch — pure brute force. Flip it to see the pruned (red) nodes vanish and the tree balloon." />
      <Slider label="// ITEMS (n)" min={3} max={9} step={1} value={n} onChange={setN}
        help="Number of items. Brute force is 2^n leaves; branch-and-bound visits far fewer when bounding is on. Larger n makes the savings dramatic." />
      <Slider label="// CAPACITY" min={0.2} max={0.9} step={0.05} value={capPct} onChange={setCapPct}
        help="Knapsack capacity as a fraction of total item weight. Tight or loose capacities prune differently — mid-range tends to be the hardest." />
      <Slider label="// SPEED" min={1} max={20} step={1} value={speed} onChange={setSpeed}
        help="Animation speed of the depth-first node reveal. Purely visual; doesn't change the search." />
      <DemoButton onClick={() => setFrame(0)}>REPLAY</DemoButton>
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>NEW ITEMS</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="NODES VISITED" value={stats ? stats.visited : 0} accent="#60a5fa" />
        <StatReadout label="PRUNED" value={stats ? stats.pruned : 0} accent="#f87171" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="BEST VALUE" value={stats ? stats.best.toFixed(0) : 0} accent="#34d399" />
        <StatReadout label="VS 2^n LEAVES" value={stats ? stats.brute : 0} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "branch" },
        { color: "#34d399", label: "best (incumbent)" },
        { color: "#f87171", label: "pruned subtree" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The tree is every yes/no decision: include this item, or don't. Brute force
        walks all 2ⁿ leaves. Branch-and-bound walks the same tree but carries two
        numbers: the best complete solution found so far (the incumbent), and at each
        node an <i>optimistic</i> upper bound — the most value this subtree could
        possibly reach, computed by letting the knapsack take fractional items. If
        that optimistic bound can't even tie the incumbent, the whole subtree is
        hopeless and gets cut (the red nodes with a bar). The answer is still exact;
        we just never opened branches we could prove were dead.
      </DemoP>
      <DemoP>
        Toggle BOUNDING off and the red prunes disappear — the tree fills out to the
        full brute-force shape. Turn it back on and watch how a good incumbent found
        early (depth-first, include-first ordering tends to find one fast) lets later
        branches be axed at the root. Push ITEMS up: brute force grows as 2ⁿ while the
        visited-node count barely moves. That gap is the entire point of bounding.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Branch-and-bound is the backbone of exact combinatorial optimization: it's
        what integer-programming solvers (CPLEX, Gurobi, CBC) run under the hood,
        usually paired with the LP relaxation as the bound and with cutting planes
        (branch-and-cut). The same shape powers exact TSP, scheduling, and the
        alpha-beta pruning you see in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/mcts/`} style={{ color: "#a855f7" }}>game search</a>.
        It's the exact-search cousin of the dynamic-programming{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knapsack/`} style={{ color: "#a855f7" }}>knapsack</a> demo —
        DP exploits overlapping subproblems, B&B exploits bounds to prune.
      </DemoP>
      <DemoP>
        Two things make or break it: the <i>bound</i> (tighter relaxations prune more,
        but cost more to compute) and the <i>branching/ordering</i> heuristic (finding
        a strong incumbent early prunes everything after it). Worst case it's still
        exponential — bounding helps on average, not in the limit. Best-first
        (lowest-bound-first) and other node-selection rules trade memory for fewer
        expansions; this demo uses simple depth-first to keep the tree readable.
      </DemoP>
    </>
  );
  // drive redraw whenever frame or trace changes
  _useEffect(() => { draw(); /* eslint-disable-next-line */ });
  return (
    <DemoLayout title="Branch & Bound"
      subtitle="Solve 0/1 knapsack exactly without opening every branch. An optimistic bound prunes whole subtrees that can't beat the best solution so far. Toggle bounding off to watch it collapse into brute force."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BranchAndBoundDemo />);
