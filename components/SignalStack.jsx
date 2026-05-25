// components/SignalStack.jsx — stacked horizontal "waveform" tracks
// feeding into a fusion node, then a single output prediction node.

function SignalStack({
  tracks = [
    { label: "VIDEO", color: "blue" },
    { label: "DEPTH", color: "violet" },
    { label: "IMU", color: "blue" },
    { label: "HEALTH", color: "violet" },
  ],
  width = 720,
  height = 360,
  mode = "dark",
}) {
  const blue = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const muted = mode === "paper" ? "#94a3b8" : "#475569";
  const ink = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const cardFill = mode === "paper" ? "#ffffff" : "#0a1428";

  const padL = 16;
  const trackArea = { x: padL, y: 16, w: width * 0.58, h: height - 32 };
  const trackH = trackArea.h / tracks.length;
  const fusionX = trackArea.x + trackArea.w + 70;
  const outputX = fusionX + 130;
  const cy = height / 2;

  // build deterministic waveform points
  const wavePts = (idx, segments = 64) => {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const a = Math.sin(t * Math.PI * 6 + idx * 1.3);
      const b = Math.sin(t * Math.PI * 14 + idx * 2.1) * 0.4;
      const c = Math.sin(t * Math.PI * 3 + idx * 0.7) * 0.6;
      pts.push((a + b + c) / 2.2);
    }
    return pts;
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {tracks.map((tr, i) => {
        const col = tr.color === "violet" ? violet : blue;
        const yMid = trackArea.y + trackH * (i + 0.5);
        const yAmp = trackH * 0.32;
        const pts = wavePts(i);
        const pathD = pts.map((v, j) => {
          const x = trackArea.x + 70 + (j / (pts.length - 1)) * (trackArea.w - 80);
          const y = yMid + v * yAmp;
          return `${j === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ");
        return (
          <g key={i}>
            {/* label */}
            <text x={trackArea.x + 6} y={yMid + 4}
              fontFamily="JetBrains Mono, monospace"
              fontSize="10" letterSpacing="0.1em"
              fill={col}>{tr.label}</text>
            {/* baseline */}
            <line
              x1={trackArea.x + 70} y1={yMid}
              x2={trackArea.x + trackArea.w - 10} y2={yMid}
              stroke={muted} strokeWidth="0.5" opacity="0.4" strokeDasharray="2 3" />
            {/* waveform */}
            <path d={pathD} fill="none" stroke={col} strokeWidth="1.2" />
            {/* end node */}
            <circle cx={trackArea.x + trackArea.w - 10} cy={yMid} r="3" fill={col} />
            {/* fusion connector */}
            <line
              x1={trackArea.x + trackArea.w - 10} y1={yMid}
              x2={fusionX - 24} y2={cy}
              stroke={col} strokeWidth="0.7" opacity="0.45" />
          </g>
        );
      })}

      {/* fusion node */}
      <g>
        <circle cx={fusionX} cy={cy} r="32" fill="none"
          stroke={blue} strokeWidth="0.6" opacity="0.4" />
        <circle cx={fusionX} cy={cy} r="22" fill={cardFill}
          stroke={blue} strokeWidth="1.2" />
        <text x={fusionX} y={cy + 4} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9" letterSpacing="0.1em"
          fill={ink}>FUSE</text>
        {/* arrow to output */}
        <line x1={fusionX + 22} y1={cy} x2={outputX - 22} y2={cy}
          stroke={violet} strokeWidth="0.9" />
        <polygon
          points={`${outputX - 22},${cy} ${outputX - 28},${cy - 4} ${outputX - 28},${cy + 4}`}
          fill={violet} />
      </g>

      {/* output node */}
      <g>
        <circle cx={outputX} cy={cy} r="34" fill="none"
          stroke={violet} strokeWidth="0.6" opacity="0.4" />
        <circle cx={outputX} cy={cy} r="22" fill={cardFill}
          stroke={violet} strokeWidth="1.2" />
        <text x={outputX} y={cy + 4} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9" letterSpacing="0.1em"
          fill={ink}>ŷ</text>
      </g>
    </svg>
  );
}

window.SignalStack = SignalStack;
