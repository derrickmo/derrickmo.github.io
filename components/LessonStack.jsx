// components/LessonStack.jsx — stylized stack of lesson "blocks" climbing upward
// with a rising line graph in the background.

function LessonStack({
  count = 8,
  width = 480,
  height = 360,
  mode = "dark",
}) {
  const blue = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted = mode === "paper" ? "#94a3b8" : "#475569";
  const cardFill = mode === "paper" ? "#ffffff" : "#0a1428";

  const padL = 60;
  const padB = 40;
  const usableW = width - padL - 20;
  const usableH = height - padB - 20;
  const blockW = usableW / count - 6;

  // climbing graph polyline
  const graphPts = [];
  for (let i = 0; i <= count; i++) {
    const x = padL + (i / count) * usableW;
    const t = i / count;
    const y = height - padB - usableH * Math.pow(t, 0.85);
    graphPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* axes */}
      <line x1={padL} y1={height - padB} x2={width - 10} y2={height - padB}
        stroke={muted} strokeWidth="0.6" opacity="0.5" />
      <line x1={padL} y1={20} x2={padL} y2={height - padB}
        stroke={muted} strokeWidth="0.6" opacity="0.5" />
      {/* axis labels */}
      <text x={padL - 6} y={28} textAnchor="end"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.1em" fill={muted}>SKILL</text>
      <text x={width - 10} y={height - padB + 16} textAnchor="end"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.1em" fill={muted}>LESSON</text>

      {/* background graph */}
      <polyline points={graphPts.join(" ")} fill="none"
        stroke={violet} strokeWidth="0.8" opacity="0.5" strokeDasharray="3 3" />

      {/* climbing blocks */}
      {Array.from({ length: count }).map((_, i) => {
        const t = (i + 1) / count;
        const h = 30 + Math.pow(t, 0.85) * (usableH - 50);
        const x = padL + 10 + i * (blockW + 6);
        const y = height - padB - h;
        const col = i % 2 === 0 ? blue : violet;
        return (
          <g key={i}>
            <rect x={x} y={y} width={blockW} height={h}
              fill={cardFill} stroke={col} strokeWidth="1" rx="2" />
            <text x={x + blockW / 2} y={y + 14} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9" letterSpacing="0.08em"
              fill={col}>L{(i + 1).toString().padStart(2, "0")}</text>
          </g>
        );
      })}
    </svg>
  );
}

window.LessonStack = LessonStack;
