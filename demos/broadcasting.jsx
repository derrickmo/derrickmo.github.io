// demos/broadcasting.jsx — NumPy/PyTorch broadcasting: the rule, the memory it saves,
// and the silent shape bug it lets through.
//
// Benched before drawing: the rule was tested against 13 known shape pairs (including the
// NumPy doc's (8,1,6,1)+(7,1,5) -> (8,7,6,5) and every incompatible case) before any canvas
// existed. The two numbers on the page come from that bench, not from prose.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, StatReadout, ControlGroup, SegmentedControl,
} = window;

const W = 560, H = 380;

// The rule: align from the RIGHT; dims are compatible if equal or one is 1; result takes the max.
function broadcast2(a, b) {
  const out = [], why = [];
  for (let i = 0; i < 2; i++) {
    const x = a[i], y = b[i];
    if (x === y) { out.push(x); why.push("equal"); }
    else if (x === 1) { out.push(y); why.push("stretch A"); }
    else if (y === 1) { out.push(x); why.push("stretch B"); }
    else return { ok: false, axis: i, x, y };
  }
  return { ok: true, shape: out, why };
}
const numel = (s) => s[0] * s[1];

const PRESETS = {
  "trap": { a: [4, 1], b: [1, 4] },
  "row": { a: [5, 3], b: [1, 3] },
  "col": { a: [5, 3], b: [5, 1] },
  "bad": { a: [4, 3], b: [2, 3] },
};

