// components/RNNUnrolled.jsx — unrolled recurrent network across timesteps.
// Shows N cells with input arrows up, output arrows up, hidden state
// flowing left-to-right.
//
// Props:
//   cellLabel: "RNN" | "LSTM" | "GRU"  (or any short string)
//   steps: number of timesteps (default 4)
//   showHidden: bool — show h_t labels on hidden arrows
//   width, height, mode

function RNNUnrolled({
  cellLabel = "RNN",
  steps = 4,
  showHidden = true,
  showOutput = true,
  width = 720,
  height = 300,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  const padX = 50;
  const usableW = width - padX * 2;
  const dx = steps > 1 ? usableW / (steps - 1) : 0;
  const cellW = Math.min(80, dx * 0.55);
  const cellH = 52;
  const midY = height / 2;
  const inputY = midY + 70;
  const outputY = midY - 70;

  // Sub-index helper: t-1, t, t+1, t+2 ...
  const subscript = (i) => {
    const mid = Math.floor(steps / 2);
    const off = i - mid;
    if (off === 0) return "t";
    if (off === -1) return "t−1";
    if (off === 1) return "t+1";
    if (off < 0) return `t${off}`;
    return `t+${off}`;
  };

  const cells = [];
  const arrows = [];

  for (let i = 0; i < steps; i++) {
    const cx = padX + dx * i;

    // Cell rect
    cells.push(
      <g key={`c${i}`}>
        <rect
          x={cx - cellW / 2} y={midY - cellH / 2}
          width={cellW} height={cellH}
          rx="4"
          fill={card}
          stroke={i % 2 === 0 ? blue : violet}
          strokeWidth="1.2" />
        <text x={cx} y={midY + 4} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="11"
          fontWeight="600" letterSpacing="0.08em"
          fill={ink}>{cellLabel}</text>
      </g>
    );

    // Input arrow from below
    arrows.push(
      <g key={`in${i}`}>
        <line x1={cx} y1={inputY} x2={cx} y2={midY + cellH / 2 + 6}
          stroke={blue} strokeWidth="0.9" opacity="0.85" />
        <polygon points={`${cx},${midY + cellH / 2} ${cx - 4},${midY + cellH / 2 + 6} ${cx + 4},${midY + cellH / 2 + 6}`}
          fill={blue} />
        <text x={cx} y={inputY + 14} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="10"
          fill={muted}>x<tspan baselineShift="sub" fontSize="8">{subscript(i)}</tspan></text>
      </g>
    );

    // Output arrow to above
    if (showOutput) {
      arrows.push(
        <g key={`out${i}`}>
          <line x1={cx} y1={midY - cellH / 2 - 6} x2={cx} y2={outputY + 8}
            stroke={violet} strokeWidth="0.9" opacity="0.85" />
          <polygon points={`${cx},${outputY} ${cx - 4},${outputY + 8} ${cx + 4},${outputY + 8}`}
            fill={violet} />
          <text x={cx} y={outputY - 6} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="10"
            fill={muted}>y<tspan baselineShift="sub" fontSize="8">{subscript(i)}</tspan></text>
        </g>
      );
    }

    // Hidden state arrow to next cell
    if (i < steps - 1) {
      const x1 = cx + cellW / 2 + 2;
      const x2 = padX + dx * (i + 1) - cellW / 2 - 6;
      arrows.push(
        <g key={`h${i}`}>
          <line x1={x1} y1={midY} x2={x2} y2={midY}
            stroke={blue} strokeWidth="0.9" opacity="0.7" />
          <polygon points={`${x2 + 5},${midY} ${x2},${midY - 3} ${x2},${midY + 3}`}
            fill={blue} />
          {showHidden && (
            <text x={(x1 + x2) / 2} y={midY - 6} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace" fontSize="9"
              fill={muted}>h<tspan baselineShift="sub" fontSize="7">{subscript(i)}</tspan></text>
          )}
        </g>
      );
    }
  }

  // Initial hidden state arrow (h_-1 entering first cell)
  arrows.unshift(
    <g key="h-init">
      <line x1={padX - cellW / 2 - 6} y1={midY} x2={padX - cellW / 2 - 2} y2={midY}
        stroke={muted} strokeWidth="0.6" opacity="0.5" strokeDasharray="2 2" />
      <text x={padX - cellW / 2 - 18} y={midY + 3} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        fill={muted}>h<tspan baselineShift="sub" fontSize="7">0</tspan></text>
    </g>
  );

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {arrows}
      {cells}
      {/* Time axis caption */}
      <text x={width / 2} y={height - 8} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.12em" fill={muted}>// TIME →</text>
    </svg>
  );
}

window.RNNUnrolled = RNNUnrolled;
