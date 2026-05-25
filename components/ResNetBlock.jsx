// components/ResNetBlock.jsx — residual block motif (the ResNet move).
// Input → conv → activation → conv → add (skip from input) → output.
//
// Props: width, height, mode

function ResNetBlock({
  width = 380,
  height = 340,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  const cx = width / 2;
  const colW = 140;
  const xL = cx - colW / 2;

  let y = 30;
  const gap = 14;
  const rowH = 38;
  const rows = [];
  const arrows = [];

  const pill = (label, sub, accent) => {
    const top = y;
    rows.push(
      <g key={`r${rows.length}`}>
        <rect x={xL} y={top} width={colW} height={rowH}
          fill={card} stroke={accent} strokeWidth="1" rx="3" />
        <text x={cx} y={top + 17} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="600"
          fontSize="13" fill={ink}>{label}</text>
        {sub && (
          <text x={cx} y={top + 29} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8"
            letterSpacing="0.1em" fill={muted}>{sub}</text>
        )}
      </g>
    );
    y += rowH + gap;
  };

  const downArrow = () => {
    const yTop = y - gap;
    const yBot = y - 2;
    arrows.push(
      <g key={`a${arrows.length}`}>
        <line x1={cx} y1={yTop} x2={cx} y2={yBot - 5}
          stroke={blue} strokeWidth="0.9" opacity="0.85" />
        <polygon points={`${cx},${yBot} ${cx - 4},${yBot - 5} ${cx + 4},${yBot - 5}`}
          fill={blue} />
      </g>
    );
  };

  // INPUT
  pill("Input", "x", blue);
  const yInBot = y - gap;

  // Conv 3x3
  downArrow();
  pill("Conv 3×3", "BN · ReLU", blue);

  // Conv 3x3
  downArrow();
  pill("Conv 3×3", "BN", blue);

  // ⊕ Add node
  downArrow();
  const yAdd = y + rowH / 2;
  // Render a circle with ⊕
  rows.push(
    <g key="add">
      <circle cx={cx} cy={yAdd} r={rowH / 2}
        fill={card} stroke={violet} strokeWidth="1.3" />
      <text x={cx} y={yAdd + 5} textAnchor="middle"
        fontFamily="Space Grotesk, sans-serif" fontWeight="700"
        fontSize="18" fill={violet}>⊕</text>
    </g>
  );
  y += rowH + gap;

  // ReLU after add
  downArrow();
  pill("ReLU", "ACTIVATION", violet);

  // OUTPUT
  downArrow();
  pill("Output", "F(x) + x", blue);

  // Skip connection arrow (right side, curving from input to add)
  const xR = xL + colW + 18;
  const skipPath = `M ${xL + colW} ${yInBot - rowH / 2}
                    L ${xR} ${yInBot - rowH / 2}
                    L ${xR} ${yAdd}
                    L ${xL + colW + 6} ${yAdd}`;
  const skip = (
    <g key="skip">
      <path d={skipPath}
        stroke={violet} strokeWidth="1.2" fill="none" opacity="0.85" />
      <polygon points={`${xL + colW + 6},${yAdd} ${xL + colW + 11},${yAdd - 3} ${xL + colW + 11},${yAdd + 3}`}
        fill={violet} />
      <text x={xR + 6} y={yInBot + 6}
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.06em" fill={violet}>SKIP · identity</text>
    </g>
  );

  return (
    <svg width={Math.max(width, xR + 100)} height={y + 20}
      viewBox={`0 0 ${Math.max(width, xR + 100)} ${y + 20}`}>
      {arrows}
      {skip}
      {rows}
      {/* HUD label */}
      <text x={cx} y={20} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="10"
        letterSpacing="0.18em" fill={muted}>// RESIDUAL BLOCK</text>
    </svg>
  );
}

window.ResNetBlock = ResNetBlock;
