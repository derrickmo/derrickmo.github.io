// components/TransformerBlock.jsx — BERT-style transformer block with input + head
// input → embedding → transformer block → classification head

function TransformerBlock({
  inputLabel = "TEXT",
  blockLabel = "BERT",
  headLabel = "CLS",
  width = 480,
  height = 360,
  mode = "dark",
}) {
  const blue = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted = mode === "paper" ? "#94a3b8" : "#475569";
  const cardFill = mode === "paper" ? "#ffffff" : "#0a1428";

  const cx = width / 2;
  const colW = 200;
  const xL = cx - colW / 2;

  // y-positions
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

  const pillBox = (y, label, sub, accent) => (
    <g>
      <rect x={xL} y={y - 22} width={colW} height={44}
        fill={cardFill} stroke={accent} strokeWidth="1" rx="3" />
      <text x={cx} y={y - 4} textAnchor="middle"
        fontFamily="Space Grotesk, sans-serif" fontWeight="600"
        fontSize="14" fill={ink}>{label}</text>
      {sub && (
        <text x={cx} y={y + 12} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9" letterSpacing="0.12em" fill={muted}>{sub}</text>
      )}
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* input */}
      {pillBox(y1, inputLabel, "INPUT::SEQ", blue)}
      {arrow(cx, y1 + 22, y2 - 22)}

      {/* embedding */}
      {pillBox(y2, "Embed + Pos", "DIM::768", blue)}
      {arrow(cx, y2 + 22, y3 - 22)}

      {/* block — taller */}
      <rect x={xL} y={y3 - 22} width={colW} height={70}
        fill={cardFill} stroke={violet} strokeWidth="1" rx="3" />
      <text x={cx} y={y3 - 4} textAnchor="middle"
        fontFamily="Space Grotesk, sans-serif" fontWeight="600"
        fontSize="14" fill={ink}>{blockLabel}</text>
      <text x={cx} y={y3 + 12} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize="9" letterSpacing="0.12em" fill={muted}>SELF-ATTN · 12 HEADS</text>
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
