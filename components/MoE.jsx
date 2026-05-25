// components/MoE.jsx — Mixture of Experts routing diagram.
// Input → Router → top-k experts (highlighted) → weighted sum → output.
// Visually shows sparse activation (only some experts light up).
//
// Props:
//   numExperts: number of experts (default 8)
//   topK: number activated (default 2)
//   activated: array of expert indices (default first topK)
//   width, height, mode

function MoE({
  numExperts = 8,
  topK = 2,
  activated = null,
  width = 720,
  height = 360,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  // Deterministically pick activated experts if not provided
  const active = activated || (() => {
    // Pick experts at varied positions for visual interest
    const positions = [Math.floor(numExperts * 0.25), Math.floor(numExperts * 0.65)];
    return positions.slice(0, topK);
  })();
  const activeSet = new Set(active);

  // Random-ish gate weights (visual only)
  const gateWeight = (i) => {
    if (i === active[0]) return 0.62;
    if (i === active[1]) return 0.38;
    return 0;
  };

  // Layout: input | router | experts column | output
  const xIn = 50;
  const xRouter = 180;
  const xExperts = 360;
  const xOut = 590;
  const midY = height / 2;

  // Expert positions: column of boxes
  const eW = 100, eH = 30;
  const eGap = 6;
  const eTotal = numExperts * eH + (numExperts - 1) * eGap;
  const eYTop = midY - eTotal / 2;

  const expertY = (i) => eYTop + i * (eH + eGap) + eH / 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Title strip */}
      <text x={width / 2} y={18} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="10"
        letterSpacing="0.18em" fill={muted}>
        // SPARSE ACTIVATION · TOP-{topK} OF {numExperts}
      </text>

      {/* Input */}
      <g>
        <rect x={xIn - 26} y={midY - 18} width={52} height={36}
          fill={card} stroke={blue} strokeWidth="1.2" rx="3" />
        <text x={xIn} y={midY - 1} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="700"
          fontSize="14" fill={ink}>x</text>
        <text x={xIn} y={midY + 12} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8"
          letterSpacing="0.08em" fill={muted}>INPUT</text>
      </g>

      {/* In → Router */}
      <line x1={xIn + 26} y1={midY} x2={xRouter - 36} y2={midY}
        stroke={blue} strokeWidth="0.9" opacity="0.8" />
      <polygon points={`${xRouter - 30},${midY} ${xRouter - 36},${midY - 3} ${xRouter - 36},${midY + 3}`}
        fill={blue} />

      {/* Router (small box) */}
      <g>
        <rect x={xRouter - 36} y={midY - 22} width={72} height={44}
          fill={card} stroke={violet} strokeWidth="1.2" rx="4" />
        <text x={xRouter} y={midY - 4} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="600"
          fontSize="13" fill={ink}>Router</text>
        <text x={xRouter} y={midY + 12} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8"
          letterSpacing="0.08em" fill={muted}>SOFTMAX·TOPK</text>
      </g>

      {/* Router → experts (lines, highlighted for active) */}
      {Array.from({ length: numExperts }).map((_, i) => {
        const isActive = activeSet.has(i);
        const y = expertY(i);
        const w = gateWeight(i);
        return (
          <g key={`r${i}`}>
            <line x1={xRouter + 36} y1={midY} x2={xExperts - eW / 2 - 4} y2={y}
              stroke={isActive ? violet : muted}
              strokeWidth={isActive ? 1.1 : 0.5}
              opacity={isActive ? 0.85 : 0.3}
              strokeDasharray={isActive ? "none" : "2 2"} />
            {isActive && (
              <text
                x={(xRouter + 36 + xExperts - eW / 2 - 4) / 2}
                y={(midY + y) / 2 - 4}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace" fontSize="9"
                letterSpacing="0.06em" fill={violet}>
                w={w.toFixed(2)}
              </text>
            )}
          </g>
        );
      })}

      {/* Experts */}
      {Array.from({ length: numExperts }).map((_, i) => {
        const isActive = activeSet.has(i);
        const y = expertY(i);
        return (
          <g key={`e${i}`}>
            <rect x={xExperts - eW / 2} y={y - eH / 2}
              width={eW} height={eH}
              fill={card}
              stroke={isActive ? violet : muted}
              strokeWidth={isActive ? 1.2 : 0.6}
              opacity={isActive ? 1 : 0.45}
              rx="3" />
            <text x={xExperts} y={y + 4} textAnchor="middle"
              fontFamily="Space Grotesk, sans-serif" fontWeight={isActive ? 600 : 400}
              fontSize="12" fill={isActive ? ink : muted}>
              Expert {i + 1}
            </text>
            {isActive && (
              <circle cx={xExperts + eW / 2 - 8} cy={y - eH / 2 + 8} r="2.5"
                fill={violet}>
                <animate attributeName="opacity"
                  values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* Active experts → output (weighted sum) */}
      {[...activeSet].map((i, k) => {
        const y = expertY(i);
        return (
          <line key={`o${k}`}
            x1={xExperts + eW / 2} y1={y}
            x2={xOut - 28} y2={midY}
            stroke={violet} strokeWidth="0.9" opacity="0.7" />
        );
      })}

      {/* Output (sum) */}
      <g>
        <circle cx={xOut} cy={midY} r="22" fill={card}
          stroke={violet} strokeWidth="1.4" />
        <text x={xOut} y={midY + 4} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="700"
          fontSize="16" fill={ink}>Σ</text>
        <text x={xOut} y={midY + 38} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.08em" fill={muted}>WEIGHTED SUM</text>
      </g>
    </svg>
  );
}

window.MoE = MoE;
