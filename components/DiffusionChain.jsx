// components/DiffusionChain.jsx — forward + reverse diffusion progression.
// Sequence of squares from noise (right) to clean data (left), with particles
// per square showing structure dissolving.
//
// Props:
//   steps: number of timesteps to show (default 7)
//   showForward: bool — show "clean → noise" arrow above
//   showReverse: bool — show "noise → clean" arrow below
//   width, height, mode

function DiffusionChain({
  steps = 7,
  showForward = true,
  showReverse = true,
  width = 760,
  height = 280,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  const padX = 40;
  const padY = showForward ? 60 : 24;
  const usableW = width - padX * 2;
  const dx = usableW / (steps - 1);
  const boxSize = Math.min(64, dx * 0.66);
  const midY = height / 2;

  // Deterministic noise field per timestep
  const rng = (i, k) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Each step's "noise level" α — left = clean (α=0), right = pure noise (α=1)
  const steps_data = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return { t, alpha: t };
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Forward arrow (top, clean → noise) */}
      {showForward && (
        <g>
          <line x1={padX + boxSize / 2} y1={padY - 22}
            x2={padX + usableW - boxSize / 2} y2={padY - 22}
            stroke={blue} strokeWidth="0.9" opacity="0.6" />
          <polygon points={`${padX + usableW - boxSize / 2},${padY - 22} ${padX + usableW - boxSize / 2 - 7},${padY - 25} ${padX + usableW - boxSize / 2 - 7},${padY - 19}`}
            fill={blue} opacity="0.8" />
          <text x={padX + usableW / 2} y={padY - 32} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="10"
            letterSpacing="0.12em" fill={blue}>
            // FORWARD · q(x_t | x_0) — add noise
          </text>
        </g>
      )}

      {/* Boxes + particles per timestep */}
      {steps_data.map((s, i) => {
        const cx = padX + dx * i;
        const cy = midY;
        const numParticles = 35;

        // Generate particles per step
        // At α=0 (clean) particles form a tight cluster in middle.
        // At α=1 (noise) particles fill the box uniformly.
        const particles = Array.from({ length: numParticles }, (_, k) => {
          const u = rng(i, k);
          const v = rng(i, k + 1000);

          // structured position: cluster center
          const cxStruct = 0;
          const cyStruct = 0;

          // noisy position: uniform
          const cxNoise = (u - 0.5) * (boxSize - 8);
          const cyNoise = (v - 0.5) * (boxSize - 8);

          // interpolate
          const px = cx + cxStruct * (1 - s.alpha) + cxNoise * s.alpha;
          const py = cy + cyStruct * (1 - s.alpha) + cyNoise * s.alpha;
          return { px, py };
        });

        // step color: blends blue (clean) → violet (noise)
        const col = s.alpha < 0.5 ? blue : violet;

        return (
          <g key={i}>
            <rect x={cx - boxSize / 2} y={cy - boxSize / 2}
              width={boxSize} height={boxSize}
              fill={card} stroke={col} strokeWidth="1" rx="3" />
            {particles.map((p, k) => (
              <circle key={k} cx={p.px} cy={p.py} r="1.1"
                fill={col} opacity={0.45 + (1 - Math.abs(s.alpha - 0.5)) * 0.4} />
            ))}
            {/* time label */}
            <text x={cx} y={cy + boxSize / 2 + 16} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace" fontSize="9"
              letterSpacing="0.08em" fill={muted}>
              {`t=${i}`}
            </text>
          </g>
        );
      })}

      {/* Step labels at ends */}
      <text x={padX} y={height - 8} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.12em" fill={blue}>x_0 · DATA</text>
      <text x={padX + usableW} y={height - 8} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.12em" fill={violet}>x_T · NOISE</text>

      {/* Reverse arrow (bottom, noise → clean) */}
      {showReverse && (
        <g>
          <line x1={padX + usableW - boxSize / 2} y1={height - padY + 4}
            x2={padX + boxSize / 2} y2={height - padY + 4}
            stroke={violet} strokeWidth="0.9" opacity="0.6" />
          <polygon points={`${padX + boxSize / 2},${height - padY + 4} ${padX + boxSize / 2 + 7},${height - padY + 1} ${padX + boxSize / 2 + 7},${height - padY + 7}`}
            fill={violet} opacity="0.8" />
          <text x={padX + usableW / 2} y={height - padY + 16} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="10"
            letterSpacing="0.12em" fill={violet}>
            {"// REVERSE · p_θ(x_{t-1} | x_t) — learned denoising"}
          </text>
        </g>
      )}
    </svg>
  );
}

window.DiffusionChain = DiffusionChain;
