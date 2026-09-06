// demos/autodiff.jsx — forward vs reverse mode on a real computation graph.
// Benched first: the reverse-mode gradients are checked against central finite differences
// (max error 1.6e-10) so the page can claim correctness rather than assert it.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, SegmentedControl } = window;

const W = 560, H = 400;

// f(x, y) = x^2 * y + sin(x), built as an explicit graph so both modes can walk it.
// nodes: 0:x  1:y  2:x*x  3:(x*x)*y  4:sin(x)  5:sum
function forwardPass(x, y) {
  const v = [];
  v[0] = x; v[1] = y;
  v[2] = v[0] * v[0];
  v[3] = v[2] * v[1];
  v[4] = Math.sin(v[0]);
  v[5] = v[3] + v[4];
  return v;
}
// reverse mode: one backward sweep gives BOTH partials
function reverse(x, y) {
  const v = forwardPass(x, y);
  const g = new Array(6).fill(0);
  g[5] = 1;
  g[3] += g[5]; g[4] += g[5];              // sum
  g[0] += g[4] * Math.cos(v[0]);           // sin
  g[2] += g[3] * v[1]; g[1] += g[3] * v[2]; // product
  g[0] += g[2] * 2 * v[0];                 // square
  return { v, g, out: v[5] };
}
// forward mode: one sweep per input direction, so n inputs need n sweeps
function forwardMode(x, y, seedX) {
  const v = forwardPass(x, y);
  const d = [seedX ? 1 : 0, seedX ? 0 : 1, 0, 0, 0, 0];
  d[2] = 2 * v[0] * d[0];
  d[3] = d[2] * v[1] + v[2] * d[1];
  d[4] = Math.cos(v[0]) * d[0];
  d[5] = d[3] + d[4];
  return d[5];
}

const LABELS = ["x", "y", "x²", "x²·y", "sin x", "f"];
const POS = [[70, 120], [70, 290], [200, 120], [330, 205], [200, 290], [460, 205]];
const EDGES = [[0, 2], [2, 3], [1, 3], [0, 4], [3, 5], [4, 5]];

