// visualize-app.jsx — page app for /visualize/index.html (the interactive ML
// libraries hub). How-it-works intro, demo card grid, "suggest a demo" CTA.

const {
  HudBrackets, GridOverlay, GlowBlob, MathWatermarks,
  NeuralNet,
  Section, Container, TopNav, Footer, MonoLabel, ConstructionBadge, useIsMobile,
} = window;

// ─── Glyphs (re-used from the landing skeleton) ──────────────
const GlyphNeuralNet = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[28, 80, 132].map(x => [30, 60, 90].map(y => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="3.6"
        fill={x === 80 ? "#c084fc" : "#60a5fa"} opacity="0.9" />
    )))}
    {[30, 60, 90].map(y1 => [30, 60, 90].map(y2 => (
      <g key={`l-${y1}-${y2}`}>
        <line x1="28" y1={y1} x2="80" y2={y2} stroke="#60a5fa" strokeWidth="0.5" opacity="0.4" />
        <line x1="80" y1={y1} x2="132" y2={y2} stroke="#c084fc" strokeWidth="0.5" opacity="0.4" />
      </g>
    )))}
  </svg>
);
const GlyphAttention = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 8 }).map((_, i) =>
      Array.from({ length: 8 }).map((_, j) => {
        const v = (Math.sin(i * 1.3 + j * 0.7) + 1) / 2;
        return <rect key={`${i}-${j}`} x={28 + j * 13} y={10 + i * 13} width="11" height="11"
          fill={v > 0.55 ? "#c084fc" : "#60a5fa"} opacity={0.2 + v * 0.7} />;
      })
    )}
  </svg>
);
const GlyphRL = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 6 }).map((_, i) =>
      Array.from({ length: 6 }).map((_, j) => (
        <rect key={`${i}-${j}`} x={28 + j * 16} y={14 + i * 16} width="16" height="16"
          fill="none" stroke="#60a5fa" strokeWidth="0.3" opacity="0.4" />
      ))
    )}
    <path d="M 36 22 L 36 38 L 52 38 L 52 70 L 84 70 L 84 102 L 116 102"
      stroke="#c084fc" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
    <circle cx="116" cy="102" r="4" fill="#c084fc" />
    <rect x="28" y="14" width="16" height="16" fill="#60a5fa" opacity="0.5" />
  </svg>
);
const GlyphDiffusion = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 5 }).map((_, i) => {
      const t = i / 4;
      return (
        <g key={i}>
          <rect x={14 + i * 28} y={36} width="22" height="44"
            fill="none" stroke="#60a5fa" strokeWidth="0.4" />
          {Array.from({ length: 40 }).map((_, k) => {
            const sx = 14 + i * 28 + (Math.sin(k * 7.3 + i * 2) + 1) * 11;
            const sy = 36 + (Math.cos(k * 5.1 + i * 1.5) + 1) * 22;
            return <circle key={k} cx={sx} cy={sy} r="0.7"
              fill="#c084fc" opacity={0.2 + t * 0.7} />;
          })}
        </g>
      );
    })}
  </svg>
);
const GlyphTokenizer = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {["Th", "e", "qu", "ick", "br", "own", "fox"].map((t, i) => {
      const x = 14 + i * 20;
      const col = i % 2 ? "#c084fc" : "#60a5fa";
      return (
        <g key={i}>
          <rect x={x} y={48} width="18" height="24" rx="2"
            fill="none" stroke={col} strokeWidth="0.8" />
          <text x={x + 9} y={64} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8" fill={col}>{t}</text>
        </g>
      );
    })}
  </svg>
);
const GlyphEmbedding = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 28 }).map((_, i) => {
      const a = (i / 28) * Math.PI * 2;
      const r = 38 + (i % 3) * 5;
      const x = 80 + Math.cos(a) * r;
      const y = 60 + Math.sin(a) * r;
      return <circle key={i} cx={x} cy={y} r="2.5"
        fill={i % 3 === 0 ? "#c084fc" : "#60a5fa"} opacity="0.8" />;
    })}
    <circle cx="80" cy="60" r="4" fill="#e0e7ff" />
  </svg>
);
const GlyphPath = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 7 }).map((_, i) =>
      Array.from({ length: 5 }).map((_, j) => (
        <rect key={`${i}-${j}`} x={20 + i * 18} y={14 + j * 18} width="16" height="16"
          fill="none" stroke="#60a5fa" strokeWidth="0.3" opacity="0.35" />
      ))
    )}
    <path d="M 28 22 L 28 76 L 82 76 L 82 40 L 136 40" stroke="#c084fc" strokeWidth="2" fill="none" />
    <rect x="21" y="15" width="14" height="14" fill="#3b82f6" />
    <rect x="129" y="33" width="14" height="14" fill="#a855f7" />
    {[[64,32],[100,58],[46,58]].map(([x,y],i)=>(
      <rect key={i} x={x} y={y} width="14" height="14" fill="#334155" opacity="0.9" />
    ))}
  </svg>
);
const GlyphKMeans = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[["#60a5fa",40,40],["#c084fc",112,46],["#93c5fd",70,90]].map(([c,cx,cy],k)=>(
      <g key={k}>
        {Array.from({length:6}).map((_,i)=>{
          const a=(i/6)*Math.PI*2, r=10+(i%2)*8;
          return <circle key={i} cx={cx+Math.cos(a)*r} cy={cy+Math.sin(a)*r} r="2.5" fill={c} opacity="0.8" />;
        })}
        <circle cx={cx} cy={cy} r="4" fill="none" stroke={c} strokeWidth="1.5" />
      </g>
    ))}
  </svg>
);
const GlyphGradient = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[44,34,24,14].map((r,i)=>(
      <ellipse key={i} cx="80" cy="60" rx={r*1.4} ry={r} fill="none" stroke="#60a5fa" strokeWidth="0.5" opacity={0.25+i*0.12} />
    ))}
    <path d="M 30 30 Q 56 52, 68 56 T 80 60" stroke="#c084fc" strokeWidth="2" fill="none" />
    <circle cx="30" cy="30" r="3" fill="#c084fc" />
    <circle cx="80" cy="60" r="4" fill="#e0e7ff" />
  </svg>
);

const GlyphCurveFit = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <path d="M 16 92 Q 48 14, 80 70 T 144 36" stroke="#c084fc" strokeWidth="2" fill="none" />
    {[[28,86],[52,40],[70,74],[96,56],[120,50],[136,40],[40,64],[108,46]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="3" fill="#60a5fa" opacity="0.85" />
    ))}
  </svg>
);
const GlyphDoubleDescent = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* the double-descent risk curve: dip, spike at P/N=1, dip again */}
    <line x1="78" y1="18" x2="78" y2="104" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="4 3" />
    <path d="M 16 64 Q 40 84, 60 78 Q 74 74, 78 30 Q 82 74, 100 70 Q 124 64, 144 56"
      stroke="#a855f7" strokeWidth="2.4" fill="none" />
    <path d="M 16 72 Q 50 88, 78 96 L 144 96" stroke="#34d399" strokeWidth="1.8" fill="none" opacity="0.85" />
    <text x="58" y="14" fontFamily="monospace" fontSize="9" fill="#fbbf24">P/N=1</text>
    <text x="14" y="116" fontFamily="monospace" fontSize="9" fill="#94a3b8">capacity →</text>
  </svg>
);
const GlyphBiasVariance = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* bias falling, variance rising, total U-curve */}
    <path d="M 18 28 Q 60 40, 142 92" stroke="#60a5fa" strokeWidth="2" fill="none" />
    <path d="M 18 96 Q 70 88, 142 24" stroke="#f87171" strokeWidth="2" fill="none" />
    <path d="M 18 50 Q 80 78, 142 50" stroke="#a855f7" strokeWidth="2.6" fill="none" />
    <circle cx="80" cy="71" r="3.5" fill="#a855f7" />
    <text x="20" y="116" fontFamily="monospace" fontSize="9" fill="#94a3b8">bias² + variance</text>
  </svg>
);
const GlyphBell = () => {
  const pts = Array.from({ length: 41 }, (_, i) => { const x = 16 + i * (128 / 40); const t = (i - 20) / 8; return `${x},${100 - 72 * Math.exp(-t * t / 2)}`; }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {[18, 36, 54, 70, 82, 70, 54, 36, 18].map((h, i) => <rect key={i} x={22 + i * 15} y={100 - h} width="12" height={h} fill="#60a5fa" opacity="0.32" />)}
      <polyline points={pts} stroke="#c084fc" strokeWidth="2" fill="none" />
    </svg>
  );
};
const GlyphActivation = () => {
  const sig = Array.from({ length: 41 }, (_, i) => { const x = 16 + i * (128 / 40); const z = (i - 20) / 4; return `${x},${88 - 58 / (1 + Math.exp(-z))}`; }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <line x1="16" y1="88" x2="144" y2="88" stroke="rgba(96,165,250,0.2)" strokeWidth="1" />
      <polyline points={sig} stroke="#60a5fa" strokeWidth="2" fill="none" />
      <path d="M 16 78 L 80 78 L 132 28" stroke="#c084fc" strokeWidth="2" fill="none" />
    </svg>
  );
};
const GlyphBatchNorm = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* widening (unnormalized) cloud vs re-standardized columns across depth */}
    {[0,1,2,3,4].map(l => {
      const x = 26 + l * 28, spread = 8 + l * 7; // grows with depth
      return <g key={`u${l}`}>
        <rect x={x-5} y={60-spread} width="10" height={2*spread} fill="rgba(248,113,113,0.18)" />
      </g>;
    })}
    {[0,1,2,3,4].map(l => {
      const x = 26 + l * 28; // BN keeps spread flat
      return <rect key={`n${l}`} x={x-3} y={48} width="6" height="24" fill="rgba(52,211,153,0.55)" />;
    })}
    <line x1="16" y1="60" x2="150" y2="60" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
    <text x="16" y="108" fontFamily="monospace" fontSize="9" fill="#94a3b8">flat std across depth</text>
  </svg>
);
const GlyphWeightInit = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* three std-vs-depth curves: explode (red), flat (blue), vanish hinted */}
    <line x1="20" y1="60" x2="146" y2="60" stroke="rgba(251,191,36,0.6)" strokeWidth="1.2" strokeDasharray="3 3" />
    <path d="M 22 60 L 50 50 L 78 30 L 106 16 L 134 8" stroke="#f87171" strokeWidth="2" fill="none" />
    <path d="M 22 60 L 50 58 L 78 61 L 106 59 L 134 60" stroke="#60a5fa" strokeWidth="2.4" fill="none" />
    <path d="M 22 60 L 50 74 L 78 90 L 106 100 L 134 106" stroke="#34d399" strokeWidth="1.6" fill="none" opacity="0.7" />
    <text x="92" y="74" fontFamily="monospace" fontSize="8" fill="#fbbf24">std=1</text>
    <text x="18" y="116" fontFamily="monospace" fontSize="9" fill="#94a3b8">init scale vs depth</text>
  </svg>
);
const GlyphContrastive = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* embeddings on a circle: paired positives close, items spread apart */}
    <circle cx="80" cy="58" r="40" fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth="1.4" />
    {[
      [18, "#60a5fa"], [30, "#60a5fa"], [150, "#a855f7"], [162, "#a855f7"],
      [262, "#34d399"], [274, "#34d399"], [330, "#fbbf24"], [342, "#fbbf24"],
    ].map(([deg, col], i) => {
      const t = deg * Math.PI / 180, x = 80 + 40 * Math.cos(t), y = 58 - 40 * Math.sin(t);
      return <circle key={i} cx={x} cy={y} r="4.5" fill={col} />;
    })}
    {/* a short link for one positive pair */}
    <path d="M 118 46 A 40 40 0 0 1 114 38" stroke="rgba(226,232,240,0.4)" strokeWidth="1.5" fill="none" />
    <text x="18" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">align + uniformity</text>
  </svg>
);
const GlyphKernel = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 3 }).map((_, r) => Array.from({ length: 3 }).map((_, c) => (
      <rect key={`${r}-${c}`} x={20 + c * 20} y={30 + r * 20} width="18" height="18" fill={r === 1 && c === 1 ? "#c084fc" : "rgba(96,165,250,0.3)"} stroke="#60a5fa" strokeWidth="0.5" />
    )))}
    <line x1="86" y1="58" x2="112" y2="58" stroke="#60a5fa" strokeWidth="1.5" />
    <polygon points="112,53 121,58 112,63" fill="#60a5fa" />
    <rect x="126" y="48" width="20" height="20" fill="#c084fc" opacity="0.6" />
  </svg>
);
const GlyphPositional = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 8 }).map((_, row) => Array.from({ length: 16 }).map((_, col) => {
      const v = Math.sin(col * (0.4 + row * 0.18) + row);
      return <rect key={`${row}-${col}`} x={16 + col * 8} y={16 + row * 11} width="7" height="10" fill={v > 0 ? "#c084fc" : "#22d3ee"} opacity={0.22 + Math.abs(v) * 0.6} />;
    }))}
  </svg>
);
const GlyphBandit = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[40, 74, 54, 94, 64].map((h, i) => (
      <g key={i}>
        <rect x={24 + i * 26} y={100 - h} width="18" height={h} fill={i === 3 ? "#34d399" : "#60a5fa"} opacity="0.55" />
        <circle cx={33 + i * 26} cy={100 - h - 8} r="3" fill={i === 3 ? "#34d399" : "#c084fc"} />
      </g>
    ))}
  </svg>
);
const GlyphTree = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[80, 28, 46, 62], [80, 28, 114, 62], [46, 62, 30, 96], [46, 62, 62, 96], [114, 62, 98, 96], [114, 62, 130, 96]].map(([x1, y1, x2, y2], i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#60a5fa" strokeWidth="1.2" opacity="0.7" />
    ))}
    <circle cx="80" cy="28" r="7" fill="#c084fc" />
    {[[46, 62], [114, 62]].map(([x, y], i) => <rect key={i} x={x - 6} y={y - 6} width="12" height="12" fill="#60a5fa" />)}
    {[[30, 96], [62, 96], [98, 96], [130, 96]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={i % 2 ? "#34d399" : "#60a5fa"} opacity="0.8" />)}
  </svg>
);
const GlyphBaggingBoosting = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* many faint stepwise tree fits averaging/summing into one bold curve */}
    {[0,1,2,3].map(k => (
      <path key={k} d={`M 16 ${70-k*4} L 52 ${52+k*6} L 52 ${52+k*6} L 92 ${66-k*5} L 92 ${66-k*5} L 144 ${40+k*3}`}
        stroke="rgba(248,113,113,0.25)" strokeWidth="1.2" fill="none" />
    ))}
    <path d="M 16 66 L 52 50 L 92 60 L 144 38" stroke="#a855f7" strokeWidth="2.6" fill="none" />
    <path d="M 16 60 Q 60 44, 144 44" stroke="rgba(52,211,153,0.55)" strokeWidth="1.6" fill="none" strokeDasharray="5 4" />
    <text x="18" y="108" fontFamily="monospace" fontSize="9" fill="#94a3b8">average vs stack trees</text>
  </svg>
);
const GlyphGaussianProcess = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* posterior mean with an uncertainty band that pinches at data points */}
    <path d="M 16 60 C 40 30, 50 30, 60 58 C 72 86, 96 30, 110 56 C 124 80, 140 50, 146 56
             L 146 64 C 140 70, 124 92, 110 68 C 96 46, 72 100, 60 70 C 50 44, 40 44, 16 72 Z"
      fill="rgba(96,165,250,0.18)" />
    <path d="M 16 66 C 40 37, 50 37, 60 64 C 72 92, 96 38, 110 62 C 124 86, 140 50, 146 60"
      stroke="#60a5fa" strokeWidth="2.2" fill="none" />
    {[[60, 64], [110, 62]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#e2e8f0" />)}
    <text x="18" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">mean ± uncertainty</text>
  </svg>
);
const GlyphKnn = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <circle cx="80" cy="60" r="38" fill="none" stroke="#60a5fa" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
    {[[60, 42, "#60a5fa"], [100, 48, "#c084fc"], [64, 84, "#60a5fa"], [104, 80, "#c084fc"], [80, 30, "#c084fc"], [50, 66, "#60a5fa"]].map(([x, y, c], i) => (
      <g key={i}><line x1="80" y1="60" x2={x} y2={y} stroke="rgba(96,165,250,0.3)" strokeWidth="0.8" /><circle cx={x} cy={y} r="3.5" fill={c} /></g>
    ))}
    {[[132, 28, "#60a5fa"], [24, 98, "#c084fc"]].map(([x, y, c], i) => <circle key={`o${i}`} cx={x} cy={y} r="3.5" fill={c} opacity="0.5" />)}
    <circle cx="80" cy="60" r="5" fill="#e0e7ff" />
  </svg>
);
const GlyphMarkov = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <path d="M 43 44 Q 60 64, 71 70" stroke="#60a5fa" strokeWidth="1.2" fill="none" />
    <path d="M 89 70 Q 108 60, 117 46" stroke="#c084fc" strokeWidth="1.2" fill="none" />
    <path d="M 80 63 L 80 41" stroke="#60a5fa" strokeWidth="1.2" fill="none" />
    <path d="M 118 34 Q 100 16, 89 26" stroke="#c084fc" strokeWidth="1.2" fill="none" />
    {[[34, 40], [80, 72], [126, 40], [80, 30]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="9" fill="#050816" stroke={i % 2 ? "#c084fc" : "#60a5fa"} strokeWidth="1.5" />
    ))}
  </svg>
);

