// components/controls.jsx — reusable HUD-styled controls for the Play demos.
// Loaded as a module script before each demo app; exposes components on window.

const { useState: _useState } = React;

// ─── Help superscript (hover tooltip describing a parameter) ──
function HelpTip({ text }) {
  if (!text) return null;
  return (
    <sup title={text} role="img" aria-label={"Help: " + text}
      style={{ marginLeft: 5, cursor: "help", color: "var(--blue-lt)", fontSize: 8.5, fontWeight: 700, border: "1px solid var(--border)", borderRadius: 999, padding: "1px 4px", verticalAlign: "super", lineHeight: 1, userSelect: "none" }}>?</sup>
  );
}

// ─── Slider ───────────────────────────────────────────────────
function Slider({ label, min, max, step = 1, value, onChange, suffix = "", tone = "blue", help }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}<HelpTip text={help} /></span>
        <span className="t-mono" style={{ color: accent, fontSize: 13 }}>{value}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: accent, cursor: "pointer" }} />
    </label>
  );
}

// ─── Segmented control ────────────────────────────────────────
function SegmentedControl({ label, options, value, onChange, tone = "blue", help }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}<HelpTip text={help} /></span>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, border: "1px solid var(--border)", borderRadius: 6, padding: 4 }}>
        {options.map(o => {
          const active = o.value === value;
          return (
            <button key={o.value} onClick={() => onChange(o.value)}
              className="t-mono-s"
              style={{
                flex: "1 1 auto", padding: "8px 10px", borderRadius: 4,
                border: "1px solid transparent", cursor: "pointer",
                background: active ? "rgba(59,130,246,0.14)" : "transparent",
                color: active ? accent : "var(--muted)",
                borderColor: active ? accent : "transparent",
                transition: "all .15s", whiteSpace: "nowrap",
              }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────
function Toggle({ label, checked, onChange, tone = "blue", help }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  return (
    <button onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "10px 12px", borderRadius: 6, cursor: "pointer",
        border: "1px solid var(--border)", background: "rgba(13,24,52,0.4)", width: "100%",
      }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}<HelpTip text={help} /></span>
      <span style={{
        width: 38, height: 20, borderRadius: 999, position: "relative",
        background: checked ? accent : "var(--dim)", transition: "background .2s", flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 20 : 2, width: 16, height: 16,
          borderRadius: 999, background: "var(--bg-deep)", transition: "left .2s",
        }} />
      </span>
    </button>
  );
}

// ─── Button ───────────────────────────────────────────────────
function DemoButton({ onClick, children, tone = "blue", primary = false, disabled = false }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  return (
    <button onClick={onClick} disabled={disabled}
      className="t-mono-s"
      style={{
        padding: "10px 16px", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${primary ? accent : "var(--border)"}`,
        background: primary ? "rgba(59,130,246,0.16)" : "transparent",
        color: disabled ? "var(--dim)" : primary ? "var(--white)" : "var(--muted)",
        opacity: disabled ? 0.5 : 1, transition: "all .15s", flex: "1 1 auto",
        boxShadow: primary ? "0 0 18px rgba(59,130,246,0.18)" : "none",
      }}>
      {children}
    </button>
  );
}

// ─── Stat readout ─────────────────────────────────────────────
function StatReadout({ label, value, accent = "var(--blue-lt)" }) {
  return (
    <div style={{
      padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 6,
      background: "rgba(13,24,52,0.4)", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{label}</span>
      <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22, color: accent, letterSpacing: "-0.01em", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────
function Legend({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
      {items.map(it => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: it.color, border: it.border || "none" }} />
          <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10 }}>{it.label}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Text field ───────────────────────────────────────────────
function TextField({ label, value, onChange, placeholder, rows = 2, tone = "blue" }) {
  const accent = tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}</span>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="t-body"
        style={{
          resize: "vertical", width: "100%", boxSizing: "border-box",
          padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)",
          background: "rgba(5,8,22,0.6)", color: "var(--white)", fontSize: 14,
          fontFamily: "var(--f-body)", outline: "none", lineHeight: 1.4,
        }}
        onFocus={e => { e.target.style.borderColor = accent; }}
        onBlur={e => { e.target.style.borderColor = "var(--border)"; }} />
    </label>
  );
}

// ─── Control group wrapper ────────────────────────────────────
function ControlGroup({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>;
}

Object.assign(window, {
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup, TextField,
});
