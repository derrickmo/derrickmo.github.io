// components/AgentConstellation.jsx — central orchestrator + satellite agent nodes
// Props:
//   center: { label }
//   satellites: [{ label, angle?, color? }]
//
// ⚠ SATELLITES ARE PILLS SIZED TO THEIR LABEL, NOT FIXED CIRCLES. They used to be
// circles of a hard-coded r=22 (44 across) carrying 9px mono text, so any label longer
// than ~6 characters spilled over its own ring: "REASONING" measures 56.7 and the ring
// ran straight through the R and the G. Two of the four default labels were broken that
// way, on 6 diagrams across /, /learn/ and /cases/.
//
// The orbit was also wrong independently: r = min(w,h) * 0.38 takes no account of the
// node radius, so at height 160 the bottom node sat 2.8 past the viewBox and was clipped.
// Both are now derived from content and box, so the diagram cannot overflow itself.
// Pills also match the box language the other diagrams already use.

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
  const n = satellites.length;

  // JetBrains Mono advances ~0.6em, plus the 0.1em letter-spacing below. Measured
  // against the live DOM: "REASONING" at 9px comes out 56.7, and 9 * 9 * 0.7 = 56.7.
  const FS = 9, PILL_H = 26;
  const textW = (label) => String(label).length * FS * 0.7;
  const pillW = (label) => Math.max(44, textW(label) + 16);
  const widestHalf = Math.max(...satellites.map((s) => pillW(s.label))) / 2;
  const CENTER_R = 28;

  // ⚠ THE ORBIT IS AN ELLIPSE, not a circle. A single radius cannot satisfy both
  // constraints in a landscape box: at 260x160 the left/right pills need >= 68.4 to
  // clear the centre node, while the top/bottom pills need <= 63 to stay inside the
  // viewBox. Sizing the two axes separately from the box and the node satisfies both,
  // and fills a landscape box instead of leaving a small circle in the middle of it.
  // Keep the ORIGINAL proportion as the target and CLAMP it, rather than pushing the
  // nodes as far out as the box allows -- maximising looked spread-out and wrong on the
  // near-square 420x340 box, where the old radius was already right.
  //   floor = must clear the centre node   ceiling = must stay inside the viewBox
  const natural = Math.min(width, height) * 0.38;
  const clamp = (floor, ceiling) => Math.min(ceiling, Math.max(floor, natural));
  const rx = clamp(CENTER_R + widestHalf + 4, width / 2 - widestHalf - 4);
  const ry = clamp(CENTER_R + PILL_H / 2 + 4, height / 2 - PILL_H / 2 - 4);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* guide rings */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={muted} strokeWidth="0.5" opacity="0.35" strokeDasharray="2 4" />
      <ellipse cx={cx} cy={cy} rx={rx * 0.55} ry={ry * 0.55} fill="none" stroke={muted} strokeWidth="0.5" opacity="0.25" strokeDasharray="2 4" />

      {/* satellites */}
      {satellites.map((s, i) => {
        const ang = s.angle != null ? s.angle : (-Math.PI / 2) + (i / n) * Math.PI * 2;
        const sx = cx + Math.cos(ang) * rx;
        const sy = cy + Math.sin(ang) * ry;
        const col = (s.color || (i % 2 ? "violet" : "blue")) === "violet" ? violet : blue;
        const w = pillW(s.label);
        return (
          <g key={i}>
            {/* edge to center */}
            <line x1={cx} y1={cy} x2={sx} y2={sy}
              stroke={col} strokeWidth="0.6" opacity="0.55" />
            {/* node — a pill wide enough for its own label */}
            <rect x={sx - w / 2} y={sy - PILL_H / 2} width={w} height={PILL_H}
              rx={PILL_H / 2} fill={cardFill} stroke={col} strokeWidth="1" />
            <text x={sx} y={sy + 3} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize={FS} letterSpacing="0.1em"
              fill={ink}>{s.label}</text>
          </g>
        );
      })}

      {/* center node */}
      <circle cx={cx} cy={cy} r={CENTER_R + 10} fill="none" stroke={blue} strokeWidth="0.6" opacity="0.5" />
      <circle cx={cx} cy={cy} r={CENTER_R} fill={cardFill} stroke={violet} strokeWidth="1.3" />
      <text x={cx} y={cy + 4} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize="11" letterSpacing="0.12em" fontWeight="700"
        fill={ink}>{center.label}</text>
    </svg>
  );
}

window.AgentConstellation = AgentConstellation;
