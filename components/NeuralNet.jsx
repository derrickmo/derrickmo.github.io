// components/NeuralNet.jsx — parameterized feedforward network diagram
// Props:
//   layers: number[]              e.g. [5,7,6,5,4]
//   width, height                 SVG dimensions
//   mode: "dark" | "paper"
//   palette: ["blue", "violet"] alternating per layer; or fixed
//   glow: 0..1                    halo intensity (dark mode only)
//   pulse: bool                   animated active centers

function NeuralNet({
  layers = [5, 7, 6, 5, 4],
  width = 720,
  height = 480,
  mode = "dark",
  glow = 0.7,
  pulse = false,
}) {
  const blue = mode === "paper" ? "#2563eb" : "#3b82f6";
  const blueLt = mode === "paper" ? "#3b82f6" : "#93c5fd";
  const violet = mode === "paper" ? "#7c3aed" : "#a855f7";
  const violetLt = mode === "paper" ? "#a855f7" : "#c084fc";
  const nodeFill = mode === "paper" ? "#ffffff" : "#e0e7ff";
  const edgeBase = mode === "paper" ? "#0a1428" : "#93c5fd";

  const pad = { x: 60, y: 40 };
  const usableW = width - pad.x * 2;
  const usableH = height - pad.y * 2;
  const dx = layers.length > 1 ? usableW / (layers.length - 1) : 0;
  const nodeR = 7;
  const haloR = 18;

  // Compute positions
  const layerNodes = layers.map((count, li) => {
    const colX = pad.x + dx * li;
    const colColor = li % 2 === 0 ? blue : violet;
    const colColorLt = li % 2 === 0 ? blueLt : violetLt;
    return Array.from({ length: count }, (_, ni) => {
      const stepY = usableH / Math.max(count, 1);
      const y = pad.y + stepY * (ni + 0.5);
      return { x: colX, y, color: colColor, colorLt: colColorLt, li, ni };
    });
  });

  // Edges between adjacent layers — deterministic opacity per pair
  const rng = (a, b) => {
    const x = Math.sin(a * 31.7 + b * 17.3) * 9173.13;
    return x - Math.floor(x);
  };
  const edges = [];
  for (let li = 0; li < layerNodes.length - 1; li++) {
    const a = layerNodes[li];
    const b = layerNodes[li + 1];
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        const w = rng(li * 100 + i, j);
        edges.push({
          x1: a[i].x, y1: a[i].y,
          x2: b[j].x, y2: b[j].y,
          opacity: 0.08 + w * 0.42,
          color: w > 0.5 ? blueLt : violetLt,
        });
      }
    }
  }

  const haloOpacity = mode === "paper" ? 0 : glow * 0.55;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <radialGradient id="haloBlue">
          <stop offset="0%" stopColor={blueLt} stopOpacity={haloOpacity} />
          <stop offset="100%" stopColor={blueLt} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="haloViolet">
          <stop offset="0%" stopColor={violetLt} stopOpacity={haloOpacity} />
          <stop offset="100%" stopColor={violetLt} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* edges */}
      <g>
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={e.color}
            strokeWidth="0.6"
            opacity={e.opacity}
          />
        ))}
      </g>
      {/* nodes */}
      <g>
        {layerNodes.flat().map((n, i) => (
          <g key={i}>
            {mode !== "paper" && (
              <circle cx={n.x} cy={n.y} r={haloR}
                fill={`url(#${n.li % 2 === 0 ? "haloBlue" : "haloViolet"})`} />
            )}
            <circle cx={n.x} cy={n.y} r={nodeR}
              fill={mode === "paper" ? "#ffffff" : "#0a1428"}
              stroke={n.color} strokeWidth="1.2" />
            <circle cx={n.x} cy={n.y} r={nodeR * 0.42}
              fill={nodeFill}>
              {pulse && (
                <animate attributeName="opacity"
                  values="1;0.4;1" dur={`${1.6 + ((i * 0.13) % 1.4)}s`} repeatCount="indefinite" />
              )}
            </circle>
          </g>
        ))}
      </g>
      {/* layer captions (mono, tiny, below) */}
      <g>
        {layers.map((count, li) => (
          <text key={li}
            x={pad.x + dx * li}
            y={height - 12}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
            letterSpacing="0.1em"
            fill={mode === "paper" ? "#94a3b8" : "#475569"}>
            L{li}::{count}
          </text>
        ))}
      </g>
    </svg>
  );
}

window.NeuralNet = NeuralNet;
