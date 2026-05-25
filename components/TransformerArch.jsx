// components/TransformerArch.jsx — full transformer architecture diagram.
// Tokens → embed + pos → N × [self-attn + add&norm + FFN + add&norm] → head.
//
// Distinct from the simpler TransformerBlock — this shows the full stack
// with residual connections, normalization, and the FFN.
//
// Props:
//   variant: "decoder" (default, GPT-style) | "encoder" (BERT-style)
//   numLayers: int (default 2, just for visual depth — labels show N×)
//   showResiduals: bool — draw residual loop arrows
//   width, height, mode

function TransformerArch({
  variant = "decoder",
  numLayers = 2,
  showResiduals = true,
  width = 460,
  height = 560,
  mode = "dark",
}) {
  const blue   = mode === "paper" ? "#2563eb" : "#60a5fa";
  const violet = mode === "paper" ? "#7c3aed" : "#c084fc";
  const ink    = mode === "paper" ? "#0a1428" : "#e0e7ff";
  const muted  = mode === "paper" ? "#94a3b8" : "#475569";
  const card   = mode === "paper" ? "#ffffff" : "#0a1428";

  const colW = Math.min(220, width * 0.55);
  const cx = width / 2;
  const xL = cx - colW / 2;

  // Stack rows: input → embed+pos → [attn → norm → ffn → norm] × N → head
  const isMasked = variant === "decoder";

  // Vertical layout (top to bottom)
  let y = 30;
  const gap = 14;
  const rowH = 40;
  const rows = [];
  const arrows = [];
  const residuals = [];

  // helper: pill box
  const pill = (label, sub, accent, fill = card) => {
    const top = y;
    rows.push(
      <g key={`r${rows.length}`}>
        <rect x={xL} y={top} width={colW} height={rowH}
          fill={fill} stroke={accent} strokeWidth="1" rx="4" />
        <text x={cx} y={top + 18} textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif" fontWeight="600"
          fontSize="13" fill={ink}>{label}</text>
        {sub && (
          <text x={cx} y={top + 31} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="9"
            letterSpacing="0.1em" fill={muted}>{sub}</text>
        )}
      </g>
    );
    y += rowH + gap;
  };

  // arrow between previous row's bottom and current row's top
  const downArrow = () => {
    const yTop = y - gap;     // bottom of previous row
    const yBot = y - 2;       // top of next row (about to be drawn)
    arrows.push(
      <g key={`a${arrows.length}`}>
        <line x1={cx} y1={yTop} x2={cx} y2={yBot - 5}
          stroke={blue} strokeWidth="0.9" opacity="0.85" />
        <polygon points={`${cx},${yBot} ${cx - 4},${yBot - 5} ${cx + 4},${yBot - 5}`}
          fill={blue} />
      </g>
    );
  };

  // residual loop (right side, curving from before → after)
  const residual = (yFrom, yTo, label) => {
    if (!showResiduals) return;
    const xR = xL + colW + 16;
    residuals.push(
      <g key={`res${residuals.length}`}>
        <path d={`M ${xL + colW} ${yFrom} L ${xR} ${yFrom} L ${xR} ${yTo} L ${xL + colW + 4} ${yTo}`}
          stroke={violet} strokeWidth="0.7" fill="none" opacity="0.6"
          strokeDasharray="3 3" />
        <polygon points={`${xL + colW + 4},${yTo} ${xL + colW + 9},${yTo - 3} ${xL + colW + 9},${yTo + 3}`}
          fill={violet} opacity="0.8" />
        {label && (
          <text x={xR + 4} y={(yFrom + yTo) / 2 + 3}
            fontFamily="JetBrains Mono, monospace" fontSize="8"
            letterSpacing="0.06em" fill={violet}>{label}</text>
        )}
      </g>
    );
  };

  // ── 1. Input
  pill("Tokens", "INPUT::SEQ", blue);

  // ── 2. Embedding + positional
  downArrow();
  pill("Embed + Pos", "DIM::d_model", blue);

  // ── 3. N × Transformer Block
  for (let layer = 0; layer < numLayers; layer++) {
    // Self-attention
    downArrow();
    const attnTop = y;
    pill(
      isMasked && layer === 0 ? "Masked Self-Attention" : "Self-Attention",
      `${isMasked ? "CAUSAL · " : ""}H·HEADS`,
      violet
    );
    const attnBot = y - gap;

    // Add & Norm (residual from before attn)
    downArrow();
    const norm1Top = y;
    pill("Add + Norm", "LAYERNORM", blue);
    residual(attnTop - gap / 2, norm1Top + rowH / 2, "");

    // FFN
    downArrow();
    const ffnTop = y;
    pill("Feed Forward", "d_model → 4·d_model → d_model", violet);
    const ffnBot = y - gap;

    // Add & Norm
    downArrow();
    const norm2Top = y;
    pill("Add + Norm", "LAYERNORM", blue);
    residual(ffnTop - gap / 2, norm2Top + rowH / 2, "");

    // Layer label
    if (layer === numLayers - 1) {
      // Add a small "× N" label at the right of the last layer's box
    }
  }

  // ── 4. Output head
  downArrow();
  pill(isMasked ? "LM Head" : "Classifier", isMasked ? "VOCAB" : "CLS", violet);

  // N× label on the right side spanning all layers
  const NxLabelY = 110 + (rowH + gap) * 1.5; // approx
  const layerBlockHeight = (rowH + gap) * 4; // attn + norm + ffn + norm
  const allLayersTop = 110 + (rowH + gap) * 1.5;
  const allLayersBot = allLayersTop + layerBlockHeight * numLayers;
  const nxLabel = (
    <g>
      <line x1={xL - 24} y1={allLayersTop} x2={xL - 24} y2={allLayersBot}
        stroke={muted} strokeWidth="0.6" opacity="0.6" />
      <line x1={xL - 24} y1={allLayersTop} x2={xL - 18} y2={allLayersTop + 4}
        stroke={muted} strokeWidth="0.6" opacity="0.6" />
      <line x1={xL - 24} y1={allLayersBot} x2={xL - 18} y2={allLayersBot - 4}
        stroke={muted} strokeWidth="0.6" opacity="0.6" />
      <text x={xL - 32} y={(allLayersTop + allLayersBot) / 2 + 3}
        textAnchor="end"
        fontFamily="JetBrains Mono, monospace" fontSize="11"
        fontWeight="600" letterSpacing="0.06em"
        fill={blue}>× N</text>
      <text x={xL - 32} y={(allLayersTop + allLayersBot) / 2 + 18}
        textAnchor="end"
        fontFamily="JetBrains Mono, monospace" fontSize="8"
        fill={muted}>LAYERS</text>
    </g>
  );

  // Output arrow
  arrows.push(
    <g key="out">
      <line x1={cx} y1={y - gap} x2={cx} y2={y - gap + 12}
        stroke={blue} strokeWidth="0.9" opacity="0.85" />
      <polygon points={`${cx},${y - gap + 16} ${cx - 4},${y - gap + 11} ${cx + 4},${y - gap + 11}`}
        fill={blue} />
    </g>
  );

  return (
    <svg width={width} height={Math.max(height, y + 30)} viewBox={`0 0 ${width} ${Math.max(height, y + 30)}`}>
      {arrows}
      {residuals}
      {rows}
      {numLayers >= 1 && nxLabel}
      {/* variant label */}
      <text x={width - 12} y={20} textAnchor="end"
        fontFamily="JetBrains Mono, monospace" fontSize="9"
        letterSpacing="0.12em" fill={muted}>// {variant.toUpperCase()}</text>
    </svg>
  );
}

window.TransformerArch = TransformerArch;