const GlyphWave = () => {
  const f = (amp, freq) => Array.from({ length: 61 }, (_, i) => { const x = 16 + i * (128 / 60); return `${x},${60 - amp * Math.sin(i * freq)}`; }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <polyline points={f(10, 0.9)} stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5" />
      <polyline points={f(34, 0.3)} stroke="#c084fc" strokeWidth="2" fill="none" />
    </svg>
  );
};

const GlyphPCA = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 24 }).map((_, i) => {
      const a = (i / 24) * Math.PI * 2, r = 30 + (i % 4) * 6;
      const x = 80 + Math.cos(0.5) * Math.cos(a) * r * 1.5 - Math.sin(0.5) * Math.sin(a) * r * 0.4;
      const y = 60 + Math.sin(0.5) * Math.cos(a) * r * 1.5 + Math.cos(0.5) * Math.sin(a) * r * 0.4;
      return <circle key={i} cx={x} cy={y} r="2.6" fill="#60a5fa" opacity="0.8" />;
    })}
    <line x1="80" y1="60" x2={80 + Math.cos(0.5) * 52} y2={60 + Math.sin(0.5) * 52} stroke="#fbbf24" strokeWidth="2.4" />
    <line x1="80" y1="60" x2={80 - Math.sin(0.5) * 26} y2={60 + Math.cos(0.5) * 26} stroke="#34d399" strokeWidth="2.4" />
    <circle cx="80" cy="60" r="3.5" fill="#e0e7ff" />
  </svg>
);
const GlyphTSNE = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* three well-separated colored clusters of points */}
    {[[44, 42, "#60a5fa"], [116, 40, "#a855f7"], [78, 88, "#34d399"]].map(([cx, cy, col], c) => (
      Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2, r = 6 + (i % 3) * 5;
        return <circle key={`${c}-${i}`} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r="2.6" fill={col} opacity="0.85" />;
      })
    ))}
    <text x="20" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">neighbors → clusters</text>
  </svg>
);
const GlyphSpectral = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* two concentric rings, colored as separate clusters + a few edges */}
    {Array.from({ length: 14 }).map((_, i) => { const a = (i / 14) * Math.PI * 2; return <circle key={`o${i}`} cx={80 + 44 * Math.cos(a)} cy={60 + 38 * Math.sin(a)} r="3" fill="#a855f7" opacity="0.85" />; })}
    {Array.from({ length: 9 }).map((_, i) => { const a = (i / 9) * Math.PI * 2; return <circle key={`i${i}`} cx={80 + 18 * Math.cos(a)} cy={60 + 16 * Math.sin(a)} r="3" fill="#60a5fa" opacity="0.85" />; })}
    {Array.from({ length: 6 }).map((_, i) => { const a = (i / 6) * Math.PI * 2; return <line key={`e${i}`} x1={80 + 44 * Math.cos(a)} y1={60 + 38 * Math.sin(a)} x2={80 + 44 * Math.cos(a + 0.45)} y2={60 + 38 * Math.sin(a + 0.45)} stroke="rgba(148,163,184,0.3)" strokeWidth="1" />; })}
    <text x="22" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">connectivity clusters</text>
  </svg>
);
const GlyphWord2Vec = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* three small topic clusters of word vectors pulled together */}
    {[[40, 38, "#60a5fa"], [120, 44, "#a855f7"], [74, 92, "#34d399"]].map(([cx, cy, col], c) => (
      Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + c, r = 11;
        return <circle key={`${c}-${i}`} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r="2.8" fill={col} opacity="0.9" />;
      })
    ))}
    <text x="30" y="20" fontFamily="monospace" fontSize="9" fill="#60a5fa">cat</text>
    <text x="118" y="26" fontFamily="monospace" fontSize="9" fill="#a855f7">red</text>
    <text x="62" y="116" fontFamily="monospace" fontSize="9" fill="#34d399">run</text>
  </svg>
);
const GlyphKalman = () => {
  const xs = Array.from({ length: 13 }, (_, i) => 14 + i * 11);
  const tru = (x) => 60 + 30 * Math.sin((x - 14) * 0.05);
  const meas = [10, -14, 8, -10, 16, -6, 12, -16, 6, -8, 14, -4, 10];
  const est = "M " + xs.map((x) => `${x} ${tru(x)}`).join(" L ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {/* ±2σ band */}
      <path d={est + " L 156 80 L 14 80 Z"} fill="rgba(168,85,247,0.14)" stroke="none" />
      {/* true track */}
      <path d={est} fill="none" stroke="#34d399" strokeWidth="2" />
      {/* estimate (same shape, slightly offset look via dashes) */}
      <path d={est} fill="none" stroke="#a855f7" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.9" />
      {/* noisy measurements */}
      {xs.map((x, i) => <circle key={i} cx={x} cy={tru(x) + meas[i]} r="2.4" fill="#60a5fa" opacity="0.85" />)}
      <text x="20" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">predict + update</text>
    </svg>
  );
};
const GlyphHMM = () => {
  const cols = [22, 56, 90, 124], rows = [30, 60, 90];
  const cc = ["#34d399", "#fbbf24", "#f87171"];
  const path = [0, 1, 1, 2]; // chosen state per column
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {/* faint trellis edges */}
      {cols.slice(0, -1).map((x, t) => rows.map((y1, a) => rows.map((y2, b) => (
        <line key={`${t}-${a}-${b}`} x1={x} y1={y1} x2={cols[t + 1]} y2={y2} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
      ))))}
      {/* viterbi path */}
      <polyline points={cols.map((x, t) => `${x},${rows[path[t]]}`).join(" ")} fill="none" stroke="#a855f7" strokeWidth="2.4" />
      {/* nodes */}
      {cols.map((x, t) => rows.map((y, k) => (
        <circle key={`${t}-${k}`} cx={x} cy={y} r={path[t] === k ? 5 : 3.2} fill={cc[k]} opacity={path[t] === k ? 0.95 : 0.4} />
      )))}
      <text x="20" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">best hidden path</text>
    </svg>
  );
};
const GlyphKDE = () => {
  const pts = [38, 54, 66, 92, 104, 118];
  const bump = (c) => Array.from({ length: 21 }, (_, i) => { const x = c - 20 + i * 2; const y = 92 - 22 * Math.exp(-((x - c) ** 2) / 120); return `${x},${y}`; }).join(" ");
  const sumY = (x) => 92 - pts.reduce((s, c) => s + 26 * Math.exp(-((x - c) ** 2) / 140), 0);
  const sum = Array.from({ length: 76 }, (_, i) => { const x = 22 + i * 2; return `${x},${Math.max(20, sumY(x))}`; }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {pts.map((c, i) => <polyline key={i} points={bump(c)} fill="none" stroke="rgba(96,165,250,0.4)" strokeWidth="1" />)}
      <polyline points={sum} fill="none" stroke="#a855f7" strokeWidth="2.4" />
      {pts.map((c, i) => <line key={`t${i}`} x1={c} y1={92} x2={c} y2={98} stroke="#e2e8f0" strokeWidth="1" />)}
      <text x="22" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">kernels → density</text>
    </svg>
  );
};
const GlyphMCMC = () => {
  const walk = [[44, 80], [52, 66], [48, 54], [60, 50], [58, 38], [70, 42], [82, 34], [78, 50], [92, 56], [100, 46], [112, 40]];
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {/* two density blobs */}
      <circle cx="58" cy="46" r="26" fill="rgba(168,85,247,0.28)" />
      <circle cx="58" cy="46" r="14" fill="rgba(168,85,247,0.45)" />
      <circle cx="104" cy="44" r="22" fill="rgba(168,85,247,0.24)" />
      <circle cx="104" cy="44" r="11" fill="rgba(168,85,247,0.42)" />
      {/* random-walk trail */}
      <polyline points={walk.map(p => p.join(",")).join(" ")} fill="none" stroke="#34d399" strokeWidth="1.6" />
      {walk.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill="#e2e8f0" />)}
      <circle cx={walk[walk.length - 1][0]} cy={walk[walk.length - 1][1]} r="3.4" fill="#34d399" />
      <text x="22" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">sample by walking</text>
    </svg>
  );
};
const GlyphPerceptron = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* separating line */}
    <line x1="36" y1="100" x2="128" y2="20" stroke="#e2e8f0" strokeWidth="2" />
    {/* normal weight vector */}
    <line x1="80" y1="60" x2="104" y2="88" stroke="#fbbf24" strokeWidth="2" />
    <text x="106" y="92" fontFamily="monospace" fontSize="9" fill="#fbbf24">w</text>
    {/* class +1 (blue, lower-left side) */}
    {[[44, 86], [58, 92], [50, 70], [66, 80]].map(([x, y], i) => <circle key={`a${i}`} cx={x} cy={y} r="3.4" fill="#60a5fa" />)}
    {/* class -1 (red, upper-right side) */}
    {[[96, 34], [110, 46], [88, 46], [116, 30]].map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r="3.4" fill="#f87171" />)}
    {/* one misclassified */}
    <circle cx="84" cy="74" r="3.4" fill="#60a5fa" />
    <circle cx="84" cy="74" r="6.5" fill="none" stroke="#fbbf24" strokeWidth="1.6" />
    <text x="30" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">nudge on mistakes</text>
  </svg>
);
const GlyphNaiveBayes = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* two axis-aligned class ellipses (the naive assumption) */}
    <ellipse cx="56" cy="56" rx="26" ry="13" fill="rgba(96,165,250,0.2)" stroke="#60a5fa" strokeWidth="1.6" />
    <ellipse cx="104" cy="60" rx="26" ry="13" fill="rgba(248,113,113,0.2)" stroke="#f87171" strokeWidth="1.6" />
    {[[44, 52], [60, 60], [52, 48], [66, 58]].map(([x, y], i) => <circle key={`a${i}`} cx={x} cy={y} r="2.6" fill="#60a5fa" />)}
    {[[96, 56], [112, 64], [104, 52], [116, 62]].map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r="2.6" fill="#f87171" />)}
    {/* boundary */}
    <line x1="80" y1="22" x2="80" y2="94" stroke="#e2e8f0" strokeWidth="1.6" strokeDasharray="4 3" />
    <text x="30" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">independent features</text>
  </svg>
);
const GlyphICA = () => {
  const wave = (cy, f, fn) => Array.from({ length: 41 }, (_, i) => { const x = 12 + i * 3; return `${x},${cy + fn(i / 40, f)}`; }).join(" ");
  const sine = (t) => 9 * Math.sin(t * Math.PI * 2 * 2.2);
  const sq = (t) => 8 * Math.sign(Math.sin(t * Math.PI * 2 * 1.3));
  const mix = (t) => 0.6 * sine(t) + 0.7 * sq(t);
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {/* mixed (top, amber/red) */}
      <polyline points={wave(26, 1, mix)} fill="none" stroke="#f59e0b" strokeWidth="1.4" />
      <polyline points={wave(44, 1, (t) => 0.7 * sine(t) - 0.5 * sq(t))} fill="none" stroke="#f87171" strokeWidth="1.4" />
      <text x="118" y="22" fontFamily="monospace" fontSize="8" fill="#64748b">mixed</text>
      {/* recovered (bottom, green/cyan) */}
      <polyline points={wave(82, 1, sine)} fill="none" stroke="#34d399" strokeWidth="1.4" />
      <polyline points={wave(100, 1, sq)} fill="none" stroke="#22d3ee" strokeWidth="1.4" />
      <text x="104" y="78" fontFamily="monospace" fontSize="8" fill="#64748b">recovered</text>
      <text x="22" y="116" fontFamily="monospace" fontSize="9" fill="#94a3b8">unmix the signals</text>
    </svg>
  );
};