function AutodiffDemo() {
  const cvRef = _useRef(null);
  const [x, setX] = _useState(1.3), [y, setY] = _useState(0.7);
  const [mode, setMode] = _useState("reverse");
  const [nInputs, setNInputs] = _useState(1000);

  const { v, g, out } = reverse(x, y);
  const fwdX = forwardMode(x, y, true), fwdY = forwardMode(x, y, false);

  // ground truth, so the page can show it agrees rather than claim it
  const h = 1e-6;
  const numX = (forwardPass(x + h, y)[5] - forwardPass(x - h, y)[5]) / (2 * h);
  const numY = (forwardPass(x, y + h)[5] - forwardPass(x, y - h)[5]) / (2 * h);
  const maxErr = Math.max(Math.abs(numX - g[0]), Math.abs(numY - g[1]));

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);

    const rev = mode === "reverse";
    for (const [i, j] of EDGES) {
      const p = POS[i], q = POS[j];
      ctx.strokeStyle = rev ? "#c084fc" : "#60a5fa"; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      // arrowhead points the way information flows in the SELECTED mode
      const [a, b] = rev ? [q, p] : [p, q];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      ctx.globalAlpha = 0.9; ctx.beginPath();
      ctx.moveTo(mx + 7 * Math.cos(ang), my + 7 * Math.sin(ang));
      ctx.lineTo(mx - 5 * Math.cos(ang - 0.5), my - 5 * Math.sin(ang - 0.5));
      ctx.lineTo(mx - 5 * Math.cos(ang + 0.5), my - 5 * Math.sin(ang + 0.5));
      ctx.closePath(); ctx.fillStyle = rev ? "#c084fc" : "#60a5fa"; ctx.fill();
      ctx.globalAlpha = 1;
    }
    POS.forEach((p, i) => {
      const isInput = i < 2;
      ctx.beginPath(); ctx.arc(p[0], p[1], 26, 0, 7);
      ctx.fillStyle = "#0a1428"; ctx.fill();
      ctx.strokeStyle = i === 5 ? "#34d399" : isInput ? "#60a5fa" : "#c084fc";
      ctx.lineWidth = 1.4; ctx.stroke();
      ctx.font = "600 12px Space Grotesk, sans-serif"; ctx.fillStyle = "#e0e7ff";
      ctx.textAlign = "center"; ctx.fillText(LABELS[i], p[0], p[1] - 1);
      ctx.font = "9px JetBrains Mono, monospace"; ctx.fillStyle = "#94a3b8";
      ctx.fillText(v[i].toFixed(2), p[0], p[1] + 12);
      // the adjoint each node carries during the backward sweep
      if (rev) { ctx.fillStyle = "#c084fc"; ctx.fillText("g " + g[i].toFixed(2), p[0], p[1] + 40); }
      ctx.textAlign = "left";
    });
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText(rev ? "one backward sweep carries an adjoint g to every node"
      : "one forward sweep carries a derivative for ONE input direction", 14, H - 14);
  }, [x, y, mode]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="x" min={-3} max={3} step={0.05} value={x} onChange={setX}
        help="Node values update immediately; the adjoints below them are the partial derivatives at this point." />
      <Slider label="y" min={-3} max={3} step={0.05} value={y} onChange={setY}
        help="df/dy is x squared, so it does not depend on y at all - watch it stay put as you drag this." />
      <SegmentedControl label="// MODE" value={mode} onChange={setMode}
        options={[{ value: "reverse", label: "REVERSE" }, { value: "forward", label: "FORWARD" }]}
        help="Same graph, opposite sweep. Reverse gets every input's partial in one pass; forward gets one input's partial per pass." />
      <Slider label="// INPUTS n" min={1} max={1000000} step={1} value={nInputs} onChange={setNInputs}
        help="For a scalar loss, forward mode needs one sweep per input and reverse needs exactly one. This is the whole reason training uses reverse." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="f(x, y)" value={out.toFixed(5)} accent="#34d399" />
        <StatReadout label="∂f/∂x" value={g[0].toFixed(5)} accent="var(--blue-lt)" />
        <StatReadout label="∂f/∂y" value={g[1].toFixed(5)} accent="#c084fc" />
        <StatReadout label="ERR vs NUMERIC" value={maxErr.toExponential(1)} accent={maxErr < 1e-6 ? "#34d399" : "#f87171"} />
        <StatReadout label="FORWARD SWEEPS" value={nInputs.toLocaleString()} accent="#fbbf24" />
        <StatReadout label="REVERSE SWEEPS" value="1" accent="#34d399" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        Autodiff is neither symbolic differentiation nor finite differences. It records the graph
        of primitive operations actually executed, then applies the chain rule to that graph. The
        result is exact to floating point — the ERR vs NUMERIC readout compares these gradients
        against central finite differences and stays around 1e-10, which is the accuracy of the
        <em> finite differences</em>, not of the autodiff.
      </DemoP>
      <DemoP>
        <strong>Reverse mode</strong> seeds the output with 1 and sweeps backward, accumulating an
        adjoint <code>g</code> at every node — shown under each circle. One sweep produces
        <em> every</em> input partial. <strong>Forward mode</strong> seeds one input with 1 and
        sweeps forward, and produces the derivative with respect to <em>that input only</em>; a
        second input needs a second sweep. Flip the MODE control and watch the arrows reverse:
        same graph, opposite direction.
      </DemoP>
      <DemoP>
        That asymmetry decides everything. Training is a function from many parameters to one
        scalar loss, so reverse mode gets all the gradients for the price of roughly one extra
        forward pass, while forward mode would need one sweep per parameter — the readouts say
        1 against 1,000,000. The converse is equally true and less often said: for a function from
        one input to many outputs, forward mode wins, which is why Jacobian-vector products still
        use it.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is what {" "}<a href={`${window.__DM_BASE || "../../"}visualize/backprop/`}>backpropagation</a>{" "}
        is: reverse-mode autodiff applied to a network's computation graph. Backprop is not a
        separate algorithm that happens to work on neural nets — it is the general method,
        specialised to the case where the output is a scalar loss.
      </DemoP>
      <DemoP>
        The stored node values are also why training memory scales with depth. The backward sweep
        needs the forward values at each node, so they are kept alive until it runs — which is
        exactly what activation checkpointing trades away, recomputing them on demand to buy back
        memory at the cost of a second forward pass.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Automatic Differentiation"
      subtitle="Forward and reverse mode on one graph - and why a scalar loss over many parameters makes reverse the only sensible choice."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/calculus/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AutodiffDemo />);
