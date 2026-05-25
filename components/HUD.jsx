// components/HUD.jsx — HUD atoms shared across all surfaces
// All accept `mode="dark" | "paper"` and reach into tokens.css via CSS vars.

const c = (mode, dark, paper) => (mode === "paper" ? paper : dark);

// ─── HUD corner brackets ───────────────────────────────────────
function HudBrackets({ mode = "dark", inset = 14, size = 28, thickness = 1 }) {
  const blue = c(mode, "var(--blue)", "var(--blue-paper)");
  const violet = c(mode, "var(--violet)", "var(--violet-paper)");
  const corners = [
    { pos: { top: inset, left: inset }, color: blue, rot: 0 },
    { pos: { top: inset, right: inset }, color: blue, rot: 90 },
    { pos: { bottom: inset, right: inset }, color: violet, rot: 180 },
    { pos: { bottom: inset, left: inset }, color: violet, rot: 270 },
  ];
  return (
    <>
      {corners.map((c2, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          style={{
            position: "absolute",
            ...c2.pos,
            pointerEvents: "none",
            transform: `rotate(${c2.rot}deg)`,
          }}
        >
          <path
            d={`M 0 ${size * 0.55} L 0 0 L ${size * 0.55} 0`}
            fill="none"
            stroke={c2.color}
            strokeWidth={thickness}
            strokeLinecap="square"
          />
        </svg>
      ))}
    </>
  );
}

// ─── Mono label: // TEXT or TEXT::VALUE ────────────────────────
function MonoLabel({ children, color, mode = "dark", style }) {
  const defaultColor = c(mode, "var(--blue-lt)", "var(--blue-paper)");
  return (
    <span
      className="t-mono-s"
      style={{ color: color || defaultColor, ...style }}
    >
      {children}
    </span>
  );
}

// ─── Status pill ───────────────────────────────────────────────
const STATUS_TONE = {
  DEPLOYED: "blue",
  ACTIVE: "blue",
  ONLINE: "blue",
  RESEARCH: "violet",
  OPEN_SOURCE: "violet",
  BETA: "violet",
};
function StatusPill({ status = "ACTIVE", mode = "dark" }) {
  const tone = STATUS_TONE[status] || "blue";
  const color = tone === "blue"
    ? c(mode, "var(--blue-lt)", "var(--blue-paper)")
    : c(mode, "var(--violet-lt)", "var(--violet-paper)");
  const border = tone === "blue"
    ? c(mode, "var(--border)", "var(--border-paper)")
    : c(mode, "var(--border-violet)", "var(--border-paper-violet)");
  return (
    <span
      className="t-mono-s"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px 3px 7px",
        border: `1px solid ${border}`,
        borderRadius: 999,
        color,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {status}
    </span>
  );
}

// ─── Tech chip ─────────────────────────────────────────────────
function TechChip({ children, tone = "violet", mode = "dark" }) {
  const color = tone === "violet"
    ? c(mode, "var(--violet-lt)", "var(--violet-paper)")
    : c(mode, "var(--blue-lt)", "var(--blue-paper)");
  const border = tone === "violet"
    ? c(mode, "var(--border-violet)", "var(--border-paper-violet)")
    : c(mode, "var(--border)", "var(--border-paper)");
  return (
    <span
      className="t-mono-s"
      style={{
        display: "inline-flex",
        padding: "4px 10px",
        border: `1px solid ${border}`,
        borderRadius: 4,
        color,
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </span>
  );
}

// ─── Grid overlay ──────────────────────────────────────────────
function GridOverlay({ mode = "dark", spacing = 60, opacity = 1 }) {
  const line = mode === "paper" ? "var(--grid-paper)" : "var(--grid-line-soft)";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        backgroundImage: `
          linear-gradient(to right, ${line} 1px, transparent 1px),
          linear-gradient(to bottom, ${line} 1px, transparent 1px)
        `,
        backgroundSize: `${spacing}px ${spacing}px`,
      }}
    />
  );
}

