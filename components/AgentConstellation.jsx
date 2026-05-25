// components/AgentConstellation.jsx — central orchestrator + satellite agent nodes
// Props:
//   center: { label }
//   satellites: [{ label, angle?, color? }]

function AgentConstellation({
  center = { label: "ORCH" },
  satellites = [
    { label: "INTAKE" },
    { label: "REASONING" },
    { label: "TOOL_USE" },
    { label: "OUTPUT" },
  ],
  width = 480,
  height = 360,
  mode = "dark",
}) {
  const blue = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const cardFill = mode === "paper" ? "#ffffff" : "#0a1428";
  const muted = mode === "paper" ? "#94a3b8" : "#475569";

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.38;
  const n = satellites.length;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* guide rings */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={muted} strokeWidth="0.5" opacity="0.35" strokeDasharray="2 4" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke={muted} strokeWidth="0.5" opacity="0.25" strokeDasharray="2 4" />

      {/* satellites */}
      {satellites.map((s, i) => {
        const ang = s.angle != null ? s.angle : (-Math.PI / 2) + (i / n) * Math.PI * 2;
        const sx = cx + Math.cos(ang) * r;
        const sy = cy + Math.sin(ang) * r;
        const col = (s.color || (i % 2 ? "violet" : "blue")) === "violet" ? violet : blue;
        return (
          <g key={i}>
            {/* edge to center */}
            <line x1={cx} y1={cy} x2={sx} y2={sy}
              stroke={col} strokeWidth="0.6" opacity="0.55" />
            {/* node */}
            <circle cx={sx} cy={sy} r="22" fill={cardFill}
              stroke={col} strokeWidth="1" />
            <text x={sx} y={sy + 3} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9" letterSpacing="0.1em"
              fill={ink}>{s.label}</text>
          </g>
        );
      })}

      {/* center node */}
      <circle cx={cx} cy={cy} r="38" fill="none" stroke={blue} strokeWidth="0.6" opacity="0.5" />
      <circle cx={cx} cy={cy} r="28" fill={cardFill} stroke={violet} strokeWidth="1.3" />
      <text x={cx} y={cy + 4} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize="11" letterSpacing="0.12em" fontWeight="700"
        fill={ink}>{center.label}</text>
    </svg>
  );
}

window.AgentConstellation = AgentConstellation;