const GlyphSVM = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <line x1="36" y1="14" x2="120" y2="106" stroke="#e0e7ff" strokeWidth="1.6" />
    <line x1="58" y1="8" x2="142" y2="100" stroke="rgba(224,231,255,0.35)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="14" y1="20" x2="98" y2="112" stroke="rgba(224,231,255,0.35)" strokeWidth="1" strokeDasharray="3 3" />
    {[[40, 36], [30, 60], [52, 80], [44, 100]].map(([x, y], i) => (
      <circle key={`a${i}`} cx={x} cy={y} r="3.4" fill="#60a5fa" stroke={i < 2 ? "#fbbf24" : "none"} strokeWidth="2" />
    ))}
    {[[112, 24], [128, 48], [104, 44], [134, 76]].map(([x, y], i) => (
      <circle key={`b${i}`} cx={x} cy={y} r="3.4" fill="#c084fc" stroke={i < 2 ? "#fbbf24" : "none"} strokeWidth="2" />
    ))}
  </svg>
);

const GlyphDecoding = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[78, 58, 44, 30, 18, 10].map((h, i) => (
      <rect key={i} x={20 + i * 23} y={100 - h} width="16" height={h}
        fill={i < 3 ? "url(#decg)" : "var(--dim)"} opacity={i < 3 ? 0.95 : 0.4} rx="2" />
    ))}
    <line x1="14" y1="100" x2="150" y2="100" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    <defs>
      <linearGradient id="decg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

const GlyphGMM = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[["#60a5fa", 52, 44, 28, 16, -0.5], ["#c084fc", 108, 52, 30, 14, 0.4], ["#34d399", 78, 92, 22, 18, 0.2]].map(([c, cx, cy, rx, ry, rot], k) => (
      <g key={k} transform={`rotate(${rot * 57.3} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={c} strokeWidth="1.6" opacity="0.9" />
        <ellipse cx={cx} cy={cy} rx={rx * 0.6} ry={ry * 0.6} fill="none" stroke={c} strokeWidth="1" opacity="0.5" />
        {Array.from({ length: 5 }).map((_, i) => { const a = (i / 5) * Math.PI * 2; return <circle key={i} cx={cx + Math.cos(a) * rx * 0.55} cy={cy + Math.sin(a) * ry * 0.55} r="2" fill={c} opacity="0.8" />; })}
      </g>
    ))}
  </svg>
);

const GlyphROC = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <rect x="34" y="16" width="92" height="92" fill="none" stroke="rgba(96,165,250,0.3)" strokeWidth="1" />
    <line x1="34" y1="108" x2="126" y2="16" stroke="rgba(148,163,184,0.4)" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M 34 108 Q 40 36, 126 16" stroke="#60a5fa" strokeWidth="2.4" fill="none" />
    <path d="M 34 108 Q 40 36, 126 16 L 126 108 Z" fill="rgba(96,165,250,0.12)" stroke="none" />
    <circle cx="58" cy="52" r="4.5" fill="#fbbf24" />
  </svg>
);

const GlyphLR = () => {
  const cos = Array.from({ length: 61 }, (_, i) => { const x = 20 + i * 2; const t = i / 60; const wu = 0.18; const lr = t < wu ? t / wu : 0.5 * (1 + Math.cos(Math.PI * (t - wu) / (1 - wu))); return `${x},${100 - lr * 76}`; }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <line x1="20" y1="100" x2="142" y2="100" stroke="rgba(96,165,250,0.2)" strokeWidth="1" />
      <polyline points={cos} stroke="#60a5fa" strokeWidth="2.4" fill="none" />
      <line x1={20 + 0.18 * 120} y1="22" x2={20 + 0.18 * 120} y2="100" stroke="rgba(251,191,36,0.5)" strokeWidth="1" strokeDasharray="3 3" />
    </svg>
  );
};

const GlyphGradientClipping = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a cliff edge; unclipped path flung off (red), clipped path eased over (green) */}
    <path d="M 20 40 L 78 40 L 82 96 L 142 96" stroke="rgba(148,163,184,0.4)" strokeWidth="2" fill="none" />
    {/* unclipped: overshoots wildly */}
    <path d="M 30 36 L 74 38 L 132 70 L 60 92 L 140 50" stroke="#f87171" strokeWidth="2" fill="none" />
    <circle cx="140" cy="50" r="3" fill="#f87171" />
    {/* clipped: smooth descent */}
    <path d="M 30 44 L 72 44 L 84 70 L 110 90 L 136 94" stroke="#34d399" strokeWidth="2.2" fill="none" />
    <circle cx="136" cy="94" r="3" fill="#34d399" />
    <text x="22" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">cap ‖g‖ at the cliff</text>
  </svg>
);
const GlyphLoRA = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 5 }).map((_, r) => Array.from({ length: 5 }).map((_, c) => (
      <rect key={`w${r}-${c}`} x={20 + c * 11} y={34 + r * 11} width="10" height="10" fill="rgba(96,165,250,0.3)" />
    )))}
    <text x="45" y="30" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#94a3b8">W</text>
    <text x="84" y="66" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#94a3b8">+</text>
    {Array.from({ length: 5 }).map((_, r) => (
      <rect key={`b${r}`} x={98} y={34 + r * 11} width="10" height="10" fill="#c084fc" opacity="0.85" />
    ))}
    {Array.from({ length: 5 }).map((_, c) => (
      <rect key={`a${c}`} x={120 + c * 11} y={34} width="10" height="10" fill="#60a5fa" opacity="0.85" />
    ))}
    <text x="103" y="30" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#c084fc">B</text>
    <text x="142" y="30" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#60a5fa">A</text>
  </svg>
);

const GlyphScaling = () => {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <line x1="24" y1="100" x2="140" y2="100" stroke="rgba(96,165,250,0.2)" strokeWidth="1" />
      <line x1="24" y1="14" x2="24" y2="100" stroke="rgba(96,165,250,0.2)" strokeWidth="1" />
      <line x1="30" y1="24" x2="134" y2="92" stroke="#c084fc" strokeWidth="2.4" />
      {[[30, 24], [56, 41], [82, 58], [108, 75], [134, 92]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#60a5fa" />
      ))}
    </svg>
  );
};

const GlyphNMS = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[44, 30, 50, 40, false], [52, 38, 50, 40, false], [40, 26, 50, 40, true]].map(([x, y, w, h, keep], i) => (
      <rect key={`a${i}`} x={x} y={y} width={w} height={h} fill="none"
        stroke={keep ? "#34d399" : "rgba(248,113,113,0.5)"} strokeWidth={keep ? 2.2 : 1}
        strokeDasharray={keep ? "0" : "4 3"} />
    ))}
    {[[96, 60, 44, 44, false], [104, 52, 44, 44, true], [88, 66, 44, 44, false]].map(([x, y, w, h, keep], i) => (
      <rect key={`b${i}`} x={x} y={y} width={w} height={h} fill="none"
        stroke={keep ? "#34d399" : "rgba(248,113,113,0.5)"} strokeWidth={keep ? 2.2 : 1}
        strokeDasharray={keep ? "0" : "4 3"} />
    ))}
  </svg>
);

const GlyphVectorSearch = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <circle cx="80" cy="60" r="34" fill="none" stroke="rgba(251,191,36,0.25)" strokeWidth="1" strokeDasharray="3 3" />
    {[[58, 44, "#60a5fa", 1], [98, 48, "#c084fc", 1], [66, 84, "#60a5fa", 1], [102, 80, "#c084fc", 1], [80, 36, "#34d399", 1]].map(([x, y, c], i) => (
      <g key={i}><line x1="80" y1="60" x2={x} y2={y} stroke="rgba(251,191,36,0.35)" strokeWidth="0.8" /><circle cx={x} cy={y} r="3.4" fill={c} /><circle cx={x} cy={y} r="5.4" fill="none" stroke="#fbbf24" strokeWidth="0.8" /></g>
    ))}
    {[[128, 26, "#c084fc"], [22, 96, "#60a5fa"], [134, 92, "#34d399"]].map(([x, y, c], i) => <circle key={`o${i}`} cx={x} cy={y} r="3" fill={c} opacity="0.4" />)}
    <circle cx="80" cy="60" r="6" fill="#fbbf24" stroke="#050816" strokeWidth="1.5" />
  </svg>
);

const GlyphForecast = () => {
  const hist = Array.from({ length: 30 }, (_, i) => { const x = 16 + i * 3.0; return `${x},${70 - 14 * Math.sin(i * 0.6) - i * 0.5}`; }).join(" ");
  const fc = Array.from({ length: 16 }, (_, i) => { const t = 29 + i; const x = 16 + t * 3.0; return `${x},${70 - 14 * Math.sin(t * 0.6) - t * 0.5}`; }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <line x1={16 + 29 * 3.0} y1="14" x2={16 + 29 * 3.0} y2="104" stroke="rgba(251,191,36,0.3)" strokeWidth="1" strokeDasharray="3 3" />
      <polyline points={hist} stroke="#60a5fa" strokeWidth="2" fill="none" />
      <polyline points={fc} stroke="#c084fc" strokeWidth="2.2" fill="none" strokeDasharray="4 3" />
    </svg>
  );
};

const GlyphValueIter = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => {
      const d = Math.abs(c - 3) + Math.abs(r - 0);
      const g = Math.max(0, 1 - d / 5);
      return <rect key={`${r}-${c}`} x={36 + c * 22} y={16 + r * 22} width="20" height="20"
        fill={`rgba(52,211,153,${0.12 + g * 0.55})`} stroke="rgba(96,165,250,0.18)" strokeWidth="0.5" />;
    }))}
    <rect x={36 + 3 * 22 + 1} y={17} width="18" height="18" fill="none" stroke="#34d399" strokeWidth="2" />
    {[[1, 1], [2, 0], [2, 1], [1, 0]].map(([r, c], i) => (
      <path key={i} d={`M ${36 + c * 22 + 6} ${16 + r * 22 + 11} L ${36 + c * 22 + 15} ${16 + r * 22 + 11}`} stroke="#fbbf24" strokeWidth="1.6" markerEnd="url(#vah)" />
    ))}
    <defs><marker id="vah" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#fbbf24" /></marker></defs>
  </svg>
);

const GlyphMultiHead = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[0, 1, 2].map(g => (
      <g key={g} transform={`translate(${g * 10}, ${g * 8})`} opacity={0.5 + g * 0.22}>
        {Array.from({ length: 3 }).map((_, r) => Array.from({ length: 3 }).map((_, c) => {
          const v = (Math.sin(r * 1.7 + c * 0.9 + g * 2) + 1) / 2;
          return <rect key={`${r}-${c}`} x={28 + c * 16} y={20 + r * 16} width="14" height="14"
            fill={g === 2 ? "#c084fc" : g === 1 ? "#60a5fa" : "#34d399"} opacity={0.25 + v * 0.7} />;
        }))}
      </g>
    ))}
  </svg>
);
const GlyphVAE = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[24, 36], [24, 60], [24, 84]].map(([x, y], i) => <circle key={"i" + i} cx={x} cy={y} r="4" fill="#60a5fa" />)}
    <circle cx="60" cy="60" r="6" fill="#93c5fd" />
    <ellipse cx="84" cy="60" rx="9" ry="20" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="84" cy="52" r="3.5" fill="#c084fc" />
    <circle cx="108" cy="60" r="6" fill="#93c5fd" />
    {[[140, 40], [140, 60], [140, 80]].map(([x, y], i) => <circle key={"o" + i} cx={x} cy={y} r="4" fill="#fbbf24" />)}
    {[[24, 36, 60, 60], [24, 60, 60, 60], [24, 84, 60, 60], [60, 60, 84, 60], [84, 60, 108, 60], [108, 60, 140, 40], [108, 60, 140, 60], [108, 60, 140, 80]].map(([x1, y1, x2, y2], i) => (
      <line key={"l" + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(96,165,250,0.3)" strokeWidth="0.7" />
    ))}
  </svg>
);

const GlyphSA = () => (
  // A tangled vs clean TSP tour, faintly overlapping.
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* tangled tour (faint) */}
    <polyline points="20,40 110,30 50,70 130,52 80,100 24,90 96,68 140,80 64,46 20,40"
      fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="1.2" />
    {/* clean cooled tour */}
    <polyline points="20,40 64,28 110,30 140,50 130,80 96,98 50,90 24,68 20,40"
      fill="none" stroke="#c084fc" strokeWidth="1.6" />
    {[[20, 40], [64, 28], [110, 30], [140, 50], [130, 80], [96, 98], [50, 90], [24, 68]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="2.4" fill="#e0e7ff" />
    ))}
  </svg>
);

const GlyphMCTS = () => (
  // A tree fanning out with one heavily-visited principal branch.
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[80, 22], [44, 50], [80, 50], [116, 50], [28, 86], [60, 86], [76, 86], [96, 86], [132, 86]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={i === 0 ? 7 : i === 2 || i === 6 ? 6 : 4} fill="rgba(15,23,42,0.6)"
        stroke={i === 0 ? "#fbbf24" : i === 2 || i === 6 ? "#fbbf24" : "rgba(148,163,184,0.4)"} strokeWidth="1.5" />
    ))}
    {[[80, 22, 44, 50], [80, 22, 80, 50], [80, 22, 116, 50],
      [44, 50, 28, 86], [44, 50, 60, 86],
      [80, 50, 76, 86], [80, 50, 96, 86],
      [116, 50, 132, 86]].map(([x1, y1, x2, y2], i) => (
      <line key={`e${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={(i === 1 || i === 5) ? "#fbbf24" : "rgba(148,163,184,0.3)"}
        strokeWidth={(i === 1 || i === 5) ? 2 : 1} />
    ))}
  </svg>
);

const GlyphBackprop = () => (
  // A tiny computation graph: 2 inputs -> 2 hidden -> 1 output, with one
  // forward edge highlighted and one backward edge highlighted.
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[24, 35], [24, 85], [82, 35], [82, 85], [140, 60]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="9" fill="rgba(15,23,42,0.5)" stroke={i < 2 ? "#60a5fa" : i < 4 ? "#60a5fa" : "#c084fc"} strokeWidth="1.5" />
    ))}
    {[[24, 35, 82, 35], [24, 85, 82, 35], [24, 35, 82, 85], [24, 85, 82, 85]].map(([x1, y1, x2, y2], i) => (
      <line key={`f${i}`} x1={x1 + 9} y1={y1} x2={x2 - 9} y2={y2} stroke="#60a5fa" strokeWidth="1.2" />
    ))}
    {[[82, 35, 140, 60], [82, 85, 140, 60]].map(([x1, y1, x2, y2], i) => (
      <line key={`o${i}`} x1={x1 + 9} y1={y1} x2={x2 - 9} y2={y2} stroke={i === 0 ? "#c084fc" : "#60a5fa"} strokeWidth={i === 0 ? 1.8 : 1.2} />
    ))}
    <text x="62" y="22" fontFamily="JetBrains Mono" fontSize="9" fill="#60a5fa">forward</text>
    <text x="62" y="110" fontFamily="JetBrains Mono" fontSize="9" fill="#c084fc">∂L/∂h</text>
  </svg>
);

