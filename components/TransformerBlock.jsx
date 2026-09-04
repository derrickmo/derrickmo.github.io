// components/TransformerBlock.jsx — BERT-style transformer block with input + head
// input → embedding → transformer block → classification head
//
// Two layouts for two slot shapes:
//   layout="column" (default) — the tall 4-row stack. For portrait slots, e.g. the
//                               HF hub/section heroes at 460x360 and 420x340.
//   layout="row"              — the same four stages flowing left to right. For the
//                               LANDSCAPE card slots on /, /work/ and /learn/, which
//                               are ~629x200. A portrait stack cannot fit a landscape
//                               slot without either cropping or shrinking the type
//                               below legibility; the row layout renders 1:1 there,
//                               the way the sibling LessonStack diagram already does.

function TransformerBlock({
  inputLabel = "TEXT",
  blockLabel = "BERT",
  headLabel = "CLS",
  width = 480,
  height = 360,
  mode = "dark",
  layout = "column",
}) {
  const blue = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted = mode === "paper" ? "#94a3b8" : "#475569";
  const cardFill = mode === "paper" ? "#ffffff" : "#0a1428";

  const row = layout === "row";

  // ⚠ INTRINSIC DRAWING SPACE — a CONSTANT, never the width/height props. The layout
  // below uses fixed coordinates, so a viewBox of `0 0 ${width} ${height}` made the
  // props CROP the drawing instead of scaling it: content runs to y=312, so the
  // height={200} call sites silently cut the classifier box and half the block. Seven
  // diagrams across /, /work/ and /learn/ were losing up to 46% of their height, which
  // reads as a rendering bug rather than a small diagram.
  const VW = row ? 470 : 480;
  const VH = row ? 170 : 360;

  const label = (x, y, text, anchor) => (
    <text x={x} y={y} textAnchor={anchor || "middle"}
      fontFamily="Space Grotesk, sans-serif" fontWeight="600"
      fontSize="14" fill={ink}>{text}</text>
  );
  const sublabel = (x, y, text) => (
    <text x={x} y={y} textAnchor="middle"
      fontFamily="JetBrains Mono, monospace"
      fontSize="9" letterSpacing="0.12em" fill={muted}>{text}</text>
  );

  // ── row layout ─────────────────────────────────────────────────────────────
  if (row) {
    const boxW = 100, boxH = 46, midY = VH / 2;   // centre the band in the viewBox
    const pitch = 120;
    const xs = [6, 6 + pitch, 6 + pitch * 2, 6 + pitch * 3];   // right edge 6+360+100 = 466
    const blockH = 72;                                          // the 3rd box is taller
    const cxOf = (i) => xs[i] + boxW / 2;

    const hArrow = (xA, xB) => (
      <g>
        <line x1={xA} y1={midY} x2={xB - 6} y2={midY} stroke={blue} strokeWidth="0.9" opacity="0.8" />
        <polygon points={`${xB},${midY} ${xB - 6},${midY - 4} ${xB - 6},${midY + 4}`} fill={blue} opacity="0.9" />
      </g>
    );
    const stage = (i, text, sub, accent, tall) => {
      const h = tall ? blockH : boxH;
      const y = midY - h / 2;
      return (
        <g>
          <rect x={xs[i]} y={y} width={boxW} height={h}
            fill={cardFill} stroke={accent} strokeWidth="1" rx="3" />
          {label(cxOf(i), midY - (tall ? 8 : 2), text)}
          {sub && sublabel(cxOf(i), midY + (tall ? 8 : 14), sub)}
        </g>
      );
    };

    // attention "heads" mini grid, inside the block box
    const dots = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++)
      dots.push({ x: xs[2] + 20 + c * 11, y: midY + 20 + r * 7, i: r * 6 + c });

    return (
      <svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`}>
        {stage(0, inputLabel, "INPUT::SEQ", blue)}
        {hArrow(xs[0] + boxW, xs[1])}
        {stage(1, "Embed + Pos", "DIM::768", blue)}
        {hArrow(xs[1] + boxW, xs[2])}
        {stage(2, blockLabel, "SELF-ATTN · 12", violet, true)}
        {dots.map((d) => (
          <circle key={d.i} cx={d.x} cy={d.y} r="1.6"
            fill={d.i % 3 === 0 ? blue : violet}
            opacity={0.4 + ((d.i * 0.17) % 0.6)} />
        ))}
        {hArrow(xs[2] + boxW, xs[3])}
        {stage(3, "Classifier", `${headLabel}::HEAD`, violet)}
      </svg>
    );
  }

  // ── column layout (original) ───────────────────────────────────────────────
  const cx = VW / 2;
  const colW = 200;
  const xL = cx - colW / 2;

  const y1 = 40;   // input
  const y2 = 120;  // embed
  const y3 = 200;  // block
  const y4 = 290;  // head

  const arrow = (x, yA, yB) => (
    <g>
      <line x1={x} y1={yA} x2={x} y2={yB - 6} stroke={blue} strokeWidth="0.9" opacity="0.8" />
      <polygon points={`${x},${yB} ${x - 4},${yB - 6} ${x + 4},${yB - 6}`} fill={blue} opacity="0.9" />
    </g>
  );

  const pillBox = (y, text, sub, accent) => (
    <g>
      <rect x={xL} y={y - 22} width={colW} height={44}
        fill={cardFill} stroke={accent} strokeWidth="1" rx="3" />
      {label(cx, y - 4, text)}
      {sub && sublabel(cx, y + 12, sub)}
    </g>
  );

  // attention "heads" mini grid in block
  const headDots = [];
  const dotsRows = 2, dotsCols = 6;
  for (let r = 0; r < dotsRows; r++) {
    for (let c = 0; c < dotsCols; c++) {
      headDots.push({ x: xL + 16 + c * 14, y: y3 + 36 + r * 8, r, c });
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`}>
      {/* input */}
      {pillBox(y1, inputLabel, "INPUT::SEQ", blue)}
      {arrow(cx, y1 + 22, y2 - 22)}

      {/* embedding */}
      {pillBox(y2, "Embed + Pos", "DIM::768", blue)}
      {arrow(cx, y2 + 22, y3 - 22)}

      {/* block — taller */}
      <rect x={xL} y={y3 - 22} width={colW} height={70}
        fill={cardFill} stroke={violet} strokeWidth="1" rx="3" />
      {label(cx, y3 - 4, blockLabel)}
      {sublabel(cx, y3 + 12, "SELF-ATTN · 12 HEADS")}
      {/* attention dot grid */}
      {headDots.map((d, i) => (
        <circle key={i} cx={d.x + 8} cy={d.y - 4} r="1.6"
          fill={i % 3 === 0 ? blue : violet}
          opacity={0.4 + ((i * 0.17) % 0.6)} />
      ))}

      {arrow(cx, y3 + 48, y4 - 22)}

      {/* head */}
      {pillBox(y4, "Classifier", `${headLabel}::HEAD`, violet)}
    </svg>
  );
}

window.TransformerBlock = TransformerBlock;
