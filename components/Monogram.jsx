// components/Monogram.jsx — "DM" monogram, 3 directions
// Variants: "bracket" | "stacked" | "node"

function Monogram({ variant = "bracket", size = 80, mode = "dark" }) {
  const blue = mode === "paper" ? "var(--blue-paper)" : "var(--blue)";
  const violet = mode === "paper" ? "var(--violet-paper)" : "var(--violet)";
  const ink = mode === "paper" ? "var(--ink)" : "var(--white)";

  if (variant === "bracket") {
    // [ DM ] in mono, HUD bracket framing
    return (
      <svg width={size} height={size * 0.5} viewBox="0 0 160 80" style={{ display: "block" }}>
        {/* left bracket */}
        <path d="M 8 16 L 8 8 L 28 8" stroke={blue} strokeWidth="1.5" fill="none" />
        <path d="M 8 64 L 8 72 L 28 72" stroke={violet} strokeWidth="1.5" fill="none" />
        {/* right bracket */}
        <path d="M 152 16 L 152 8 L 132 8" stroke={blue} strokeWidth="1.5" fill="none" />
        <path d="M 152 64 L 152 72 L 132 72" stroke={violet} strokeWidth="1.5" fill="none" />
        {/* DM glyphs */}
        <text x="80" y="56" textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700"
          fontSize="44"
          fill={ink}
          letterSpacing="-0.02em">DM</text>
      </svg>
    );
  }

  if (variant === "stacked") {
    // D over M, tight grid, diagonal scan-line
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
        {/* grid box */}
        <rect x="6" y="6" width="88" height="88" fill="none" stroke={blue} strokeWidth="0.8" opacity="0.5" />
        {/* diagonal scan */}
        <line x1="6" y1="94" x2="94" y2="6" stroke={violet} strokeWidth="0.6" opacity="0.4" strokeDasharray="2 3" />
        {/* horizontal mid */}
        <line x1="6" y1="50" x2="94" y2="50" stroke={blue} strokeWidth="0.6" opacity="0.4" />
        {/* D top */}
        <text x="50" y="42" textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700"
          fontSize="36"
          fill={ink}>D</text>
        {/* M bottom */}
        <text x="50" y="84" textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700"
          fontSize="36"
          fill={ink}>M</text>
      </svg>
    );
  }

  if (variant === "node") {
    // D and M as nodes joined by edge
    return (
      <svg width={size * 1.6} height={size * 0.7} viewBox="0 0 160 70" style={{ display: "block" }}>
        {/* connecting edge */}
        <line x1="40" y1="35" x2="120" y2="35" stroke={blue} strokeWidth="0.8" opacity="0.6" />
        {/* nodes */}
        <circle cx="40" cy="35" r="26" fill="none" stroke={blue} strokeWidth="1" />
        <circle cx="40" cy="35" r="20" fill="none" stroke={blue} strokeWidth="0.5" opacity="0.4" />
        <circle cx="120" cy="35" r="26" fill="none" stroke={violet} strokeWidth="1" />
        <circle cx="120" cy="35" r="20" fill="none" stroke={violet} strokeWidth="0.5" opacity="0.4" />
        {/* glyphs */}
        <text x="40" y="46" textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700"
          fontSize="28"
          fill={ink}>D</text>
        <text x="120" y="46" textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700"
          fontSize="28"
          fill={ink}>M</text>
      </svg>
    );
  }
  return null;
}

window.Monogram = Monogram;