const GlyphGAN = () => (
  // Two faces (G / D) and a duel of arrows; ring of blue real + drifting violet fakes.
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* real ring */}
    <circle cx="80" cy="60" r="34" fill="none" stroke="#60a5fa" strokeWidth="1.4" opacity="0.6" />
    {[0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6].map((a, i) => (
      <circle key={`r${i}`} cx={80 + Math.cos(a) * 34} cy={60 + Math.sin(a) * 34} r="2.5" fill="#60a5fa" />
    ))}
    {/* fake samples drifting toward ring */}
    {[[44, 78], [108, 38], [62, 32], [104, 88], [60, 80]].map(([x, y], i) => (
      <circle key={`f${i}`} cx={x} cy={y} r="2.5" fill="#c084fc" />
    ))}
    {/* G and D labels */}
    <text x="8" y="20" fontFamily="JetBrains Mono" fontSize="11" fill="#c084fc">G</text>
    <text x="142" y="106" fontFamily="JetBrains Mono" fontSize="11" fill="#fbbf24">D</text>
    <line x1="16" y1="22" x2="48" y2="56" stroke="#c084fc" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="138" y1="98" x2="106" y2="74" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" />
  </svg>
);

const GlyphOptimizers = () => (
  // Four colored trails descending toward a common basin.
  <svg width="160" height="120" viewBox="0 0 160 120">
    <line x1="14" y1="100" x2="150" y2="100" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    <ellipse cx="100" cy="92" rx="38" ry="16" fill="rgba(168,85,247,0.18)" />
    <path d="M 22 28 Q 60 60 100 92" fill="none" stroke="#60a5fa" strokeWidth="1.8" />
    <path d="M 22 28 Q 50 70 100 92" fill="none" stroke="#c084fc" strokeWidth="1.8" />
    <path d="M 22 28 Q 80 50 100 92" fill="none" stroke="#fbbf24" strokeWidth="1.8" />
    <path d="M 22 28 Q 70 40 100 92" fill="none" stroke="#34d399" strokeWidth="1.8" />
    <circle cx="22" cy="28" r="3" fill="#e0e7ff" />
    <circle cx="100" cy="92" r="3" fill="#e0e7ff" />
  </svg>
);

const GlyphBayes = () => (
  // Two Beta curves: a wider violet prior under a tighter blue posterior.
  <svg width="160" height="120" viewBox="0 0 160 120">
    <line x1="14" y1="100" x2="150" y2="100" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    <path d="M 16 96 Q 50 70 80 60 Q 110 50 144 96" fill="none" stroke="#c084fc" strokeWidth="2" opacity="0.85" />
    <path d="M 16 100 L 16 96 Q 50 70 80 60 Q 110 50 144 96 L 144 100 Z" fill="#a855f7" opacity="0.10" />
    <path d="M 36 98 Q 70 30 96 22 Q 122 30 134 98" fill="none" stroke="#60a5fa" strokeWidth="2" />
    <path d="M 36 100 L 36 98 Q 70 30 96 22 Q 122 30 134 98 L 134 100 Z" fill="#60a5fa" opacity="0.14" />
    <line x1="96" y1="14" x2="96" y2="100" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" />
  </svg>
);

const GlyphGNN = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[40, 32, "#60a5fa"], [60, 40, "#60a5fa"], [44, 56, "#60a5fa"],
      [98, 30, "#c084fc"], [118, 42, "#c084fc"], [108, 58, "#c084fc"],
      [60, 86, "#34d399"], [82, 96, "#34d399"], [104, 84, "#34d399"]].map(([x, y, c], i) => (
      <circle key={i} cx={x} cy={y} r="5" fill={c} opacity="0.85" />
    ))}
    {[[40, 32, 60, 40], [60, 40, 44, 56], [40, 32, 44, 56],
      [98, 30, 118, 42], [118, 42, 108, 58], [98, 30, 108, 58],
      [60, 86, 82, 96], [82, 96, 104, 84], [60, 86, 104, 84],
      [44, 56, 60, 86], [108, 58, 104, 84]].map(([x1, y1, x2, y2], i) => (
      <line key={"e" + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(96,165,250,0.45)" strokeWidth="0.9" />
    ))}
  </svg>
);
const GlyphKVCache = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 6 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => {
      const filled = r < 4;
      return <rect key={`k-${r}-${c}`} x={20 + c * 12} y={18 + r * 14} width="10" height="12"
        fill={filled ? "#60a5fa" : "rgba(96,165,250,0.15)"} opacity={filled ? 0.4 + (3 - r) * 0.2 : 0.3} />;
    }))}
    {Array.from({ length: 6 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => {
      const filled = r < 4;
      return <rect key={`v-${r}-${c}`} x={86 + c * 12} y={18 + r * 14} width="10" height="12"
        fill={filled ? "#34d399" : "rgba(52,211,153,0.15)"} opacity={filled ? 0.4 + (3 - r) * 0.2 : 0.3} />;
    }))}
    <text x="38" y="14" fontFamily="JetBrains Mono" fontSize="9" fill="#60a5fa">K</text>
    <text x="104" y="14" fontFamily="JetBrains Mono" fontSize="9" fill="#34d399">V</text>
  </svg>
);
const GlyphBeam = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[80, 18, 40, 50], [80, 18, 80, 50], [80, 18, 120, 50],
      [40, 50, 24, 86], [40, 50, 56, 86],
      [80, 50, 76, 86], [80, 50, 96, 86],
      [120, 50, 132, 86]].map(([x1, y1, x2, y2], i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={(i === 1 || i === 5) ? "#fbbf24" : "rgba(96,165,250,0.4)"}
        strokeWidth={(i === 1 || i === 5) ? 2 : 1} />
    ))}
    {[[80, 18, "#fbbf24"], [40, 50, "#60a5fa"], [80, 50, "#fbbf24"], [120, 50, "#60a5fa"],
      [24, 86, "#94a3b8"], [56, 86, "#60a5fa"], [76, 86, "#fbbf24"], [96, 86, "#34d399"], [132, 86, "#94a3b8"]].map(([x, y, c], i) => (
      <circle key={"n" + i} cx={x} cy={y} r="5.5" fill="#0f172a" stroke={c} strokeWidth="1.5" />
    ))}
  </svg>
);
const GlyphLSTM = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {Array.from({ length: 6 }).map((_, r) => Array.from({ length: 8 }).map((_, c) => {
      const v = (Math.sin(r * 1.3 + c * 0.9) + 1) / 2;
      return <rect key={`${r}-${c}`} x={20 + c * 16} y={20 + r * 12} width="14" height="10" fill="#fbbf24" opacity={0.15 + v * 0.7} />;
    }))}
  </svg>
);
const GlyphRegression = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <line x1="16" y1="100" x2="144" y2="100" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    <line x1="16" y1="16" x2="16" y2="100" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    <line x1="22" y1="90" x2="140" y2="28" stroke="#fbbf24" strokeWidth="2.2" />
    {[[28, 84], [44, 76], [60, 70], [76, 62], [92, 50], [108, 44], [124, 32]].map(([x, y], i) => (
      <g key={i}>
        <line x1={x} y1={y} x2={x} y2={22 + 90 - (x - 22) * (62 / 118)} stroke="rgba(192,132,252,0.55)" strokeWidth="0.8" />
        <circle cx={x} cy={y} r="3" fill="#60a5fa" />
      </g>
    ))}
  </svg>
);

