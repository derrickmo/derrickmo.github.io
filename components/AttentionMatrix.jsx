// components/AttentionMatrix.jsx — token×token attention heatmap.
//
// Props:
//   tokens: string[] (query tokens — also used as key tokens for self-attention)
//   keys: string[] (optional, for cross-attention; defaults to `tokens`)
//   weights: number[][] (optional; if omitted, generates a plausible-looking pattern)
//   highlight: { row?, col? } — outline a row/col for "show this query"
//   width, height, mode, palette

function AttentionMatrix({
  tokens = ["The", "cat", "sat", "on", "the", "mat"],
  keys = null,
  weights = null,
  highlight = null,
  showLabels = true,
  width = 460,
  height = 460,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";

  const ks = keys || tokens;
  const N = tokens.length;
  const K = ks.length;

  // Generate plausible attention if not provided.
  // Pattern: diagonal-ish bias + a few peaks at content words.
  const W = weights || (() => {
    const w = [];
    for (let i = 0; i < N; i++) {
      const row = [];
      for (let j = 0; j < K; j++) {
        const diag = Math.exp(-Math.abs(i - j) * 0.35);
        const noise = (Math.sin(i * 7.3 + j * 11.1) + 1) * 0.18;
        row.push(diag * 0.85 + noise);
      }
      // softmax-ish normalize row
      const sum = row.reduce((a, b) => a + b, 0) || 1;
      w.push(row.map(v => v / sum));
    }
    return w;
  })();

  // Layout
  const labelGutter = showLabels ? 80 : 16;
  const matX = labelGutter;
  const matY = labelGutter;
  const matW = width - matX - 16;
  const matH = height - matY - 16;
  const cellW = matW / K;
  const cellH = matH / N;

  // Find max weight for normalization
  const maxW = Math.max(...W.flat());

  const cells = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < K; j++) {
      const v = W[i][j] / maxW;
      const isHL = highlight && (highlight.row === i || highlight.col === j);
      const col = i % 2 === 0 ? blue : violet;
      cells.push(
        <rect key={`c${i}-${j}`}
          x={matX + j * cellW} y={matY + i * cellH}
          width={cellW - 1} height={cellH - 1}
          fill={col}
          opacity={0.1 + v * 0.85}
          stroke={isHL ? "white" : "none"} strokeWidth={isHL ? 1 : 0} />
      );
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid background outline */}
      <rect x={matX} y={matY} width={matW} height={matH}
        fill="none" stroke={muted} strokeWidth="0.5" opacity="0.4" />

      {/* Key tokens (top axis labels) */}
      {showLabels && ks.map((tok, j) => (
        <text key={`k${j}`}
          x={matX + (j + 0.5) * cellW}
          y={matY - 8}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize={Math.min(11, cellW * 0.65)}
          fill={muted}>{tok}</text>
      ))}

      {/* Query tokens (left axis labels) */}
      {showLabels && tokens.map((tok, i) => (
        <text key={`q${i}`}
          x={matX - 8}
          y={matY + (i + 0.5) * cellH + 3}
          textAnchor="end"
          fontFamily="JetBrains Mono, monospace"
          fontSize={Math.min(11, cellH * 0.65)}
          fill={muted}>{tok}</text>
      ))}

      {/* Axis labels */}
      {showLabels && (
        <>
          <text x={matX + matW / 2} y={16}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="9"
            letterSpacing="0.12em" fill={muted}>// KEYS · K →</text>
          <text x={20} y={matY + matH / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${matY + matH / 2})`}
            fontFamily="JetBrains Mono, monospace" fontSize="9"
            letterSpacing="0.12em" fill={muted}>// QUERIES · Q ↓</text>
        </>
      )}

      {/* Heatmap cells */}
      {cells}

      {/* HUD label bottom-right */}
      <text x={width - 12} y={height - 6} textAnchor="end"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.12em" fill={muted}>ATTN(Q·K<tspan baselineShift="super" fontSize="6">⊤</tspan>) / √d</text>
    </svg>
  );
}

window.AttentionMatrix = AttentionMatrix;
