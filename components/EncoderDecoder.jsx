// components/EncoderDecoder.jsx — hourglass encoder→bottleneck→decoder diagram.
// Covers autoencoders, VAEs, U-Net (without skips), seq2seq concept.
//
// Props:
//   leftStages, rightStages: arrays of { w, label } where w is visual width
//   bottleneck: { label, sub }
//   showSkips: bool — for U-Net style, draw skip connections between mirror layers
//   width, height, mode

function EncoderDecoder({
  leftStages = [
    { w: 100, label: "INPUT" },
    { w: 76,  label: "ENC·1" },
    { w: 56,  label: "ENC·2" },
    { w: 36,  label: "ENC·3" },
  ],
  rightStages = [
    { w: 36,  label: "DEC·1" },
    { w: 56,  label: "DEC·2" },
    { w: 76,  label: "DEC·3" },
    { w: 100, label: "OUTPUT" },
  ],
  bottleneck = { label: "z", sub: "LATENT" },
  showSkips = false,
  width = 720,
  height = 320,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  const padX = 30;
  const midY = height / 2;
  const totalStages = leftStages.length + rightStages.length;
  const usableW = width - padX * 2 - 80; // 80 reserved for bottleneck
  const dx = usableW / (totalStages - 1);
  const stageW = 22;
  const maxH = Math.min(140, height - 80);

  // Compute positions
  const positions = [];
  for (let i = 0; i < leftStages.length; i++) {
    positions.push({
      x: padX + dx * i,
      stage: leftStages[i],
      side: "left",
      idx: i,
    });
  }
  // Bottleneck position
  const bnX = padX + dx * (leftStages.length - 1) + dx / 2 + 40;
  const bnY = midY;

  for (let i = 0; i < rightStages.length; i++) {
    positions.push({
      x: padX + dx * (leftStages.length + i) + 80,
      stage: rightStages[i],
      side: "right",
      idx: i,
    });
  }

  // Render stage as a tall rectangle proportional to "w"
  const renderStage = (p) => {
    const h = (p.stage.w / 100) * maxH;
    const col = p.side === "left" ? blue : violet;
    return (
      <g key={`s${p.side}-${p.idx}`}>
        <rect
          x={p.x - stageW / 2} y={midY - h / 2}
          width={stageW} height={h}
          fill={card} stroke={col} strokeWidth="1" rx="2" />
        <text x={p.x} y={midY + h / 2 + 14}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9" letterSpacing="0.08em"
          fill={col}>{p.stage.label}</text>
      </g>
    );
  };

  // Arrows between stages
  const arrows = [];
  // left side: stage → stage
  for (let i = 0; i < leftStages.length - 1; i++) {
    const x1 = positions[i].x + stageW / 2 + 2;
    const x2 = positions[i + 1].x - stageW / 2 - 4;
    arrows.push(
      <line key={`la${i}`}
        x1={x1} y1={midY} x2={x2} y2={midY}
        stroke={blue} strokeWidth="0.7" opacity="0.6" />
    );
  }
  // last left stage → bottleneck
  arrows.push(
    <line key="lb"
      x1={positions[leftStages.length - 1].x + stageW / 2 + 2}
      y1={midY}
      x2={bnX - 24}
      y2={midY}
      stroke={blue} strokeWidth="0.7" opacity="0.6" />
  );
  // bottleneck → first right stage
  arrows.push(
    <line key="bd"
      x1={bnX + 24}
      y1={midY}
      x2={positions[leftStages.length].x - stageW / 2 - 4}
      y2={midY}
      stroke={violet} strokeWidth="0.7" opacity="0.6" />
  );
  // right side: stage → stage
  for (let i = 0; i < rightStages.length - 1; i++) {
    const pi = leftStages.length + i;
    const x1 = positions[pi].x + stageW / 2 + 2;
    const x2 = positions[pi + 1].x - stageW / 2 - 4;
    arrows.push(
      <line key={`ra${i}`}
        x1={x1} y1={midY} x2={x2} y2={midY}
        stroke={violet} strokeWidth="0.7" opacity="0.6" />
    );
  }

  // Skip connections (U-Net style)
  const skips = [];
  if (showSkips) {
    const n = Math.min(leftStages.length - 1, rightStages.length - 1);
    for (let i = 0; i < n; i++) {
      const left = positions[i];
      const right = positions[leftStages.length + rightStages.length - 2 - i];
      const arcY = midY - maxH / 2 - 30 - i * 10;
      skips.push(
        <path key={`sk${i}`}
          d={`M ${left.x} ${midY - (left.stage.w / 100 * maxH) / 2 - 4}
              Q ${(left.x + right.x) / 2} ${arcY},
                ${right.x} ${midY - (right.stage.w / 100 * maxH) / 2 - 4}`}
          stroke={muted} strokeWidth="0.6" fill="none"
          strokeDasharray="3 3" opacity="0.55" />
      );
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {skips}
      {arrows}
      {positions.map(renderStage)}

      {/* Bottleneck node */}
      <g>
        <circle cx={bnX} cy={bnY} r="28" fill="none"
          stroke={muted} strokeWidth="0.5" opacity="0.5"
          strokeDasharray="2 3" />
        <circle cx={bnX} cy={bnY} r="20"
          fill={card} stroke={blue} strokeWidth="1.4" />
        <text x={bnX} y={bnY + 4} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="700"
          fontSize="16" fill={ink}>{bottleneck.label}</text>
        <text x={bnX} y={bnY + 38} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9" letterSpacing="0.1em" fill={muted}>{bottleneck.sub}</text>
      </g>

      {/* Section dividers */}
      <text x={padX + dx * (leftStages.length - 1) / 2} y={height - 8}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.12em" fill={muted}>// ENCODER →</text>
      <text x={positions[leftStages.length].x + dx * (rightStages.length - 1) / 2} y={height - 8}
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.12em" fill={muted}>// ← DECODER</text>
    </svg>
  );
}

window.EncoderDecoder = EncoderDecoder;