const GlyphPolicyGradient = () => {
  const bell = Array.from({ length: 41 }, (_, i) => {
    const x = 16 + i * (128 / 40);
    const t = (i - 20) / 6;
    return `${x},${100 - 70 * Math.exp(-t * t / 2)}`;
  }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <line x1="16" y1="100" x2="144" y2="100" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
      {[24, 40, 56, 72, 88, 104, 120, 136].map((x, i) => (
        <circle key={i} cx={x} cy={90 + (i % 3 - 1) * 4} r="2.5" fill="#60a5fa" opacity="0.85" />
      ))}
      <polyline points={bell} fill="rgba(251,191,36,0.18)" stroke="#fbbf24" strokeWidth="2" />
      <line x1="86" y1="14" x2="86" y2="100" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
};
const GlyphActorCritic = () => {
  const fills = ["#1e3a8a", "#4c3a9e", "#7a4fb8", "#a855f7"];
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {/* critic: value heatmap (left) */}
      {[0, 1].map(r => [0, 1].map(c => (
        <rect key={`${r}-${c}`} x={20 + c * 26} y={32 + r * 26} width="24" height="24"
          fill={fills[r * 2 + c]} opacity="0.85" />
      )))}
      {/* actor: policy arrows (right) */}
      {[[0, 0, 1, 0], [1, 0, 0, 1], [0, 1, 0, -1], [1, 1, 1, 0]].map(([c, r, dx, dy], i) => {
        const cx = 104 + c * 26, cy = 44 + r * 26;
        return <line key={i} x1={cx} y1={cy} x2={cx + dx * 11} y2={cy + dy * 11}
          stroke="#fbbf24" strokeWidth="2" />;
      })}
      <text x="22" y="92" fontFamily="monospace" fontSize="9" fill="#94a3b8">CRITIC</text>
      <text x="100" y="92" fontFamily="monospace" fontSize="9" fill="#94a3b8">ACTOR</text>
    </svg>
  );
};
const GlyphEditDistance = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* small DP grid with a diagonal backtrack path */}
    {[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => {
      const path = (r === c) || (r === 3 && c === 3);
      return <rect key={`${r}${c}`} x={48 + c * 17} y={26 + r * 17} width="15" height="15"
        fill={`rgba(96,165,250,${0.14 + 0.4 * (r + c) / 6})`} stroke={path ? "#fbbf24" : "transparent"} strokeWidth="1.5" />;
    }))}
    {/* aligned letters */}
    <text x="46" y="106" fontFamily="monospace" fontSize="11" fill="#34d399">k i t</text>
    <text x="96" y="106" fontFamily="monospace" fontSize="11" fill="#fbbf24">s i t</text>
  </svg>
);
const GlyphBfsDfsAstar = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* start, goal, and an A*-style beeline through a grid hint */}
    {[0, 1, 2, 3, 4].map(c => [0, 1, 2].map(r => (
      <rect key={`${c}${r}`} x={36 + c * 18} y={30 + r * 18} width="16" height="16" fill="rgba(96,165,250,0.12)" />
    )))}
    {/* expanded cells along a diagonal corridor */}
    {[[0, 2], [1, 2], [1, 1], [2, 1], [3, 1], [3, 0], [4, 0]].map(([c, r], i) => (
      <rect key={i} x={36 + c * 18} y={30 + r * 18} width="16" height="16" fill="rgba(96,165,250,0.6)" />
    ))}
    <circle cx={36 + 8} cy={30 + 2 * 18 + 8} r="5" fill="#34d399" />
    <circle cx={36 + 4 * 18 + 8} cy={30 + 8} r="5" fill="#a855f7" />
    <text x="40" y="108" fontFamily="monospace" fontSize="9" fill="#94a3b8">search the maze</text>
  </svg>
);
const GlyphKnapsack = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* DP table cells, gradient fill + a backtrack path */}
    {[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => {
      const path = (r === 0 && c === 4) || (r === 1 && c === 4) || (r === 2 && c === 2) || (r === 3 && c === 2);
      const t = (r + c) / 7;
      return <rect key={`${r}${c}`} x={40 + c * 18} y={28 + r * 18} width="17" height="17"
        fill={`rgba(96,165,250,${0.12 + 0.5 * t})`} stroke={path ? "#fbbf24" : "transparent"} strokeWidth="1.5" />;
    }))}
    <text x="40" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">fill → backtrack</text>
  </svg>
);
const GlyphBranchAndBound = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a binary search tree with one pruned (red, cut) subtree */}
    <line x1="80" y1="26" x2="48" y2="58" stroke="rgba(148,163,184,0.55)" strokeWidth="1.6" />
    <line x1="80" y1="26" x2="112" y2="58" stroke="rgba(148,163,184,0.55)" strokeWidth="1.6" />
    <line x1="48" y1="58" x2="30" y2="90" stroke="rgba(148,163,184,0.55)" strokeWidth="1.6" />
    <line x1="48" y1="58" x2="66" y2="90" stroke="rgba(148,163,184,0.55)" strokeWidth="1.6" />
    <circle cx="80" cy="26" r="6" fill="#60a5fa" />
    <circle cx="48" cy="58" r="5" fill="#60a5fa" />
    <circle cx="30" cy="90" r="5" fill="#34d399" />
    <circle cx="66" cy="90" r="4.5" fill="rgba(148,163,184,0.7)" />
    {/* pruned right subtree */}
    <circle cx="112" cy="58" r="6" fill="#f87171" />
    <line x1="105" y1="68" x2="119" y2="68" stroke="#f87171" strokeWidth="1.8" />
    <text x="118" y="58" fontFamily="monospace" fontSize="11" fill="#f87171">{"✂"}</text>
    <text x="24" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">bound &amp; prune</text>
  </svg>
);
const GlyphDriftDetection = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* reference bump (outline) and drifted bump (filled) + alarm */}
    <polyline points="24,84 40,84 52,50 64,40 76,50 88,84 110,84" fill="none" stroke="rgba(226,232,240,0.6)" strokeWidth="1.5" />
    <polygon points="60,84 76,84 88,52 100,42 112,52 124,84 136,84" fill="rgba(248,113,113,0.45)" stroke="#f87171" strokeWidth="1.5" />
    <line x1="16" y1="84" x2="144" y2="84" stroke="rgba(148,163,184,0.4)" strokeWidth="1" />
    <text x="22" y="104" fontFamily="monospace" fontSize="9" fill="#f87171">drift → alarm</text>
  </svg>
);
const GlyphSaliency = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a 5x5 saliency heatmap with a bright vertical bar */}
    {[0, 1, 2, 3, 4].map(r => [0, 1, 2, 3, 4].map(c => {
      const hot = c === 2;
      const t = hot ? 0.9 : 0.12 + 0.1 * Math.random();
      return <rect key={`${r}${c}`} x={48 + c * 14} y={28 + r * 14} width="13" height="13"
        fill={`rgb(${30 + 225 * t},${Math.max(0, 80 - 60 * t)},${Math.max(0, 138 - 110 * t)})`} />;
    }))}
    <text x="44" y="116" fontFamily="monospace" fontSize="9" fill="#94a3b8">∂out/∂pixels</text>
  </svg>
);
const GlyphMCDropout = () => {
  const mean = Array.from({ length: 33 }, (_, i) => { const x = 16 + i * 4; return `${x},${60 + 18 * Math.sin((i - 16) / 5)}`; }).join(" ");
  const band = (s) => Array.from({ length: 33 }, (_, i) => { const x = 16 + i * 4; const w = 4 + 16 * (Math.abs(i - 16) / 16); return `${x},${60 + 18 * Math.sin((i - 16) / 5) + s * w}`; }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <polygon points={band(1) + " " + band(-1).split(" ").reverse().join(" ")} fill="rgba(168,85,247,0.2)" />
      <polyline points={mean} fill="none" stroke="#a855f7" strokeWidth="2" />
      {[40, 56, 100, 116].map((x, i) => <circle key={i} cx={x} cy={60 + 18 * Math.sin((x - 80) / 20)} r="2.5" fill="#e2e8f0" />)}
      <text x="40" y="108" fontFamily="monospace" fontSize="9" fill="#94a3b8">uncertainty band</text>
    </svg>
  );
};
const GlyphLabelNoise = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <line x1="80" y1="24" x2="80" y2="96" stroke="rgba(226,232,240,0.4)" strokeWidth="1.5" />
    {[[44, 40], [54, 60], [38, 76], [60, 50]].map(([x, y], i) => <circle key={`a${i}`} cx={x} cy={y} r="3.5" fill="#60a5fa" />)}
    {[[112, 44], [102, 64], [120, 78], [98, 52]].map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r="3.5" fill="#a855f7" />)}
    {/* flipped points on the wrong side, ringed red */}
    <circle cx="100" cy="42" r="3.5" fill="#60a5fa" /><circle cx="100" cy="42" r="6.5" fill="none" stroke="#f87171" strokeWidth="1.5" />
    <circle cx="58" cy="70" r="3.5" fill="#a855f7" /><circle cx="58" cy="70" r="6.5" fill="none" stroke="#f87171" strokeWidth="1.5" />
    <text x="40" y="110" fontFamily="monospace" fontSize="9" fill="#94a3b8">flipped labels</text>
  </svg>
);
const GlyphDoIntervention = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* causal DAG Z->X (cut), Z->Y, X->Y */}
    <circle cx="80" cy="32" r="13" fill="none" stroke="#fbbf24" strokeWidth="2" /><text x="75" y="36" fontFamily="monospace" fontSize="11" fill="#fbbf24">Z</text>
    <circle cx="48" cy="88" r="13" fill="none" stroke="#60a5fa" strokeWidth="2" /><text x="43" y="92" fontFamily="monospace" fontSize="11" fill="#60a5fa">X</text>
    <circle cx="116" cy="88" r="13" fill="none" stroke="#a855f7" strokeWidth="2" /><text x="110" y="92" fontFamily="monospace" fontSize="11" fill="#a855f7">Y</text>
    {/* Z->X cut */}
    <line x1="72" y1="42" x2="56" y2="76" stroke="#f87171" strokeWidth="2" strokeDasharray="4 3" />
    <text x="56" y="64" fontFamily="monospace" fontSize="11" fill="#f87171">{"✂"}</text>
    {/* Z->Y, X->Y */}
    <line x1="88" y1="42" x2="110" y2="76" stroke="#fbbf24" strokeWidth="2" />
    <line x1="61" y1="88" x2="101" y2="88" stroke="#34d399" strokeWidth="2" />
    <polygon points="101,88 93,84 93,92" fill="#34d399" />
    <text x="44" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">do(X) cuts Z→X</text>
  </svg>
);
const GlyphInstrumentalVariables = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* IV DAG: Z -> X -> Y, with hidden U -> X and U -> Y (dashed) */}
    <circle cx="22" cy="62" r="12" fill="none" stroke="#fbbf24" strokeWidth="2" /><text x="17" y="66" fontFamily="monospace" fontSize="11" fill="#fbbf24">Z</text>
    <circle cx="76" cy="62" r="12" fill="none" stroke="#60a5fa" strokeWidth="2" /><text x="71" y="66" fontFamily="monospace" fontSize="11" fill="#60a5fa">X</text>
    <circle cx="132" cy="62" r="12" fill="none" stroke="#a855f7" strokeWidth="2" /><text x="127" y="66" fontFamily="monospace" fontSize="11" fill="#a855f7">Y</text>
    <circle cx="104" cy="20" r="11" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="3 2" /><text x="100" y="24" fontFamily="monospace" fontSize="10" fill="#f87171">U</text>
    {/* Z->X */}
    <line x1="34" y1="62" x2="62" y2="62" stroke="#fbbf24" strokeWidth="2" /><polygon points="64,62 56,58 56,66" fill="#fbbf24" />
    {/* X->Y */}
    <line x1="88" y1="62" x2="118" y2="62" stroke="#34d399" strokeWidth="2" /><polygon points="120,62 112,58 112,66" fill="#34d399" />
    {/* U->X and U->Y dashed (confounding) */}
    <line x1="98" y1="28" x2="82" y2="52" stroke="#f87171" strokeWidth="1.6" strokeDasharray="3 2" />
    <line x1="110" y1="28" x2="128" y2="52" stroke="#f87171" strokeWidth="1.6" strokeDasharray="3 2" />
    <text x="14" y="100" fontFamily="monospace" fontSize="9" fill="#94a3b8">instrument Z avoids U</text>
  </svg>
);
const GlyphSimpsons = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* two subgroups each trending up, pooled trending down */}
    {[[34, 80], [44, 72], [54, 66], [64, 58]].map(([x, y], i) => <circle key={`a${i}`} cx={x} cy={y} r="3" fill="#60a5fa" />)}
    {[[96, 56], [106, 48], [116, 42], [126, 34]].map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r="3" fill="#a855f7" />)}
    <line x1="32" y1="84" x2="66" y2="56" stroke="#60a5fa" strokeWidth="2" />
    <line x1="94" y1="58" x2="128" y2="32" stroke="#a855f7" strokeWidth="2" />
    {/* pooled (down) */}
    <line x1="30" y1="44" x2="130" y2="78" stroke="#e2e8f0" strokeWidth="2.5" strokeDasharray="5 3" />
    <text x="40" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">trend reverses</text>
  </svg>
);
const GlyphSpeculative = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a run of accepted draft tokens then a target token */}
    {[0, 1, 2, 3].map(i => (
      <rect key={i} x={28 + i * 20} y={40} width="16" height="16" fill="#34d399" />
    ))}
    <rect x={28 + 4 * 20} y={40} width="16" height="16" fill="#a855f7" />
    {/* draft (small) and target (big) model glyphs */}
    <circle cx="22" cy="80" r="6" fill="none" stroke="#34d399" strokeWidth="2" />
    <text x="34" y="84" fontFamily="monospace" fontSize="8" fill="#34d399">draft k=4</text>
    <circle cx="118" cy="80" r="10" fill="none" stroke="#a855f7" strokeWidth="2" />
    <text x="60" y="108" fontFamily="monospace" fontSize="9" fill="#94a3b8">verify in 1 pass</text>
  </svg>
);
const GlyphPagedAttention = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* memory grid: some blocks used (colored), some wasted (hatched), packed */}
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const c = i % 4, r = (i / 4) | 0; const col = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24"][i % 4]; return <rect key={`u${i}`} x={30 + c * 22} y={36 + r * 20} width="20" height="18" fill={col} opacity="0.85" />; })}
    {[8, 9, 10, 11].map(i => { const c = i % 4, r = (i / 4) | 0; return <g key={`w${i}`}><rect x={30 + c * 22} y={36 + r * 20} width="20" height="18" fill="rgba(248,113,113,0.15)" /><line x1={32 + c * 22} y1={36 + r * 20 + 16} x2={48 + c * 22} y2={36 + r * 20 + 2} stroke="rgba(248,113,113,0.5)" strokeWidth="1" /></g>; })}
    <text x="34" y="110" fontFamily="monospace" fontSize="9" fill="#94a3b8">blocks on demand</text>
  </svg>
);
const GlyphMixedPrecision = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* fp16 window band, gradient histogram shifted into it */}
    <rect x="56" y="30" width="60" height="56" fill="rgba(52,211,153,0.12)" stroke="rgba(52,211,153,0.5)" strokeWidth="1.5" />
    {[20, 34, 48, 62, 76, 90, 104, 118].map((x, i) => {
      const inBand = x >= 56 && x <= 116;
      const h = [10, 18, 30, 42, 36, 22, 12, 6][i];
      return <rect key={i} x={x} y={86 - h} width="10" height={h} fill={inBand ? "#60a5fa" : "#f87171"} />;
    })}
    <line x1="16" y1="86" x2="144" y2="86" stroke="rgba(148,163,184,0.4)" strokeWidth="1" />
    <text x="40" y="106" fontFamily="monospace" fontSize="9" fill="#94a3b8">loss-scale → fp16</text>
  </svg>
);
const GlyphMoE = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* token routes to 2 of 5 experts */}
    <circle cx="28" cy="60" r="7" fill="#fbbf24" />
    {[0, 1, 2, 3, 4].map(i => {
      const x = 70 + (i % 3) * 30, y = 34 + Math.floor(i / 3) * 44;
      const active = i === 1 || i === 3;
      return <rect key={i} x={x} y={y} width="22" height="20" rx="3" fill={active ? "#34d399" : "rgba(96,165,250,0.3)"} stroke={active ? "#34d399" : "transparent"} strokeWidth="1.5" />;
    })}
    <line x1="35" y1="58" x2="100" y2="44" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
    <line x1="35" y1="62" x2="70" y2="98" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
    <text x="56" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">top-2 of N</text>
  </svg>
);
const GlyphDistillation = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* big teacher -> small student */}
    <circle cx="44" cy="56" r="22" fill="none" stroke="#a855f7" strokeWidth="2.5" />
    <text x="34" y="60" fontFamily="monospace" fontSize="11" fill="#a855f7">T</text>
    <circle cx="116" cy="56" r="13" fill="none" stroke="#60a5fa" strokeWidth="2" />
    <text x="111" y="60" fontFamily="monospace" fontSize="10" fill="#60a5fa">S</text>
    {/* soft-label transfer arrow with 3 small bars */}
    <line x1="68" y1="56" x2="100" y2="56" stroke="#fbbf24" strokeWidth="2" />
    <polygon points="100,56 92,52 92,60" fill="#fbbf24" />
    <rect x="74" y="34" width="5" height="10" fill="#60a5fa" />
    <rect x="81" y="38" width="5" height="6" fill="#a855f7" />
    <rect x="88" y="41" width="5" height="3" fill="#fbbf24" />
    <text x="46" y="100" fontFamily="monospace" fontSize="9" fill="#94a3b8">soft labels</text>
  </svg>
);
const GlyphPruning = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* weight grid: most pruned (gray X), a few kept (blue) */}
    {[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => {
      const kept = (r === 1 && c === 2) || (r === 2 && c === 0) || (r === 0 && c === 3) || (r === 3 && c === 1);
      const x = 50 + c * 16, y = 30 + r * 16;
      return kept
        ? <rect key={`${r}${c}`} x={x} y={y} width="13" height="13" fill="#60a5fa" />
        : <g key={`${r}${c}`}><rect x={x} y={y} width="13" height="13" fill="rgba(148,163,184,0.12)" /><line x1={x + 2} y1={y + 2} x2={x + 11} y2={y + 11} stroke="rgba(148,163,184,0.5)" strokeWidth="1" /></g>;
    }))}
    <text x="46" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">keep the big ones</text>
  </svg>
);
const GlyphQuantization = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* quantization grid levels */}
    {[28, 52, 76, 100, 124].map((x, i) => (
      <line key={i} x1={x} y1="34" x2={x} y2="86" stroke="rgba(96,165,250,0.35)" strokeWidth="1" />
    ))}
    <line x1="20" y1="86" x2="140" y2="86" stroke="rgba(148,163,184,0.4)" strokeWidth="1" />
    {/* weights snapping to levels */}
    {[[40, 48, 52], [64, 60, 52], [70, 66, 76], [92, 54, 100], [110, 70, 100]].map(([x1, y, x2], i) => (
      <g key={i}>
        <line x1={x1} y1={y} x2={x2} y2={y} stroke="#34d399" strokeWidth="1.5" opacity="0.7" />
        <circle cx={x1} cy={y} r="2.5" fill="#e2e8f0" />
        <circle cx={x2} cy={y} r="3" fill="#34d399" />
      </g>
    ))}
    <text x="34" y="106" fontFamily="monospace" fontSize="9" fill="#94a3b8">fp32 → int4</text>
  </svg>
);
const GlyphSudoku = () => {
  const digits = { "0-0": "5", "1-1": "3", "2-2": "8", "0-2": "9", "2-0": "6" };
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {[0, 1, 2].map(r => [0, 1, 2].map(c => (
        <rect key={`${r}-${c}`} x={52 + c * 18} y={24 + r * 18} width="17" height="17" fill="rgba(15,23,42,0.5)" stroke="rgba(96,165,250,0.4)" strokeWidth="0.5" />
      )))}
      {Object.entries(digits).map(([k, v]) => {
        const [r, c] = k.split("-").map(Number);
        return <text key={k} x={52 + c * 18 + 8.5} y={24 + r * 18 + 12} fontFamily="monospace" fontSize="11" fill={v === "9" || v === "6" ? "#60a5fa" : "#e2e8f0"} textAnchor="middle">{v}</text>;
      })}
      <rect x={52} y={24} width="54" height="54" fill="none" stroke="rgba(96,165,250,0.7)" strokeWidth="1.5" />
      <text x="50" y="98" fontFamily="monospace" fontSize="9" fill="#94a3b8">propagate + search</text>
    </svg>
  );
};
const GlyphGraphColoring = () => {
  const nodes = [[44, 34, "#f87171"], [110, 30, "#34d399"], [76, 64, "#60a5fa"], [40, 92, "#34d399"], [116, 92, "#f87171"]];
  const edges = [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [0, 3], [1, 4]];
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
      ))}
      {nodes.map(([x, y, c], i) => (
        <circle key={i} cx={x} cy={y} r="10" fill={c} stroke="rgba(226,232,240,0.5)" strokeWidth="1" />
      ))}
    </svg>
  );
};
const GlyphNQueens = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* 4x4 board with queens placed on a diagonal-ish non-attacking pattern */}
    {[0, 1, 2, 3].map(c => [0, 1, 2, 3].map(r => (
      <rect key={`${c}-${r}`} x={48 + c * 18} y={24 + r * 18} width="17" height="17"
        fill={(c + r) % 2 === 0 ? "rgba(96,165,250,0.12)" : "rgba(15,23,42,0.6)"} />
    )))}
    {[[0, 1], [1, 3], [2, 0], [3, 2]].map(([c, r], i) => (
      <circle key={i} cx={48 + c * 18 + 8.5} cy={24 + r * 18 + 8.5} r="5.5" fill="#a855f7" />
    ))}
    <rect x={48 + 3 * 18} y={24} width="17" height="72" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
    <text x="52" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">backtracking</text>
  </svg>
);
const GlyphFairness = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a balance scale: two unequal groups */}
    <line x1="80" y1="22" x2="80" y2="40" stroke="rgba(148,163,184,0.6)" strokeWidth="2" />
    <line x1="40" y1="40" x2="120" y2="48" stroke="rgba(148,163,184,0.6)" strokeWidth="2" />
    <circle cx="40" cy="40" r="3" fill="#60a5fa" />
    <circle cx="120" cy="48" r="3" fill="#a855f7" />
    {/* group A pan (higher) */}
    <rect x="26" y="52" width="28" height="14" rx="2" fill="#60a5fa" opacity="0.8" />
    {/* group B pan (lower, lighter share) */}
    <rect x="106" y="62" width="28" height="9" rx="2" fill="#a855f7" opacity="0.8" />
    <line x1="80" y1="22" x2="80" y2="100" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
    <text x="30" y="86" fontFamily="monospace" fontSize="9" fill="#60a5fa">A</text>
    <text x="116" y="86" fontFamily="monospace" fontSize="9" fill="#a855f7">B</text>
    <text x="46" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">parity vs TPR</text>
  </svg>
);
const GlyphActiveLearning = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* two classes split by a boundary; the next pick (ring) sits on the boundary */}
    <line x1="80" y1="20" x2="80" y2="100" stroke="rgba(226,232,240,0.5)" strokeWidth="1.5" />
    {[[40, 36], [52, 56], [36, 72], [60, 40], [46, 86]].map(([x, y], i) => (
      <circle key={`a${i}`} cx={x} cy={y} r="3.5" fill="#60a5fa" opacity="0.7" />
    ))}
    {[[120, 40], [108, 60], [124, 76], [100, 50], [114, 88]].map(([x, y], i) => (
      <circle key={`b${i}`} cx={x} cy={y} r="3.5" fill="#a855f7" opacity="0.7" />
    ))}
    {/* most-uncertain point near the boundary, ringed */}
    <circle cx="78" cy="64" r="4" fill="#cbd5e1" />
    <circle cx="78" cy="64" r="9" fill="none" stroke="#fbbf24" strokeWidth="2" />
    <text x="56" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">label the unsure</text>
  </svg>
);
const GlyphCoreset = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a cloud of faint points; a few bold weighted ones + a centroid X */}
    {[[40,40],[52,52],[44,64],[60,46],[36,56],[120,44],[108,58],[124,70],[100,52],[114,80],[72,90],[88,86]].map(([x,y],i)=>(
      <circle key={`f${i}`} cx={x} cy={y} r="3" fill="rgba(96,165,250,0.18)" />
    ))}
    {/* coreset points sized by weight */}
    <circle cx="44" cy="50" r="6" fill="#e2e8f0" />
    <circle cx="116" cy="62" r="5" fill="#e2e8f0" />
    <circle cx="80" cy="88" r="7" fill="#e2e8f0" />
    {/* centroids: full (green ring) vs coreset (purple X) overlapping */}
    <circle cx="58" cy="52" r="8" fill="none" stroke="#34d399" strokeWidth="2" />
    <line x1="54" y1="48" x2="62" y2="56" stroke="#a855f7" strokeWidth="2.2" /><line x1="62" y1="48" x2="54" y2="56" stroke="#a855f7" strokeWidth="2.2" />
    <text x="30" y="110" fontFamily="monospace" fontSize="9" fill="#94a3b8">tiny weighted subset</text>
  </svg>
);
const GlyphDatasetDistillation = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a cloud of real points distilled into a few synthetic squares + arrow */}
    {[[24,40],[34,54],[28,68],[42,46],[20,58],[40,72],[30,82]].map(([x,y],i)=>(
      <circle key={`r${i}`} cx={x} cy={y} r="3" fill={i%2? "rgba(168,85,247,0.35)":"rgba(96,165,250,0.35)"} />
    ))}
    <line x1="62" y1="58" x2="92" y2="58" stroke="#94a3b8" strokeWidth="2" /><polygon points="94,58 86,54 86,62" fill="#94a3b8" />
    <text x="60" y="44" fontFamily="monospace" fontSize="9" fill="#94a3b8">distill</text>
    {/* synthetic squares */}
    <rect x="108" y="40" width="13" height="13" fill="#60a5fa" stroke="#e2e8f0" strokeWidth="1.4" />
    <rect x="126" y="56" width="13" height="13" fill="#a855f7" stroke="#e2e8f0" strokeWidth="1.4" />
    <rect x="110" y="70" width="13" height="13" fill="#a855f7" stroke="#e2e8f0" strokeWidth="1.4" />
    <text x="100" y="104" fontFamily="monospace" fontSize="9" fill="#94a3b8">synthetic teachers</text>
  </svg>
);
const GlyphConformal = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a prediction set: some classes included (blue), true class ringed green */}
    {[0, 1, 2, 3, 4].map(i => {
      const inSet = i === 1 || i === 2 || i === 4;
      const x = 28 + i * 22;
      return <rect key={i} x={x} y={40} width="16" height="40"
        fill={inSet ? "rgba(96,165,250,0.7)" : "rgba(148,163,184,0.15)"}
        stroke={i === 2 ? "#34d399" : "transparent"} strokeWidth="2.5" />;
    })}
    <text x="30" y="32" fontFamily="monospace" fontSize="9" fill="#94a3b8">prediction set</text>
    <text x="30" y="100" fontFamily="monospace" fontSize="10" fill="#34d399">cover ≥ 1−α</text>
  </svg>
);
const GlyphConformalRegression = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* a regression curve wrapped in an adaptive prediction band */}
    <path d="M20 70 Q55 30 90 58 T140 46 L140 70 Q105 92 70 74 T20 92 Z" fill="rgba(96,165,250,0.18)" />
    <path d="M20 81 Q55 48 90 66 T140 58" fill="none" stroke="#a855f7" strokeWidth="2.4" />
    {[[34,70],[58,52],[82,68],[106,55],[128,60]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r="2.4" fill="rgba(148,163,184,0.7)" />
    ))}
    <circle cx="118" cy="40" r="2.6" fill="#f87171" />
    <text x="22" y="26" fontFamily="monospace" fontSize="9" fill="#94a3b8">interval</text>
    <text x="22" y="108" fontFamily="monospace" fontSize="10" fill="#60a5fa">f̂(x) ± q̂·σ̂(x)</text>
  </svg>
);
const GlyphSHAP = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* waterfall bars stepping from base to prediction */}
    {[[40, 26, 36, "#34d399"], [60, 40, 28, "#34d399"], [54, 56, 38, "#f87171"], [70, 72, 30, "#34d399"], [62, 88, 34, "#f87171"]].map(([x, y, w, c], i) => (
      <rect key={i} x={x} y={y} width={w} height="11" fill={c} opacity="0.85" />
    ))}
    <line x1="40" y1="20" x2="40" y2="104" stroke="rgba(148,163,184,0.4)" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="104" y1="20" x2="104" y2="104" stroke="#60a5fa" strokeWidth="1.5" />
    <text x="22" y="116" fontFamily="monospace" fontSize="9" fill="#94a3b8">base → φ → pred</text>
  </svg>
);
const GlyphCalibration = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* reliability diagram: diagonal + overconfident points below it */}
    <line x1="28" y1="100" x2="120" y2="20" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
    {[[44, 92], [64, 84], [84, 74], [104, 60]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="4" fill="#f87171" />
    ))}
    {/* corrected points on the diagonal (faint green) */}
    {[[44, 84], [64, 64], [84, 44], [104, 24]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="3" fill="#34d399" opacity="0.7" />
    ))}
    <line x1="28" y1="20" x2="28" y2="100" stroke="rgba(96,165,250,0.3)" strokeWidth="1" />
    <line x1="28" y1="100" x2="124" y2="100" stroke="rgba(96,165,250,0.3)" strokeWidth="1" />
    <text x="30" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">conf → acc</text>
  </svg>
);
const GlyphReactAgent = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* thought -> action -> observation loop nodes */}
    <circle cx="40" cy="40" r="13" fill="none" stroke="#a855f7" strokeWidth="2" />
    <text x="34" y="44" fontFamily="monospace" fontSize="11" fill="#a855f7">T</text>
    <circle cx="120" cy="40" r="13" fill="none" stroke="#60a5fa" strokeWidth="2" />
    <text x="115" y="44" fontFamily="monospace" fontSize="11" fill="#60a5fa">A</text>
    <circle cx="80" cy="92" r="13" fill="none" stroke="#34d399" strokeWidth="2" />
    <text x="75" y="96" fontFamily="monospace" fontSize="11" fill="#34d399">O</text>
    {/* arrows around the loop */}
    <line x1="54" y1="40" x2="105" y2="40" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" />
    <polygon points="105,40 97,36 97,44" fill="rgba(148,163,184,0.6)" />
    <line x1="114" y1="52" x2="90" y2="82" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" />
    <polygon points="90,82 98,80 92,74" fill="rgba(148,163,184,0.6)" />
    <line x1="70" y1="84" x2="46" y2="52" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" />
    <polygon points="46,52 54,56 48,60" fill="rgba(148,163,184,0.6)" />
  </svg>
);
const GlyphReflection = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* quality climbing across revisions toward the bar */}
    <line x1="20" y1="40" x2="140" y2="40" stroke="rgba(52,211,153,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />
    <polyline points="24,92 56,74 88,58 120,42" fill="none" stroke="#a855f7" strokeWidth="2" />
    <circle cx="24" cy="92" r="4" fill="#f87171" />
    <circle cx="56" cy="74" r="4" fill="#f87171" />
    <circle cx="88" cy="58" r="4" fill="#f87171" />
    <circle cx="120" cy="42" r="4.5" fill="#34d399" />
    <text x="96" y="34" fontFamily="monospace" fontSize="9" fill="#34d399">pass</text>
    <line x1="20" y1="100" x2="140" y2="100" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
  </svg>
);
const GlyphHyDE = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* relevant doc cluster (green) */}
    {[[104, 36], [116, 30], [110, 46], [122, 42], [98, 44]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="4" fill="#34d399" opacity="0.85" />
    ))}
    {/* query far from cluster */}
    <polygon points="34,84 41,77 48,84 41,91" fill="#a855f7" />
    <text x="22" y="104" fontFamily="monospace" fontSize="9" fill="#a855f7">query</text>
    {/* HyDE point near cluster */}
    <circle cx="110" cy="40" r="7" fill="none" stroke="#fbbf24" strokeWidth="2" />
    {/* arrow: query -> hypothetical region */}
    <line x1="48" y1="82" x2="100" y2="46" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 3" />
    <polygon points="100,46 92,48 96,53" fill="#fbbf24" />
  </svg>
);
const GlyphLostMiddle = () => {
  const pts = Array.from({ length: 41 }, (_, i) => {
    const x = 16 + i * (128 / 40);
    const t = (i - 20) / 20;                 // -1..1
    return `${x},${34 + 50 * (1 - t * t)}`;  // U-curve (low in middle)
  }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      <polyline points={pts} fill="none" stroke="#a855f7" strokeWidth="2" />
      <circle cx="16" cy="84" r="3.5" fill="#34d399" />
      <circle cx="144" cy="84" r="3.5" fill="#34d399" />
      <circle cx="80" cy="34" r="3.5" fill="#f87171" />
      <text x="68" y="28" fontFamily="monospace" fontSize="9" fill="#f87171">lost</text>
      <line x1="16" y1="98" x2="144" y2="98" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
    </svg>
  );
};
const GlyphGuardrails = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* shield / filter gate: one request blocked, one passes */}
    <rect x="66" y="22" width="28" height="76" rx="4" fill="none" stroke="#a855f7" strokeWidth="2" />
    {/* blocked request (red, stops at gate) */}
    <line x1="20" y1="42" x2="62" y2="42" stroke="#f87171" strokeWidth="2" />
    <line x1="58" y1="36" x2="66" y2="48" stroke="#f87171" strokeWidth="2" />
    <line x1="66" y1="36" x2="58" y2="48" stroke="#f87171" strokeWidth="2" />
    {/* passing request (green, goes through) */}
    <line x1="20" y1="78" x2="140" y2="78" stroke="#34d399" strokeWidth="2" />
    <polygon points="140,78 132,74 132,82" fill="#34d399" />
    <text x="70" y="114" fontFamily="monospace" fontSize="9" fill="#94a3b8">guard</text>
  </svg>
);
const GlyphConstrainedDecoding = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* token distribution row: some allowed (green), some masked (struck) */}
    {[0, 1, 2, 3, 4, 5].map(i => {
      const ok = i === 1 || i === 3 || i === 4;
      const h = [18, 34, 12, 40, 26, 16][i];
      const x = 20 + i * 21;
      return (
        <g key={i}>
          <rect x={x} y={70 - h} width="14" height={h} fill={ok ? "#34d399" : "rgba(148,163,184,0.3)"} />
          {!ok && <line x1={x - 1} y1="70" x2={x + 15} y2={70 - h} stroke="#f87171" strokeWidth="1.5" />}
        </g>
      );
    })}
    <line x1="16" y1="70" x2="144" y2="70" stroke="rgba(148,163,184,0.4)" strokeWidth="1" />
    {/* resulting structured token */}
    <text x="40" y="98" fontFamily="monospace" fontSize="13" fill="#60a5fa">{"{ \"k\":"}</text>
    <text x="104" y="98" fontFamily="monospace" fontSize="13" fill="#34d399">{"42 }"}</text>
  </svg>
);
const GlyphSelfConsistency = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* sampled chains: chips, most green (correct), some red/orange (wrong) */}
    {[["#34d399", 0], ["#f87171", 1], ["#34d399", 2], ["#fb923c", 3], ["#34d399", 4], ["#34d399", 5]].map(([col, i], k) => (
      <rect key={k} x={20 + i * 21} y="30" width="15" height="15" rx="2" fill={col} opacity="0.85" />
    ))}
    {/* vote arrows converging */}
    {[26, 47, 68, 89, 110, 131].map((x, i) => (
      <line key={i} x1={x + 7} y1="48" x2="80" y2="74" stroke="rgba(96,165,250,0.4)" strokeWidth="1" />
    ))}
    {/* winning answer */}
    <rect x="68" y="76" width="24" height="22" rx="3" fill="#34d399" />
    <text x="75" y="92" fontFamily="monospace" fontSize="13" fill="#0b1220">A</text>
    <text x="44" y="112" fontFamily="monospace" fontSize="9" fill="#94a3b8">majority vote</text>
  </svg>
);
const GlyphAttentionRollout = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* layered attention matrices composing into a heatmap */}
    {[0, 1, 2].map(L => (
      <g key={L} opacity={0.5 + 0.18 * L}>
        {[0, 1, 2].map(r => [0, 1, 2].map(c => (
          <rect key={`${r}${c}`} x={28 + L * 10 + c * 9} y={30 + L * 10 + r * 9} width="8" height="8" fill={`rgba(168,85,247,${0.25 + 0.2 * ((r + c) % 3)})`} />
        )))}
      </g>
    ))}
    <text x="100" y="60" fontFamily="monospace" fontSize="16" fill="#94a3b8">{"∏"}</text>
    {[0, 1, 2].map(r => [0, 1, 2].map(c => (
      <rect key={`R${r}${c}`} x={116 + c * 10} y={42 + r * 10} width="9" height="9" fill={`rgba(168,85,247,${r === c ? 0.9 : 0.2 + 0.2 * c})`} />
    )))}
    <text x="34" y="110" fontFamily="monospace" fontSize="9" fill="#94a3b8">layers → attribution</text>
  </svg>
);
const GlyphAgentRouter = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* query routes to one of several tools */}
    <circle cx="28" cy="60" r="9" fill="#fbbf24" opacity="0.85" />
    {[30, 50, 70, 90].map((y, i) => {
      const chosen = i === 1;
      return <g key={i}>
        <line x1="37" y1="60" x2="104" y2={y + 6} stroke={chosen ? "#34d399" : "rgba(148,163,184,0.3)"} strokeWidth={chosen ? 2 : 1} />
        <rect x="106" y={y} width="34" height="12" rx="2" fill={chosen ? "#34d399" : "rgba(96,165,250,0.4)"} opacity="0.85" />
      </g>;
    })}
    <text x="34" y="108" fontFamily="monospace" fontSize="9" fill="#94a3b8">route to a tool</text>
  </svg>
);
const GlyphRagReranker = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* left: retrieved order (gold buried); right: reranked (gold on top) */}
    {[0, 1, 2, 3].map(i => { const gold = i === 2; return <rect key={`l${i}`} x="24" y={30 + i * 16} width="44" height="12" rx="2" fill={gold ? "#34d399" : "rgba(148,163,184,0.4)"} opacity="0.85" />; })}
    {[0, 1, 2, 3].map(i => { const gold = i === 0; return <rect key={`r${i}`} x="92" y={30 + i * 16} width="44" height="12" rx="2" fill={gold ? "#34d399" : "rgba(148,163,184,0.4)"} opacity="0.85" />; })}
    <line x1="70" y1="62" x2="90" y2="36" stroke="#fbbf24" strokeWidth="1.5" />
    <polygon points="90,36 82,37 85,43" fill="#fbbf24" />
    <text x="22" y="106" fontFamily="monospace" fontSize="9" fill="#94a3b8">retrieve → rerank</text>
  </svg>
);
const GlyphMultiQuery = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* three query variants feeding into one fused list */}
    {[34, 56, 78].map((y, i) => (
      <g key={i}>
        <rect x="20" y={y - 6} width="14" height="12" rx="2" fill="#a855f7" opacity="0.8" />
        <line x1="36" y1={y} x2="78" y2="56" stroke="rgba(148,163,184,0.4)" strokeWidth="1.2" />
      </g>
    ))}
    {/* fused ranked list */}
    {[40, 52, 64, 76].map((y, i) => (
      <rect key={i} x="86" y={y - 5} width="48" height="9" rx="2" fill={i < 3 ? "#34d399" : "rgba(96,165,250,0.4)"} opacity="0.85" />
    ))}
    <text x="20" y="100" fontFamily="monospace" fontSize="9" fill="#94a3b8">variants → RRF</text>
  </svg>
);
const GlyphRagChunking = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* document split into chunks; one chunk retrieved (green) */}
    {[28, 46, 64, 82].map((y, i) => (
      <rect key={i} x="20" y={y} width="60" height="13"
        fill={i === 2 ? "rgba(52,211,153,0.85)" : "rgba(96,165,250,0.45)"}
        stroke={i === 2 ? "#34d399" : "transparent"} strokeWidth="1.5" />
    ))}
    {/* query node + retrieval arrow */}
    <circle cx="128" cy="44" r="11" fill="#c084fc" opacity="0.85" />
    <text x="123" y="48" fontFamily="monospace" fontSize="11" fill="#0b1220">q</text>
    <line x1="117" y1="50" x2="84" y2="69" stroke="#34d399" strokeWidth="2" />
    <polygon points="84,69 92,66 90,73" fill="#34d399" />
  </svg>
);
const GlyphDPO = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* two policies (bar charts) converging to the same shape */}
    {[18, 30, 42, 54].map((x, i) => {
      const hgt = [14, 30, 46, 22][i];
      return <rect key={`l${i}`} x={x} y={92 - hgt} width="9" height={hgt} fill="#60a5fa" opacity="0.85" />;
    })}
    {[100, 112, 124, 136].map((x, i) => {
      const hgt = [16, 28, 48, 20][i];
      return <rect key={`r${i}`} x={x} y={92 - hgt} width="9" height={hgt} fill="#c084fc" opacity="0.85" />;
    })}
    <text x="22" y="106" fontFamily="monospace" fontSize="9" fill="#60a5fa">RLHF</text>
    <text x="106" y="106" fontFamily="monospace" fontSize="9" fill="#c084fc">DPO</text>
    <text x="74" y="52" fontFamily="monospace" fontSize="14" fill="#94a3b8">{"≈"}</text>
  </svg>
);
const GlyphRewardModel = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {/* two responses being compared */}
    <circle cx="46" cy="44" r="13" fill="#34d399" opacity="0.85" />
    <circle cx="114" cy="44" r="13" fill="rgba(96,165,250,0.5)" />
    <text x="40" y="48" fontFamily="monospace" fontSize="12" fill="#0b1220">A</text>
    <text x="108" y="48" fontFamily="monospace" fontSize="12" fill="#e2e8f0">B</text>
    {/* preference: A > B */}
    <text x="72" y="49" fontFamily="monospace" fontSize="16" fill="#fbbf24">{"≻"}</text>
    {/* learned scalar reward bars */}
    <rect x="34" y="76" width="24" height="30" fill="#a855f7" opacity="0.85" />
    <rect x="102" y="90" width="24" height="16" fill="#60a5fa" opacity="0.6" />
    <line x1="20" y1="106" x2="140" y2="106" stroke="rgba(148,163,184,0.4)" strokeWidth="1" />
    <text x="60" y="100" fontFamily="monospace" fontSize="9" fill="#94a3b8">r(x)</text>
  </svg>
);
const GlyphDQN = () => {
  const pts = Array.from({ length: 41 }, (_, i) => {
    const x = 16 + i * (128 / 40);
    const t = (i - 20) / 20;            // -1..1
    return `${x},${36 + 56 * t * t}`;   // tent / V-shape value curve
  }).join(" ");
  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {/* replay buffer cells */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <rect key={i} x={20 + i * 16} y={98} width="13" height="12"
          fill={i === 3 || i === 6 ? "#34d399" : "rgba(96,165,250,0.5)"} />
      ))}
      {/* Q value curve */}
      <polyline points={pts} fill="none" stroke="#fbbf24" strokeWidth="2" />
      <line x1="80" y1="20" x2="80" y2="92" stroke="rgba(52,211,153,0.5)" strokeWidth="6" />
    </svg>
  );
};
const GlyphDBSCAN = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    {[[40, 36, "#60a5fa"], [56, 28, "#60a5fa"], [50, 50, "#60a5fa"], [36, 52, "#60a5fa"], [42, 40, "#e0e7ff"],
      [108, 38, "#c084fc"], [120, 50, "#c084fc"], [114, 62, "#c084fc"], [98, 50, "#c084fc"], [112, 48, "#e0e7ff"],
      [70, 88, "#fbbf24"], [82, 96, "#fbbf24"], [90, 84, "#fbbf24"], [78, 90, "#e0e7ff"],
      [22, 14, "#475569"], [144, 18, "#475569"], [16, 102, "#475569"], [136, 104, "#475569"]].map(([x, y, c], i) => (
      <circle key={i} cx={x} cy={y} r={c === "#e0e7ff" ? 4 : c === "#475569" ? 2 : 3} fill={c} stroke={c === "#e0e7ff" ? "#60a5fa" : "none"} strokeWidth="1" />
    ))}
  </svg>
);
const GlyphRope = () => (
  <svg width="160" height="120" viewBox="0 0 160 120">
    <circle cx="80" cy="60" r="38" fill="none" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    {[0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4].map((a, i) => {
      const x = 80 + Math.cos(a) * 38;
      const y = 60 + Math.sin(a) * 38;
      return <g key={i}>
        <line x1="80" y1="60" x2={x} y2={y} stroke={i === 4 ? "#fbbf24" : "rgba(192,132,252,0.4)"} strokeWidth={i === 4 ? 2 : 1} />
        <circle cx={x} cy={y} r="2.5" fill={i === 4 ? "#fbbf24" : "#c084fc"} opacity="0.85" />
      </g>;
    })}
    <line x1="80" y1="60" x2={80 + 50} y2="60" stroke="#60a5fa" strokeWidth="2.4" />
    <circle cx={130} cy="60" r="3.5" fill="#60a5fa" />
  </svg>
);