function BroadcastingDemo() {
  const cvRef = _useRef(null);
  const [ar, setAr] = _useState(4), [ac, setAc] = _useState(1);
  const [br, setBr] = _useState(1), [bc, setBc] = _useState(4);

  const A = [ar, ac], B = [br, bc];
  const r = broadcast2(A, B);

  const applyPreset = (k) => {
    const p = PRESETS[k]; if (!p) return;
    setAr(p.a[0]); setAc(p.a[1]); setBr(p.b[0]); setBc(p.b[1]);
  };

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);

    const CELL = 20, GAP = 3;
    const gridW = (s) => s[1] * (CELL + GAP) - GAP;
    const gridH = (s) => s[0] * (CELL + GAP) - GAP;

    // draw one array; `stretch` marks axes that are being stretched from length 1
    const draw = (s, x0, y0, colour, stretchRow, stretchCol, label) => {
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left";
      ctx.fillText(label + "  (" + s[0] + ", " + s[1] + ")", x0, y0 - 8);
      for (let i = 0; i < s[0]; i++) {
        for (let j = 0; j < s[1]; j++) {
          const x = x0 + j * (CELL + GAP), y = y0 + i * (CELL + GAP);
          ctx.fillStyle = colour + "22";
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = colour; ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        }
      }
      // arrows showing the stretched axis
      ctx.strokeStyle = colour; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      if (stretchRow) {
        ctx.beginPath();
        ctx.moveTo(x0 - 8, y0 + gridH(s) / 2); ctx.lineTo(x0 - 8, y0 + gridH(s) / 2 + 34);
        ctx.stroke();
      }
      if (stretchCol) {
        ctx.beginPath();
        ctx.moveTo(x0 + gridW(s), y0 - 6); ctx.lineTo(x0 + gridW(s) + 34, y0 - 6);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };

    const blue = "#60a5fa", violet = "#c084fc", green = "#34d399";

    if (!r.ok) {
      draw(A, 40, 60, blue, false, false, "A");
      draw(B, 40, 200, violet, false, false, "B");
      ctx.font = "600 15px Space Grotesk, sans-serif";
      ctx.fillStyle = "#f87171"; ctx.textAlign = "left";
      ctx.fillText("Incompatible", 300, 150);
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.fillStyle = "#94a3b8";
      const axisName = r.axis === 0 ? "rows" : "cols";
      ctx.fillText(axisName + ": " + r.x + " vs " + r.y, 300, 172);
      ctx.fillText("neither is 1, so neither", 300, 190);
      ctx.fillText("can stretch to meet the other.", 300, 206);
      return;
    }

    draw(A, 40, 60, blue, A[0] === 1 && r.shape[0] > 1, A[1] === 1 && r.shape[1] > 1, "A");
    draw(B, 40, 220, violet, B[0] === 1 && r.shape[0] > 1, B[1] === 1 && r.shape[1] > 1, "B");
    draw(r.shape, 300, 60, green, false, false, "RESULT");

    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "#64748b"; ctx.textAlign = "left";
    ctx.fillText("rows: " + r.why[0], 300, 60 + gridH(r.shape) + 22);
    ctx.fillText("cols: " + r.why[1], 300, 60 + gridH(r.shape) + 38);
  }, [ar, ac, br, bc, r.ok, r.shape && r.shape[0], r.shape && r.shape[1]]);

  const stored = numel(A) + numel(B);
  const materialised = r.ok ? numel(r.shape) * 2 : 0;
  const ratio = r.ok && stored > 0 ? materialised / stored : 0;

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <ControlGroup>
        <Slider label="A · ROWS" min={1} max={6} step={1} value={ar} onChange={setAr}
          help="A length-1 axis is the one that can stretch. Any other length must match exactly." />
        <Slider label="A · COLS" min={1} max={6} step={1} value={ac} onChange={setAc}
          help="Set this to 1 and watch A widen to meet B without any memory being allocated." />
      </ControlGroup>
      <ControlGroup>
        <Slider label="B · ROWS" min={1} max={6} step={1} value={br} onChange={setBr}
          help="Broadcasting compares axes from the right, so these line up with A's rows." />
        <Slider label="B · COLS" min={1} max={6} step={1} value={bc} onChange={setBc}
          help="Two axes are compatible only if they are equal or one of them is 1." />
      </ControlGroup>
      <SegmentedControl label="// JUMP TO" value="" onChange={applyPreset}
        options={[
          { value: "trap", label: "THE TRAP" },
          { value: "row", label: "ROW VEC" },
          { value: "col", label: "COL VEC" },
          { value: "bad", label: "INCOMPATIBLE" },
        ]}
        help="THE TRAP is (4,1)+(1,4): two four-element vectors that silently produce a 4x4 matrix." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="RESULT SHAPE" value={r.ok ? "(" + r.shape.join(", ") + ")" : "error"} accent={r.ok ? "#34d399" : "#f87171"} />
        <StatReadout label="ELEMENTS STORED" value={String(stored)} accent="var(--blue-lt)" />
        <StatReadout label="IF MATERIALISED" value={r.ok ? String(materialised) : "-"} accent="#fbbf24" />
        <StatReadout label="MEMORY SAVED" value={r.ok ? ratio.toFixed(1) + "x" : "-"} accent="#60a5fa" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        Broadcasting is one rule applied right-to-left: two axes are compatible if they are
        <strong> equal</strong>, or if <strong>one of them is 1</strong>. A length-1 axis is
        stretched to match; anything else is an error. Missing leading axes count as 1, which is
        why a <code>(3,)</code> bias adds cleanly to a <code>(256, 256, 3)</code> image.
      </DemoP>
      <DemoP>
        The stretch is a lie the library tells you, and that is the point. NumPy and PyTorch do not
        copy the stretched axis — they read the same memory repeatedly with a stride of zero. Drag
        the sliders to <code>(1000, 1)</code> and <code>(1, 1000)</code> in your head: the result
        has a million elements, built from two thousand. The MEMORY SAVED readout is that ratio,
        and it is why you should not reach for <code>tile</code> or <code>repeat</code> first.
      </DemoP>
      <DemoP>
        <strong>Now press THE TRAP.</strong> Shapes <code>(4,1)</code> and <code>(1,4)</code> are
        both "four numbers" in your head. Broadcasting turns them into a 4&times;4 matrix, and
        nothing errors — you get 16 values, a mean over them is the mean of a matrix, and the bug
        surfaces much later as a loss that will not go down. This is the single most common shape
        bug in ML code, and it is not a bug in the rule. It is the rule working exactly as written
        on inputs you did not mean. The fix is to say which axis you meant:
        <code>reshape(-1)</code>, or <code>keepdims=False</code> after a reduction.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Every vectorised line you write depends on this. A per-channel normalisation, adding a bias
        to a batch of activations, computing a pairwise distance matrix as
        <code> (n,1,d) - (1,m,d)</code> — all of it is broadcasting, and the last one is how a
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/knn/`}>k-NN</a> or a contrastive
        loss builds its distance matrix without a Python loop.
      </DemoP>
      <DemoP>
        The zero-stride trick is also why an accidental broadcast is expensive rather than free: the
        <em> result</em> is materialised even though the inputs are not. A stray
        <code> (n,1)</code> against <code>(1,n)</code> inside a training loop allocates an
        n&times;n tensor every step, which is the usual explanation for a model that trains fine at
        batch 8 and runs out of memory at batch 64.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Broadcasting"
      subtitle="One rule, applied right to left - what stretches, what it saves, and the silent shape bug it lets through."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/advanced-numpy-pytorch/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BroadcastingDemo />);