// ─── Glow blob (dark mode only) ────────────────────────────────
function GlowBlob({ color = "blue", size = 400, x = 0, y = 0, opacity = 0.35 }) {
  const col = color === "violet" ? "168, 85, 247" : "59, 130, 246";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(${col}, ${opacity}) 0%, rgba(${col}, 0) 70%)`,
        pointerEvents: "none",
        filter: "blur(20px)",
      }}
    />
  );
}

// ─── Particle field (dark mode atmosphere) ─────────────────────
function ParticleField({ count = 60, seed = 1 }) {
  // Deterministic pseudo-random
  const rng = (i) => {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const dots = Array.from({ length: count }, (_, i) => ({
    x: rng(i) * 100,
    y: rng(i + 1000) * 100,
    s: rng(i + 2000) * 1.8 + 0.5,
    o: rng(i + 3000) * 0.5 + 0.15,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.s,
            height: d.s,
            borderRadius: 999,
            background: "var(--blue-br)",
            opacity: d.o,
          }}
        />
      ))}
    </div>
  );
}

// ─── Math watermark layer ──────────────────────────────────────
const MATH_EQS = [
  "L = -E[log p(y|x)]",
  "Attention(Q,K,V) = softmax(QK^T / √d_k) V",
  "h_t = σ(Wx_t + Uh_{t-1})",
  "∇_θ J(θ) = E[∇_θ log π_θ(a|s) Q^π(s,a)]",
  "p(x) = ∫ p(x|z) p(z) dz",
  "ŷ = arg max_y P(y | x; θ)",
  "KL(p ‖ q) = Σ p(x) log(p(x)/q(x))",
];
function MathWatermarks({ mode = "dark", count = 5, seed = 7, opacity = 0.05 }) {
  const rng = (i) => {
    const x = Math.sin(i * 9.123 + seed * 41.71) * 13251.31;
    return x - Math.floor(x);
  };
  const color = mode === "paper" ? "var(--ink)" : "var(--blue-br)";
  const items = Array.from({ length: count }, (_, i) => ({
    eq: MATH_EQS[i % MATH_EQS.length],
    x: rng(i) * 80 + 5,
    y: rng(i + 100) * 80 + 5,
    rot: (rng(i + 200) - 0.5) * 10,
    size: 12 + rng(i + 300) * 6,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {items.map((it, i) => (
        <div
          key={i}
          className="t-mono"
          style={{
            position: "absolute",
            left: `${it.x}%`,
            top: `${it.y}%`,
            color,
            opacity,
            fontSize: it.size,
            transform: `rotate(${it.rot}deg)`,
            whiteSpace: "nowrap",
          }}
        >
          {it.eq}
        </div>
      ))}
    </div>
  );
}

// ─── Scan line ─────────────────────────────────────────────────
function ScanLine({ orientation = "vertical", mode = "dark", style }) {
  const color = c(mode, "var(--border)", "var(--border-paper)");
  const isV = orientation === "vertical";
  return (
    <div
      style={{
        position: "absolute",
        background: color,
        ...(isV
          ? { top: "8%", bottom: "8%", width: 1 }
          : { left: "8%", right: "8%", height: 1 }),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          ...(isV
            ? { left: -3, top: "50%", width: 7, height: 7, marginTop: -3.5 }
            : { top: -3, left: "50%", width: 7, height: 7, marginLeft: -3.5 }),
          border: `1px solid ${color}`,
          borderRadius: 999,
          background: c(mode, "var(--bg-deep)", "var(--paper)"),
        }}
      />
    </div>
  );
}

Object.assign(window, {
  HudBrackets,
  MonoLabel,
  StatusPill,
  TechChip,
  GridOverlay,
  GlowBlob,
  ParticleField,
  MathWatermarks,
  ScanLine,
});