const GLYPHS = {
  "pathfinding": <GlyphPath />,
  "kmeans": <GlyphKMeans />,
  "gradient-descent": <GlyphGradient />,
  "overfitting": <GlyphCurveFit />,
  "double-descent": <GlyphDoubleDescent />,
  "bias-variance-decomp": <GlyphBiasVariance />,
  "decision-tree": <GlyphTree />,
  "bagging-boosting": <GlyphBaggingBoosting />,
  "gaussian-process": <GlyphGaussianProcess />,
  "knn": <GlyphKnn />,
  "svm": <GlyphSVM />,
  "pca": <GlyphPCA />,
  "tsne": <GlyphTSNE />,
  "spectral-clustering": <GlyphSpectral />,
  "word2vec": <GlyphWord2Vec />,
  "kalman-filter": <GlyphKalman />,
  "hmm-viterbi": <GlyphHMM />,
  "kernel-density": <GlyphKDE />,
  "mcmc": <GlyphMCMC />,
  "perceptron": <GlyphPerceptron />,
  "naive-bayes": <GlyphNaiveBayes />,
  "ica": <GlyphICA />,
  "gmm": <GlyphGMM />,
  "roc": <GlyphROC />,
  "value-iteration": <GlyphValueIter />,
  "lr-schedule": <GlyphLR />,
  "gradient-clipping": <GlyphGradientClipping />,
  "lora": <GlyphLoRA />,
  "scaling-laws": <GlyphScaling />,
  "nms": <GlyphNMS />,
  "vector-search": <GlyphVectorSearch />,
  "forecasting": <GlyphForecast />,
  "markov": <GlyphMarkov />,
  "decoding": <GlyphDecoding />,
  "activations": <GlyphActivation />,
  "batch-norm": <GlyphBatchNorm />,
  "weight-init": <GlyphWeightInit />,
  "contrastive-learning": <GlyphContrastive />,
  "clt": <GlyphBell />,
  "fourier": <GlyphWave />,
  "attention": <GlyphAttention />,
  "multi-head-attention": <GlyphMultiHead />,
  "positional-encoding": <GlyphPositional />,
  "vae": <GlyphVAE />,
  "tokenizer": <GlyphTokenizer />,
  "gridworld-rl": <GlyphRL />,
  "bandit": <GlyphBandit />,
  "neural-playground": <GlyphNeuralNet />,
  "convolution": <GlyphKernel />,
  "diffusion": <GlyphDiffusion />,
  "embeddings": <GlyphEmbedding />,
  "bayes": <GlyphBayes />,
  "optimizers": <GlyphOptimizers />,
  "gan": <GlyphGAN />,
  "backprop": <GlyphBackprop />,
  "mcts": <GlyphMCTS />,
  "simulated-annealing": <GlyphSA />,
  "regression": <GlyphRegression />,
  "rnn-gates": <GlyphLSTM />,
  "beam-search": <GlyphBeam />,
  "kv-cache": <GlyphKVCache />,
  "gnn": <GlyphGNN />,
  "rope": <GlyphRope />,
  "dbscan": <GlyphDBSCAN />,
  "policy-gradient": <GlyphPolicyGradient />,
  "actor-critic": <GlyphActorCritic />,
  "dqn": <GlyphDQN />,
  "reward-model": <GlyphRewardModel />,
  "dpo": <GlyphDPO />,
  "rag-chunking": <GlyphRagChunking />,
  "multi-query": <GlyphMultiQuery />,
  "rag-reranker": <GlyphRagReranker />,
  "agent-router": <GlyphAgentRouter />,
  "attention-rollout": <GlyphAttentionRollout />,
  "self-consistency": <GlyphSelfConsistency />,
  "constrained-decoding": <GlyphConstrainedDecoding />,
  "guardrails": <GlyphGuardrails />,
  "lost-in-the-middle": <GlyphLostMiddle />,
  "hyde": <GlyphHyDE />,
  "reflection": <GlyphReflection />,
  "react-agent": <GlyphReactAgent />,
  "calibration": <GlyphCalibration />,
  "shap": <GlyphSHAP />,
  "conformal": <GlyphConformal />,
  "conformal-regression": <GlyphConformalRegression />,
  "active-learning": <GlyphActiveLearning />,
  "coreset": <GlyphCoreset />,
  "dataset-distillation": <GlyphDatasetDistillation />,
  "fairness": <GlyphFairness />,
  "n-queens": <GlyphNQueens />,
  "graph-coloring": <GlyphGraphColoring />,
  "sudoku": <GlyphSudoku />,
  "quantization": <GlyphQuantization />,
  "pruning": <GlyphPruning />,
  "distillation": <GlyphDistillation />,
  "moe": <GlyphMoE />,
  "mixed-precision": <GlyphMixedPrecision />,
  "paged-attention": <GlyphPagedAttention />,
  "speculative-decoding": <GlyphSpeculative />,
  "label-noise": <GlyphLabelNoise />,
  "mc-dropout": <GlyphMCDropout />,
  "saliency": <GlyphSaliency />,
  "drift-detection": <GlyphDriftDetection />,
  "do-intervention": <GlyphDoIntervention />,
  "instrumental-variables": <GlyphInstrumentalVariables />,
  "simpsons-paradox": <GlyphSimpsons />,
  "knapsack": <GlyphKnapsack />,
  "branch-and-bound": <GlyphBranchAndBound />,
  "bfs-dfs-astar": <GlyphBfsDfsAstar />,
  "edit-distance": <GlyphEditDistance />,
};

