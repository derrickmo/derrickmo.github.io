// demos/eigenvectors.jsx — the directions a matrix does not rotate, and power iteration
// finding the dominant one. Benched first: on [[2,1],[1,2]] power iteration reaches
// lambda = 3 at 45 degrees by step 3, and only the true eigenvectors preserve direction
// (cos = 1.0000) while a generic vector does not (cos = 0.8944).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, Toggle, DemoButton } = window;

const W = 560, H = 400;
const app = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
const norm = (v) => { const n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n]; };

// closed form for a symmetric 2x2 -- used only to draw the true answer for comparison
function eigen2(M) {
  const a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1];
  const tr = a + d, det = a * d - b * c;
  const disc = tr * tr / 4 - det;
  if (disc < 0) return null;                        // complex: a rotation has no real eigenvector
  const s = Math.sqrt(disc);
  const l1 = tr / 2 + s, l2 = tr / 2 - s;
  const vec = (l) => (Math.abs(b) > 1e-9 ? norm([b, l - a])
    : Math.abs(c) > 1e-9 ? norm([l - d, c]) : (Math.abs(a - l) < 1e-9 ? [1, 0] : [0, 1]));
  return { l1, l2, v1: vec(l1), v2: vec(l2) };
}

function EigenDemo() {
  const cvRef = _useRef(null);
  const [a, setA] = _useState(2), [b, setB] = _useState(1), [d, setD] = _useState(2);
  const [step, setStep] = _useState(0);
  const [showEig, setShowEig] = _useState(true);

  const M = [[a, b], [b, d]];                        // symmetric, so eigenvalues stay real
  const E = eigen2(M);

  // power iteration from a deliberately generic start
  let u = norm([0.3, 0.9]); const trail = [u];
  let lambda = 0;
  for (let i = 0; i < step; i++) { const w = app(M, u); lambda = Math.hypot(w[0], w[1]); u = norm(w); trail.push(u); }

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, S = 70;
    const px = (v) => [cx + v[0] * S, cy - v[1] * S];

    ctx.strokeStyle = "#1e3a6e"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // the unit circle and its image: an ellipse whose axes ARE the eigenvectors
    const ring = (fn, colour, dash) => {
      ctx.strokeStyle = colour; ctx.lineWidth = 1.4; ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let t = 0; t <= 361; t += 3) {
        const r = t * Math.PI / 180, p = px(fn([Math.cos(r), Math.sin(r)]));
        t ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    ring((v) => v, "#334d7a", [3, 3]);
    ring((v) => app(M, v), "#60a5fa");

    const arrow = (v, colour, label, wdt) => {
      const p0 = px([0, 0]), p1 = px(v);
      ctx.strokeStyle = colour; ctx.lineWidth = wdt || 2;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p1[0] - 9 * Math.cos(ang - 0.4), p1[1] - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(p1[0] - 9 * Math.cos(ang + 0.4), p1[1] - 9 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fillStyle = colour; ctx.fill();
      if (label) { ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = colour; ctx.fillText(label, p1[0] + 6, p1[1] - 5); }
    };

    if (showEig && E) {
      for (const [v, l, col] of [[E.v1, E.l1, "#34d399"], [E.v2, E.l2, "#fbbf24"]]) {
        // draw the eigen-direction as a full line: it is a direction, not a single vector
        ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
        const p1 = px([v[0] * 4, v[1] * 4]), p2 = px([-v[0] * 4, -v[1] * 4]);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        arrow([v[0] * l, v[1] * l], col, "λ=" + l.toFixed(2), 1.6);
      }
    }

    // the iterate, and where the matrix sends it
    arrow(u, "#c084fc", "v", 2.4);
    const Mu = app(M, u);
    ctx.globalAlpha = 0.55; arrow(norm(Mu), "#e0e7ff", "Mv normalised", 1.2); ctx.globalAlpha = 1;

    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText(E ? "dashed lines = the two eigen-directions" : "complex eigenvalues: no real direction is preserved", 14, H - 14);
  }, [a, b, d, step, showEig]);

  const angleOf = (v) => (Math.atan2(v[1], v[0]) * 180 / Math.PI + 360) % 180;
  const alignment = E ? Math.abs(u[0] * E.v1[0] + u[1] * E.v1[1]) : 0;

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="M · [0][0]" min={-3} max={4} step={0.1} value={a} onChange={setA}
        help="The matrix is kept symmetric so its eigenvalues stay real and the picture stays honest." />
      <Slider label="M · [0][1] = [1][0]" min={-3} max={3} step={0.1} value={b} onChange={setB}
        help="Set the off-diagonal to 0 and the eigenvectors snap to the axes - a diagonal matrix just scales each axis." />
      <Slider label="M · [1][1]" min={-3} max={4} step={0.1} value={d} onChange={setD}
        help="Make the two eigenvalues equal and every direction becomes an eigenvector: the ellipse turns back into a circle." />
      <Slider label="POWER ITERATION STEP" min={0} max={12} step={1} value={step} onChange={setStep}
        help="Repeatedly apply M and renormalise. The dominant eigenvector wins because its eigenvalue grows fastest." />
      <Toggle label="SHOW TRUE EIGENVECTORS" checked={showEig} onChange={setShowEig}
        help="Computed in closed form, so you can watch the iterate converge onto the answer rather than take it on trust." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="λ₁ (DOMINANT)" value={E ? E.l1.toFixed(3) : "complex"} accent="#34d399" />
        <StatReadout label="λ₂" value={E ? E.l2.toFixed(3) : "complex"} accent="#fbbf24" />
        <StatReadout label="ESTIMATE" value={step ? lambda.toFixed(4) : "-"} accent="#c084fc" />
        <StatReadout label="ALIGNMENT" value={step ? alignment.toFixed(5) : "-"} accent={alignment > 0.999 ? "#34d399" : "#60a5fa"} />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        Almost every vector gets rotated when you apply a matrix. The dashed lines are the
        exceptions: directions the matrix leaves alone, stretching them by a factor λ and nothing
        more. Those are the eigenvectors, and the blue ellipse — the image of the unit circle —
        has its axes along exactly those directions, with lengths |λ₁| and |λ₂|.
      </DemoP>
      <DemoP>
        Drag <strong>POWER ITERATION STEP</strong>. It starts from a deliberately arbitrary vector,
        applies M, renormalises, and repeats. On the default matrix the ALIGNMENT readout passes
        0.999 within about three steps and the ESTIMATE lands on λ₁ = 3.000. That is the entire
        algorithm, and it is why it works: writing the start vector in the eigen-basis, each
        application multiplies component i by λᵢ, so the largest one dominates exponentially
        while the rest die off at a rate set by |λ₂/λ₁|.
      </DemoP>
      <DemoP>
        Two edge cases worth reaching for. Make the eigenvalues equal and the ellipse becomes a
        circle — <em>every</em> direction is now an eigenvector, and power iteration has nothing to
        converge to. Set the off-diagonal to zero and the eigenvectors snap to the axes, which is
        all a diagonal matrix ever does: scale each coordinate independently. Diagonalising a
        matrix is precisely the change of basis that makes it look like that.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/pca/`}>PCA</a>{" "}
        is this demo applied to a covariance matrix: the eigenvectors are the directions of
        greatest variance and the eigenvalues are how much variance each one carries, which is why
        "percentage of variance explained" is a ratio of eigenvalues.
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/pagerank/`}>PageRank</a>{" "}
        is power iteration on a link matrix, and
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/spectral-clustering/`}>spectral clustering</a>{" "}
        reads structure out of a graph Laplacian's smallest eigenvectors.
      </DemoP>
      <DemoP>
        The |λ₂/λ₁| ratio also explains conditioning. When the largest and smallest eigenvalues of
        a loss's curvature are far apart, gradient descent zig-zags across the steep direction
        while crawling along the shallow one — the condition number is that ratio, and it is the
        single number behind why feature scaling, momentum and Adam all help.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Eigenvectors"
      subtitle="The directions a matrix does not rotate - and power iteration walking an arbitrary vector onto the dominant one."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/linear-algebra/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<EigenDemo />);
