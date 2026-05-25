// components/GAN.jsx — Generator + Discriminator adversarial diagram.
// Shows: noise z → G → fake x; real x; both → D → real/fake score;
// loss flowing back to G and D (the adversarial game).
//
// Props: width, height, mode

function GAN({
  width = 720,
  height = 360,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  // Three columns: noise/real, G/fake, D, score
  const padX = 30, padY = 30;
  const midY = height / 2;
  const colW = 80, colH = 50;
  const xZ = padX + 30;            // z noise
  const xG = padX + 180;           // Generator
  const xF = padX + 320;           // x_fake
  const xR = padX + 320;           // x_real (mirror of fake)
  const xD = padX + 470;           // Discriminator
  const xS = padX + 620;           // Score y∈{0,1}

  // y positions
  const yReal = midY - 80;
  const yFake = midY + 80;

  const arrow = (x1, y1, x2, y2, color, opacity = 0.85, dashed = false, label = null) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth="0.9" opacity={opacity}
        strokeDasharray={dashed ? "4 3" : "none"} />
      <polygon points={`${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}`}
        transform={`rotate(${Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI}, ${x2}, ${y2})`}
        fill={color} opacity={opacity} />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.06em" fill={muted}>{label}</text>
      )}
    </g>
  );

  const pill = (x, y, w, h, label, sub, accent) => (
    <g>
      <rect x={x - w/2} y={y - h/2} width={w} height={h}
        fill={card} stroke={accent} strokeWidth="1.2" rx="4" />
      <text x={x} y={y + 3} textAnchor="middle"
        fontFamily="Space Grotesk, sans-serif" fontWeight="600"
        fontSize="13" fill={ink}>{label}</text>
      {sub && (
        <text x={x} y={y + h/2 + 12} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.08em" fill={muted}>{sub}</text>
      )}
    </g>
  );

  // Mini "image" glyphs for fake/real (a few overlapping squares)
  const imgGlyph = (cx, cy, color) => (
    <g>
      {[0, 1, 2].map(k => (
        <rect key={k}
          x={cx - 14 + k * 3} y={cy - 14 + k * 3}
          width={28} height={28}
          fill="none" stroke={color} strokeWidth="0.7"
          opacity={0.35 + k * 0.25} />
      ))}
    </g>
  );

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Title strip */}
      <text x={width / 2} y={18} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="10"
        letterSpacing="0.18em" fill={muted}>// THE ADVERSARIAL GAME</text>

      {/* z (noise) */}
      <g>
        <rect x={xZ - 26} y={yFake - 18} width={52} height={36}
          fill={card} stroke={muted} strokeWidth="0.8" rx="3" strokeDasharray="3 2" />
        <text x={xZ} y={yFake - 1} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="700"
          fontSize="14" fill={ink}>z</text>
        <text x={xZ} y={yFake + 12} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8"
          letterSpacing="0.08em" fill={muted}>NOISE</text>
      </g>

      {/* z → G */}
      {arrow(xZ + 28, yFake, xG - colW/2 - 4, yFake, blue)}

      {/* Generator */}
      {pill(xG, yFake, colW, colH, "G", "GENERATOR", violet)}

      {/* G → x_fake */}
      {arrow(xG + colW/2, yFake, xF - 22, yFake, violet)}

      {/* x_fake */}
      <g>
        {imgGlyph(xF, yFake, violet)}
        <text x={xF} y={yFake + 38} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.08em" fill={violet}>x̂  · FAKE</text>
      </g>

      {/* Real data (top branch) */}
      <g>
        {imgGlyph(xR, yReal, blue)}
        <text x={xR} y={yReal + 38} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.08em" fill={blue}>x  · REAL</text>
      </g>

      {/* both → D */}
      {arrow(xF + 18, yFake, xD - colW/2 - 4, midY + 8, blue, 0.7)}
      {arrow(xR + 18, yReal, xD - colW/2 - 4, midY - 8, blue, 0.7)}

      {/* Discriminator */}
      {pill(xD, midY, colW, colH, "D", "DISCRIMINATOR", blue)}

      {/* D → y (real/fake) */}
      {arrow(xD + colW/2, midY, xS - 18, midY, blue)}

      {/* Output score */}
      <g>
        <circle cx={xS} cy={midY} r="20" fill={card}
          stroke={violet} strokeWidth="1.4" />
        <text x={xS} y={midY + 4} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="700"
          fontSize="14" fill={ink}>ŷ</text>
        <text x={xS} y={midY + 36} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.08em" fill={muted}>REAL / FAKE</text>
      </g>

      {/* Loss feedback arrows */}
      {/* D loss → D (above D) */}
      <g>
        <path d={`M ${xS - 8} ${midY - 22} Q ${(xS + xD) / 2} ${midY - 56}, ${xD + 8} ${midY - colH/2 - 4}`}
          stroke={blue} strokeWidth="0.6" fill="none" opacity="0.55"
          strokeDasharray="3 3" />
        <text x={(xS + xD) / 2} y={midY - 50} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.06em" fill={blue}>∇ ℒ_D</text>
      </g>
      {/* G loss → G (below) */}
      <g>
        <path d={`M ${xS - 8} ${midY + 22} Q ${(xS + xG) / 2} ${midY + 110}, ${xG} ${yFake + colH/2 + 4}`}
          stroke={violet} strokeWidth="0.6" fill="none" opacity="0.55"
          strokeDasharray="3 3" />
        <text x={(xS + xG) / 2} y={midY + 116} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="9"
          letterSpacing="0.06em" fill={violet}>∇ ℒ_G</text>
      </g>
    </svg>
  );
}

window.GAN = GAN;
