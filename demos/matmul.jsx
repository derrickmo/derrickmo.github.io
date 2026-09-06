// demos/matmul.jsx — a matrix is a function on space, and multiplying two of them
// composes those functions. Benched first: composition verified against two-step application,
// and A@B != B@A verified, before any drawing.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, SegmentedControl, Toggle } = window;

const W = 560, H = 400;

const mul = (A, B) => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
];
const app = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
const det = (M) => M[0][0] * M[1][1] - M[0][1] * M[1][0];

function MatmulDemo() {
  const cvRef = _useRef(null);
  const [a, setA] = _useState(0), [b, setB] = _useState(-1);
  const [c, setC] = _useState(1), [d, setD] = _useState(0);
  const [order, setOrder] = _useState("AB");
  const [showGrid, setShowGrid] = _useState(true);
  const [n, setN] = _useState(512);

  const A = [[a, b], [c, d]];
  const B = [[2, 0], [0, 1]];                       // fixed second operand: scale x by 2
  const M = order === "AB" ? mul(A, B) : mul(B, A);

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2, S = 46;
    const px = (v) => [cx + v[0] * S, cy - v[1] * S];

    // faint reference grid, then the transformed grid
    const gridLines = (T, colour, alpha) => {
      ctx.strokeStyle = colour; ctx.globalAlpha = alpha; ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        let p = px(app(T, [i, -4])); ctx.moveTo(p[0], p[1]);
        p = px(app(T, [i, 4])); ctx.lineTo(p[0], p[1]);
        ctx.stroke();
        ctx.beginPath();
        p = px(app(T, [-4, i])); ctx.moveTo(p[0], p[1]);
        p = px(app(T, [4, i])); ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    if (showGrid) gridLines([[1, 0], [0, 1]], "#1e3a6e", 0.55);
    gridLines(M, "#60a5fa", 0.30);

    // the unit square, transformed -- its area is |det|
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map((v) => px(app(M, v)));
    ctx.beginPath(); ctx.moveTo(sq[0][0], sq[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(sq[i][0], sq[i][1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(192,132,252,0.16)"; ctx.fill();
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.4; ctx.stroke();

    // basis vectors: the columns of M are literally where i-hat and j-hat land
    const arrow = (v, colour, label) => {
      const p0 = px([0, 0]), p1 = px(v);
      ctx.strokeStyle = colour; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p1[0] - 9 * Math.cos(ang - 0.4), p1[1] - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(p1[0] - 9 * Math.cos(ang + 0.4), p1[1] - 9 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fillStyle = colour; ctx.fill();
      ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = colour;
      ctx.fillText(label, p1[0] + 7, p1[1] - 6);
    };
    arrow([M[0][0], M[1][0]], "#60a5fa", "col 1");
    arrow([M[0][1], M[1][1]], "#c084fc", "col 2");

    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("the columns of the product are where the basis vectors land", 14, H - 14);
  }, [a, b, c, d, order, showGrid]);

  const flops = 2 * Math.pow(n, 3);
  const bytes = 3 * n * n * 4;
  const intensity = flops / bytes;
  const nonCommuting = JSON.stringify(mul(A, B)) !== JSON.stringify(mul(B, A));

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="A · [0][0]" min={-2} max={2} step={0.1} value={a} onChange={setA}
        help="The first column of A is where the x basis vector lands. Read the matrix as two destinations, not four numbers." />
      <Slider label="A · [0][1]" min={-2} max={2} step={0.1} value={b} onChange={setB}
        help="Top-right. Together with [1][1] it forms the second column: where the y basis vector lands." />
      <Slider label="A · [1][0]" min={-2} max={2} step={0.1} value={c} onChange={setC}
        help="Bottom-left. Non-zero off-diagonals are what shear and rotate the grid." />
      <Slider label="A · [1][1]" min={-2} max={2} step={0.1} value={d} onChange={setD}
        help="Set the determinant to 0 and the whole plane collapses onto a line - the transform stops being invertible." />
      <SegmentedControl label="// ORDER" value={order} onChange={setOrder}
        options={[{ value: "AB", label: "A @ B" }, { value: "BA", label: "B @ A" }]}
        help="B is a fixed 'scale x by 2'. Flipping the order changes the result whenever A and B do not commute." />
      <Toggle label="SHOW ORIGINAL GRID" checked={showGrid} onChange={setShowGrid}
        help="The faint grid is the plane before the transform, for comparison." />
      <Slider label="// COST: n x n" min={128} max={4096} step={128} value={n} onChange={setN}
        help="Arithmetic scales as n-cubed while memory scales as n-squared, so bigger matmuls are MORE compute-bound." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="DETERMINANT" value={det(M).toFixed(2)} accent={Math.abs(det(M)) < 0.05 ? "#f87171" : "#c084fc"} />
        <StatReadout label="A@B = B@A ?" value={nonCommuting ? "NO" : "yes"} accent={nonCommuting ? "#fbbf24" : "#34d399"} />
        <StatReadout label="GFLOP" value={(flops / 1e9).toFixed(2)} accent="var(--blue-lt)" />
        <StatReadout label="FLOP / BYTE" value={intensity.toFixed(0)} accent="#60a5fa" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        A matrix is a function on space, and its columns say everything: column one is where the
        x basis vector lands, column two is where y lands. Everything else follows by linearity, so
        once you know those two points you know what happens to every vector at once. The shaded
        square is the unit square carried along, and its area is exactly the
        <strong> determinant</strong> — drive that to zero and the plane collapses onto a line,
        which is the geometric meaning of "not invertible".
      </DemoP>
      <DemoP>
        Multiplying matrices <em>composes</em> those functions. Applying B and then A to a vector
        gives the same answer as applying the single matrix <code>A@B</code> once — that is the
        definition, and it is why the inner dimensions must match. <strong>Flip the ORDER
        control.</strong> B here is "scale x by 2"; with A as a rotation the two orders give
        genuinely different matrices, because rotating then stretching is not stretching then
        rotating. Matrix multiplication is composition, and composition is not commutative.
      </DemoP>
      <DemoP>
        The cost slider is the other half. Arithmetic grows as <code>n³</code> while the memory
        touched grows as <code>n²</code>, so the FLOP/BYTE readout climbs with size: about 21 at
        n=128 and 683 at n=4096. That single ratio is why matmul is the operation hardware is
        designed around — at scale it is overwhelmingly compute-bound, which is the opposite of
        the memory-bound regime that governs LLM token generation.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Every layer of a network is this. A dense layer is a matmul plus a bias; attention is three
        matmuls to build Q, K and V, then two more for the scores and the weighted sum. Stacking
        layers without a nonlinearity between them would just be composing matrices — which
        collapses to a single matrix, and is exactly why the
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/activations/`}>activation</a>{" "}
        is not optional.
      </DemoP>
      <DemoP>
        The determinant view carries over too: a transform that squashes the plane onto a line
        destroys information irreversibly, which is the same intuition behind a rank-deficient
        weight matrix and behind
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/pca/`}>PCA</a>{" "}
        keeping only the directions with meaningful spread.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Matrix Multiplication"
      subtitle="A matrix is a function on space and multiplying two composes them - which is why order matters and why matmul is compute-bound."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/linear-algebra/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MatmulDemo />);