// ─── Page hero ────────────────────────────────────────────────
function PlayHero() {
  const mobile = useIsMobile();
  return (
    <Section id="top" padded={false} style={{ paddingTop: 160, paddingBottom: 80, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="blue" size={520} x={"-10%"} y={"-20%"} opacity={0.25} />
      <GlowBlob color="violet" size={480} x={"70%"} y={"40%"} opacity={0.22} />
      <MathWatermarks mode="dark" count={5} opacity={0.05} seed={4} />
      <HudBrackets mode="dark" inset={32} size={32} />

      <Container style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1.05fr) minmax(0, 0.95fr)", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{
            position: "absolute", left: -18, top: 20, bottom: 70, width: 3,
            background: "linear-gradient(to bottom, #3b82f6, #a855f7)",
            boxShadow: "0 0 16px rgba(59,130,246,0.5)",
          }} />
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <MonoLabel>// VISUALIZE · INTERACTIVE ML LIBRARIES</MonoLabel>
          </div>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(48px, 6vw, 84px)", letterSpacing: "-0.025em",
            lineHeight: 0.98, margin: 0,
            background: "linear-gradient(110deg, #3b82f6 0%, #e0e7ff 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Touch the math.</h1>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 620, fontSize: 17, lineHeight: 1.6 }}>
            Small, interactive AI demos. Each one ships standalone — drop in, drag a slider, watch a network learn. The fastest way to build intuition is to break something live.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <a href="#demos" style={{
              padding: "12px 22px", border: "1px solid var(--blue)",
              borderRadius: 4, color: "var(--white)", textDecoration: "none",
              fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
              background: "rgba(59,130,246,0.08)",
              boxShadow: "0 0 24px rgba(59,130,246,0.18)",
            }}>SEE THE LINEUP</a>
          </div>
        </div>
        {!mobile && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <NeuralNet layers={[3,6,5,4,3]} width={520} height={360} mode="dark" glow={0.85} pulse />
          </div>
        )}
      </Container>
    </Section>
  );
}

