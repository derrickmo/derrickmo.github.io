// components/CNN.jsx — convolutional network diagram.
// Series of "stages" showing feature maps shrinking spatially + deepening
// in channels. Each stage = stack of overlapping rectangles.
//
// Props:
//   stages: [{ w, h, c, type, label }]
//     w, h = spatial size hint (relative); c = channel count (visual depth)
//     type = "input" | "conv" | "pool" | "fc" | "output"
//     label = optional caption (e.g. "5×5 conv, 32")
//   width, height: total SVG size
//   mode: "dark" | "paper"

function CNN({
  stages = [
    { w: 64, h: 64, c: 1,   type: "input",  label: "IMG" },
    { w: 56, h: 56, c: 6,   type: "conv",   label: "C1·6" },
    { w: 28, h: 28, c: 6,   type: "pool",   label: "P1" },
    { w: 24, h: 24, c: 16,  type: "conv",   label: "C2·16" },
    { w: 12, h: 12, c: 16,  type: "pool",   label: "P2" },
    { w: 4,  h: 4,  c: 120, type: "fc",     label: "FC·120" },
    { w: 4,  h: 4,  c: 10,  type: "output", label: "Y·10" },
  ],
  width = 760,
  height = 280,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  const colorFor = (type) => {
    if (type === "input")  return blue;
    if (type === "conv")   return blue;
    if (type === "pool")   return muted;
    if (type === "fc")     return violet;
    if (type === "output") return violet;
    return blue;
  };

  // Layout
  const padX = 24, padY = 36;
  const usableW = width - padX * 2;
  const gap = usableW / stages.length;
  const maxSpatial = Math.max(...stages.map(s => Math.max(s.w, s.h)));
  const spatialScale = Math.min(100, (height - padY * 2) * 0.6) / maxSpatial;

  // Each stage rendered as a stack of overlapping squares
  const renderStage = (s, i) => {
    const cx = padX + gap * i + gap / 2;
    const cy = height / 2;
    const col = colorFor(s.type);

    // limit visible channels to keep it readable
    const visibleChannels = Math.min(s.c, 6);
    const sw = Math.max(8, s.w * spatialScale);
    const sh = Math.max(8, s.h * spatialScale);
    const offset = 3; // px offset per channel
    const totalOffset = (visibleChannels - 1) * offset;

    const elems = [];
    for (let k = visibleChannels - 1; k >= 0; k--) {
      const ox = -totalOffset / 2 + k * offset;
      const oy = -totalOffset / 2 + k * offset;
      const opacity = 0.35 + (0.65 * k) / Math.max(visibleChannels - 1, 1);
      elems.push(
        <rect key={k}
          x={cx - sw / 2 + ox} y={cy - sh / 2 + oy}
          width={sw} height={sh}
          fill={card}
          stroke={col} strokeWidth={k === visibleChannels - 1 ? 1.2 : 0.6}
          opacity={opacity} />
      );
    }
    // Label below
    return (
      <g key={i}>
        {elems}
        {/* spatial dim caption */}
        <text x={cx} y={cy + sh / 2 + totalOffset / 2 + 16}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.08em" fill={col}>{s.label}</text>
        {/* channel count caption (tiny, above stack) */}
        {s.c > 1 && (
          <text x={cx} y={cy - sh / 2 - totalOffset / 2 - 8}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8"
            letterSpacing="0.06em" fill={muted}>×{s.c}</text>
        )}
      </g>
    );
  };

  // Arrows between stages
  const arrows = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const x1 = padX + gap * i + gap / 2 + 0;
    const x2 = padX + gap * (i + 1) + gap / 2 - 0;
    const ax1 = x1 + gap * 0.32;
    const ax2 = x2 - gap * 0.32;
    arrows.push(
      <g key={`a${i}`}>
        <line x1={ax1} y1={height / 2} x2={ax2 - 5} y2={height / 2}
          stroke={muted} strokeWidth="0.7" opacity="0.7" />
        <polygon points={`${ax2},${height / 2} ${ax2 - 5},${height / 2 - 3} ${ax2 - 5},${height / 2 + 3}`}
          fill={muted} opacity="0.85" />
      </g>
    );
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* baseline */}
      <line x1={padX} y1={height - 16} x2={width - padX} y2={height - 16}
        stroke={muted} strokeWidth="0.4" opacity="0.3" strokeDasharray="2 3" />
      {arrows}
      {stages.map((s, i) => renderStage(s, i))}
    </svg>
  );
}

window.CNN = CNN;
