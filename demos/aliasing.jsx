// demos/aliasing.jsx — the Nyquist-Shannon sampling theorem and aliasing.
//
// Sampling a continuous sine of frequency f at rate fs only captures it faithfully
// when fs > 2f (the Nyquist rate). Sample too slowly and the same sample points
// are ALSO consistent with a lower-frequency sine — the alias — which is what a
// reconstruction actually produces. The alias frequency is the "folded"
// frequency: f_alias = |f - fs·round(f/fs)|. All exact: the samples are real
// samples of the true sine, and the green alias is the exact lowest-frequency
// sinusoid passing through them.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 330, CH = 210, DUR = 1; // 1-second window

function AliasingDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [f, setF] = _useState(7);     // signal frequency (Hz)
  const [fs, setFs] = _useState(10);  // sample rate (Hz)

  const info = _useMemo(() => {
    const r = Math.round(f / fs), diff = f - r * fs; // signed folded freq
    const fAlias = Math.abs(diff);
    const aliased = fAlias < f - 1e-9;
    return { diff, fAlias, aliased };
  }, [f, fs]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    // waveform region
    const wy0 = 18, wh = 120, mid = wy0 + wh / 2, px0 = 8, pw = CW - 16;
    const X = t => px0 + (t / DUR) * pw, Y = v => mid - v * wh / 2.3;
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(px0, mid); ctx.lineTo(px0 + pw, mid); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("true signal, samples, and reconstruction", px0, wy0 - 6);
    // true sine
    ctx.strokeStyle = info.aliased ? "rgba(168,85,247,0.45)" : "#a855f7"; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i <= 400; i++) { const t = i / 400 * DUR, y = Y(Math.sin(2 * Math.PI * f * t)); if (i === 0) ctx.moveTo(X(t), y); else ctx.lineTo(X(t), y); }
    ctx.stroke();
    // reconstructed alias sine
    if (info.aliased) {
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 400; i++) { const t = i / 400 * DUR, y = Y(Math.sin(2 * Math.PI * info.diff * t)); if (i === 0) ctx.moveTo(X(t), y); else ctx.lineTo(X(t), y); }
      ctx.stroke();
    }
    // samples
    const nS = Math.floor(fs * DUR);
    for (let k = 0; k <= nS; k++) { const t = k / fs; if (t > DUR + 1e-9) break; const v = Math.sin(2 * Math.PI * f * t); ctx.strokeStyle = "rgba(251,191,36,0.3)"; ctx.beginPath(); ctx.moveTo(X(t), mid); ctx.lineTo(X(t), Y(v)); ctx.stroke(); ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(X(t), Y(v), 3, 0, Math.PI * 2); ctx.fill(); }

    // frequency folding number line
    const fy = CH - 26, fmax = Math.max(f, fs) * 1.1, fx0 = 30, fw = CW - 40;
    const FX = ff => fx0 + (ff / fmax) * fw;
    ctx.strokeStyle = "rgba(148,163,184,0.4)"; ctx.beginPath(); ctx.moveTo(fx0, fy); ctx.lineTo(fx0 + fw, fy); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("frequency (Hz)", fx0, fy - 12);
    const tick = (ff, col, lbl, up) => { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(FX(ff), fy - 6); ctx.lineTo(FX(ff), fy + 6); ctx.stroke(); ctx.fillStyle = col; ctx.textAlign = "center"; ctx.fillText(lbl, FX(ff), up ? fy - 9 : fy + 15); };
    // Nyquist band shade
    ctx.fillStyle = "rgba(52,211,153,0.08)"; ctx.fillRect(FX(0), fy - 6, FX(fs / 2) - FX(0), 12);
    tick(fs / 2, "#cbd5e1", "Nyquist " + (fs / 2).toFixed(1), false);
    tick(fs, "#64748b", "fs " + fs.toFixed(0), false);
    tick(f, "#a855f7", "f " + f.toFixed(0), true);
    if (info.aliased) tick(info.fAlias, "#34d399", "alias " + info.fAlias.toFixed(1), true);
  }, [f, fs, info]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.05 : 1.45), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "true signal (f)", color: "#a855f7" },
        { label: "samples", color: "#fbbf24" },
        { label: "reconstructed alias", color: "#34d399" },
        { label: "Nyquist band", color: "rgba(52,211,153,0.5)" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// SIGNAL FREQUENCY f" min={1} max={40} step={0.5} value={f} onChange={setF} suffix=" Hz" tone="violet"
        help="Frequency of the continuous sine being sampled. Keep it below the Nyquist frequency (fs/2) and sampling is faithful; push it above and the gold samples start tracing a slower green alias instead." />
      <Slider label="// SAMPLE RATE fs" min={4} max={80} step={1} value={fs} onChange={setFs} suffix=" Hz" tone="blue"
        help="How often you sample per second. The Nyquist-Shannon theorem says you must sample faster than 2x the signal frequency. Drop fs below 2f and the reconstruction collapses to a phantom lower frequency." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="NYQUIST (fs/2)" value={(fs / 2).toFixed(1) + " Hz"} accent="#cbd5e1" />
        <StatReadout label="NEED fs >" value={(2 * f).toFixed(0) + " Hz"} accent="var(--violet-lt)" />
        <StatReadout label="ALIAS FREQ" value={info.aliased ? info.fAlias.toFixed(1) + " Hz" : "none"} accent={info.aliased ? "#34d399" : "var(--dim)"} />
        <StatReadout label="VERDICT" value={info.aliased ? "ALIASED" : "FAITHFUL"} accent={info.aliased ? "#f87171" : "#34d399"} />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A continuous sine (violet) is measured only at the gold sample instants.
        While the sample rate stays above twice the signal frequency — the
        <b> Nyquist rate</b> — those dots pin the wave down uniquely and a
        reconstruction recovers it exactly. The shaded band on the frequency line is
        everything you can faithfully represent at this sample rate.
      </DemoP>
      <DemoP>
        Now raise <b>f</b> past the Nyquist frequency (or drop <b>fs</b>). The exact
        same samples are suddenly consistent with a much slower sine — the green
        <b> alias</b> — and that's what any reconstruction produces; the true high
        frequency is gone, masquerading as a low one. On the frequency line the true
        f "folds" back across Nyquist to its alias. This is the wagon-wheel effect in
        film, moiré in images, and the reason every real ADC puts an
        anti-aliasing low-pass filter <i>before</i> the sampler.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Nyquist-Shannon is the bedrock of all digital signal processing: it sets the
        sample rates of audio (44.1 kHz for ~20 kHz hearing), the pixel density that
        avoids moiré, and the bandwidth limits of any{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/spectrogram/`} style={{ color: "#a855f7" }}>spectrogram</a>{" "}
        or <a href={`${window.__DM_BASE || "../../"}visualize/fourier/`} style={{ color: "#a855f7" }}>Fourier</a>{" "}
        analysis — frequencies above fs/2 don't just vanish, they fold back and
        corrupt the ones below.
      </DemoP>
      <DemoP>
        The same "sample below the rate of change and you reconstruct something
        false" trap appears all over ML: strided convolutions and pooling in a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`} style={{ color: "#a855f7" }}>CNN</a>{" "}
        alias high-frequency image detail (why blur-then-downsample helps), and
        coarse time sampling aliases trends in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/forecasting/`} style={{ color: "#a855f7" }}>forecasting</a>.
        The fix is always the same: band-limit before you sample.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Aliasing & the Nyquist Limit"
      subtitle="Sample a sine too slowly and a phantom lower frequency appears. The Nyquist-Shannon theorem says why — and why every digitizer filters before it samples."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AliasingDemo />);