// ─── How it works ────────────────────────────────────────────
function HowItWorks() {
  const mobile = useIsMobile();
  const steps = [
    { n: "01", title: "Pick a concept.", desc: "Backprop. Attention. Q-learning. Whatever you want to feel." },
    { n: "02", title: "Drag a slider.", desc: "Each demo isolates one knob. Watch the system respond in real time." },
    { n: "03", title: "Break it.", desc: "Push the input out of distribution. Watch the model fail. That's where the learning is." },
  ];
  return (
    <Section id="how" padded={false} style={{ paddingTop: 24, paddingBottom: 80, scrollMarginTop: 140 }}>
      <Container>
        <div style={{ marginBottom: 32 }}>
          <MonoLabel>// HOW IT WORKS</MonoLabel>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
          {steps.map(s => (
            <div key={s.n} style={{
              padding: "24px 24px",
              border: "1px solid var(--border)", borderRadius: 6,
              background: "rgba(13, 24, 52, 0.4)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{
                fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 36,
                color: "var(--blue-lt)", letterSpacing: "-0.02em", lineHeight: 1,
              }}>{s.n}</div>
              <h3 style={{
                fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 22,
                letterSpacing: "-0.01em", color: "var(--white)", margin: 0,
              }}>{s.title}</h3>
              <div className="t-body" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ─── Demo card ────────────────────────────────────────────────
function DemoCard({ title, blurb, glyph, tone = "blue", topic, href, status, foundation }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  const border = tone === "violet" ? "var(--border-violet)" : "var(--border)";
  const live = status === "LIVE";
  const Wrap = href ? "a" : "div";
  const wrapProps = href ? { href } : {};
  return (
    <Wrap {...wrapProps} style={{
      position: "relative", overflow: "hidden",
      border: `1px solid ${border}`,
      borderRadius: 6,
      background: "linear-gradient(180deg, rgba(13, 24, 52, 0.55) 0%, rgba(13, 24, 52, 0.2) 100%)",
      display: "flex", flexDirection: "column",
      textDecoration: "none", color: "inherit",
      cursor: href ? "pointer" : "default",
      opacity: live ? 1 : 0.92,
      transition: "transform .25s, border-color .25s, box-shadow .25s",
    }}
      onMouseEnter={e => {
        if (!href) return;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.boxShadow = `0 0 28px ${tone === "violet" ? "rgba(192,132,252,0.18)" : "rgba(96,165,250,0.18)"}`;
      }}
      onMouseLeave={e => {
        if (!href) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = border;
        e.currentTarget.style.boxShadow = "none";
      }}>
      <HudBrackets mode="dark" inset={8} size={18} />
      <div style={{
        height: 200, display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid ${border}`,
        background: "rgba(5, 8, 22, 0.5)",
        filter: live ? "none" : "grayscale(0.35)",
      }}>{glyph}</div>
      <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="t-mono-s" style={{ color: accent, fontSize: 10 }}>{topic}</span>
          <span className="t-mono-s" style={{
            color: live ? accent : "var(--muted)", fontSize: 9, letterSpacing: "0.12em",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            {live && <span style={{ width: 5, height: 5, borderRadius: 999, background: accent, boxShadow: `0 0 6px ${accent}` }} />}
            {live ? "LIVE" : "SOON"}
          </span>
        </div>
        <h3 style={{
          fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 22,
          letterSpacing: "-0.01em", color: "var(--white)", margin: 0,
        }}>{title}</h3>
        <div className="t-small" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>{blurb}</div>
        {foundation && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <span style={{ color: accent, fontSize: 9 }}>◆</span>
            <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.06em" }}>{foundation}</span>
          </div>
        )}
        {live && <span className="t-mono-s" style={{ color: accent, fontSize: 10, marginTop: 6 }}>OPEN →</span>}
      </div>
    </Wrap>
  );
}

function Demos() {
  const reg = window.PLAY_DEMOS || {};
  const list = reg.demos || [];
  const cats = reg.categories || [{ name: "All", why: "", slugs: list.map(d => d.slug) }];
  const BASE = window.__DM_BASE || "../";
  const liveCount = list.filter(d => d.status === "LIVE").length;
  const mobile = useIsMobile();
  return (
    <Section id="demos">
      <GridOverlay mode="dark" spacing={80} opacity={0.3} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 44 }}>
          <MonoLabel>// DEMOS · GROUPED BY CONCEPT</MonoLabel>
          <h2 style={{
            fontFamily: "var(--f-display)", fontWeight: 700,
            fontSize: "clamp(36px, 4vw, 52px)", letterSpacing: "-0.02em",
            color: "var(--white)", margin: 0, lineHeight: 1.05,
          }}>The lineup.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 660, fontSize: 16, marginTop: 4 }}>
            Grouped by what they teach — each one runs in the browser, computes the real
            algorithm, and links to the matching lesson. Start anywhere.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 52 }}>
          {cats.map(cat => {
            const items = cat.slugs.map(s => reg.findDemo(s)).filter(Boolean);
            if (!items.length) return null;
            const cols = mobile ? 1 : Math.min(3, items.length);
            return (
              <div key={cat.name} id={"cat-" + vizSlug(cat.name)} style={{ scrollMarginTop: 140 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <h3 style={{
                      fontFamily: "var(--f-display)", fontWeight: 600, fontSize: "clamp(22px, 2.4vw, 28px)",
                      letterSpacing: "-0.015em", color: "var(--white)", margin: 0,
                    }}>{cat.name}</h3>
                    <span style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.4 }} />
                  </div>
                  {cat.why && (
                    <div className="t-body" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 820 }}>{cat.why}</div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
                  {items.map(d => (
                    <DemoCard key={d.slug}
                      topic={d.topic} title={d.title} blurb={d.blurb} tone={d.tone}
                      glyph={GLYPHS[d.slug] || <GlyphNeuralNet />}
                      foundation={reg.foundations && reg.foundations[d.slug]}
                      href={d.status === "LIVE" ? `${BASE}visualize/${d.slug}/` : null}
                      status={d.status} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

// ─── Suggest CTA ─────────────────────────────────────────────
function SuggestCta() {
  const mobile = useIsMobile();
  return (
    <Section style={{ paddingTop: 60, paddingBottom: 60 }}>
      <Container>
        <div style={{
          position: "relative", overflow: "hidden",
          padding: "44px 44px",
          border: "1px dashed var(--border-violet)", borderRadius: 8,
          background: "linear-gradient(120deg, rgba(168,85,247,0.06) 0%, rgba(59,130,246,0.06) 100%)",
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.4fr auto", gap: 32, alignItems: "center",
        }}>
          <HudBrackets mode="dark" inset={10} size={22} />
          <div>
            <MonoLabel color="var(--violet-lt)">// REQUEST.DEMO</MonoLabel>
            <h3 style={{
              fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 30,
              letterSpacing: "-0.02em", color: "var(--white)", margin: "10px 0 12px",
            }}>Want a specific demo built next?</h3>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 580, fontSize: 15, lineHeight: 1.55 }}>
              Send a concept I should make tactile. Bonus points for "thing I almost understand but want to feel."
            </div>
          </div>
          <button type="button" onClick={() => window.__dmCopyEmail()} title="Copy email address" style={{
            padding: "14px 26px", border: "1px solid var(--violet-lt)",
            borderRadius: 4, color: "var(--white)", textDecoration: "none", cursor: "pointer",
            fontFamily: "var(--f-mono)", fontSize: 13, letterSpacing: "0.1em",
            background: "rgba(168,85,247,0.14)",
            whiteSpace: "nowrap",
          }}>SUGGEST A DEMO →</button>
        </div>
      </Container>
    </Section>
  );
}

// ─── Concepts in motion (animated explainers, top of Visualize) ──
const vizSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function VizConcepts() {
  const mobile = useIsMobile();
  const BASE = window.__DM_BASE || "../";
  const tiles = [
    { src: "viz/feedforward.html", label: "// FORWARD PASS", name: "Feedforward Net" },
    { src: "viz/convolution.html", label: "// KERNEL SCAN", name: "Convolution" },
    { src: "viz/transformer.html", label: "// SELF-ATTENTION", name: "Transformers" },
    { src: "viz/gradient.html", label: "// OPTIMIZATION", name: "Gradient Descent" },
    { src: "viz/recurrence.html", label: "// SEQUENCE", name: "Recurrence" },
    { src: "viz/embeddings.html", label: "// REPRESENTATION", name: "Embeddings" },
  ];
  return (
    <Section id="motion" style={{ position: "relative", overflow: "hidden", paddingTop: 24 }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.25} />
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          <MonoLabel color="var(--violet-lt)">// CONCEPTS IN MOTION</MonoLabel>
          <h2 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(30px, 3.6vw, 44px)", letterSpacing: "-0.02em", color: "var(--white)", margin: 0, lineHeight: 1.05 }}>The ideas, animated.</h2>
          <div className="t-body" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 16, marginTop: 4 }}>
            Looping visual explainers for the concepts behind the demos below — a preview of the full <a href={`${BASE}learn/key-concepts/`} style={{ color: "var(--violet-lt)", textDecoration: "none" }}>Key Concepts</a> gallery.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {tiles.map(t => (
            <div key={t.src} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(5, 8, 22, 0.5)", display: "flex", flexDirection: "column" }}>
              <HudBrackets mode="dark" inset={8} size={18} />
              <iframe src={`${BASE}${t.src}`} title={t.name} loading="lazy" scrolling="no" style={{ width: "100%", height: 200, border: "none", background: "transparent", pointerEvents: "none", display: "block" }} />
              <div style={{ padding: "14px 18px 16px", borderTop: "1px solid var(--border)" }}>
                <div className="t-mono-s" style={{ color: "var(--violet-lt)", fontSize: 10, marginBottom: 3 }}>{t.label}</div>
                <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 17, color: "var(--white)" }}>{t.name}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <a href={`${BASE}learn/key-concepts/`} className="t-mono-s" style={{
            display: "inline-block", padding: "12px 22px", border: "1px solid var(--violet)", borderRadius: 4,
            color: "var(--white)", textDecoration: "none", letterSpacing: "0.1em", background: "rgba(168,85,247,0.10)",
          }}>SEE ALL KEY CONCEPTS →</a>
        </div>
      </Container>
    </Section>
  );
}

// ─── Quick jump-nav (sticky; Concepts + demo categories + how-it-works) ──
function useNavHeight() {
  const [h, setH] = React.useState(64);
  React.useEffect(() => {
    const measure = () => { const n = document.querySelector("nav"); if (n) setH(n.offsetHeight); };
    measure(); const t = setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t); };
  }, []);
  return h;
}
function VizJump() {
  const navH = useNavHeight();
  const reg = window.PLAY_DEMOS || {};
  const cats = reg.categories || [];
  const items = [{ href: "#motion", label: "CONCEPTS" }, ...cats.map(c => ({ href: "#cat-" + vizSlug(c.name), label: c.name.toUpperCase() })), { href: "#how", label: "HOW IT WORKS" }];
  return (
    <div style={{ position: "sticky", top: navH, zIndex: 40, backdropFilter: "blur(12px)", background: "rgba(5,8,22,0.82)", borderTop: "1px solid rgba(96,165,250,0.12)", borderBottom: "1px solid rgba(96,165,250,0.12)" }}>
      <Container style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "11px 48px", alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginRight: 4 }}>JUMP TO</span>
        {items.map(it => (
          <a key={it.href} href={it.href} className="t-mono-s"
            style={{ padding: "5px 11px", border: "1px solid var(--border)", borderRadius: 999, color: "var(--muted)", textDecoration: "none", fontSize: 10, letterSpacing: "0.06em" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--blue-br)"; e.currentTarget.style.borderColor = "var(--blue-lt)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
            {it.label}
          </a>
        ))}
      </Container>
    </div>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <PlayHero />
      <VizJump />
      <VizConcepts />
      <Demos />
      <HowItWorks />
      <SuggestCta />
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
