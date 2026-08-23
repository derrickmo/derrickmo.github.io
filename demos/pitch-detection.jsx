// demos/pitch-detection.jsx — fundamental-frequency estimation by autocorrelation.
//
// A pitched sound repeats every 1/f0 seconds, so its autocorrelation r(τ) peaks
// when you shift it by exactly one period. Find the first strong peak in the lag
// search band and the pitch is f0 = sample_rate / peak_lag. This is the core of
// classic pitch trackers (and the basis of YIN, which uses a difference function
// instead). Everything here is real: the signal is a harmonic tone (+ optional
// noise), the autocorrelation and the peak pick (with parabolic interpolation)
// are computed exactly, and the result is compared to the true pitch in cents.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, StatReadout, ControlGroup, useIsMobile,
} = window;

const SR = 8000, N = 1024;
const CW = 330, CH = 230;
const MINF = 70, MAXF = 1000;
const MINLAG = Math.floor(SR / MAXF), MAXLAG = Math.floor(SR / MINF);
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function noteName(f) { if (f <= 0) return "—"; const midi = Math.round(69 + 12 * Math.log2(f / 440)); return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1); }

function PitchDetectionDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [f0, setF0] = _useState(220);
  const [harm, setHarm] = _useState(6);
  const [noise, setNoise] = _useState(0.1);

  const data = _useMemo(() => {
    const rand = rng(1234);
    const x = new Float64Array(N);
    for (let t = 0; t < N; t++) {
      let s = 0; for (let h = 1; h <= harm; h++) s += (1 / h) * Math.sin(2 * Math.PI * h * f0 * t / SR);
      x[t] = s + noise * (rand() * 2 - 1) * 2;
    }
    // autocorrelation (normalized)
    const r = new Float64Array(MAXLAG + 1);
    let r0 = 0; for (let t = 0; t < N; t++) r0 += x[t] * x[t];
    for (let lag = 0; lag <= MAXLAG; lag++) { let s = 0; for (let t = 0; t + lag < N; t++) s += x[t] * x[t + lag]; r[lag] = s / (r0 + 1e-9); }
    // first strong local-max peak in the band
    let peak = -1, thresh = 0.45;
    for (let lag = MINLAG + 1; lag < MAXLAG; lag++) { if (r[lag] > thresh && r[lag] > r[lag - 1] && r[lag] >= r[lag + 1]) { peak = lag; break; } }
    if (peak < 0) { let best = MINLAG; for (let lag = MINLAG; lag <= MAXLAG; lag++) if (r[lag] > r[best]) best = lag; peak = best; }
    // parabolic interpolation
    let lagEst = peak;
    if (peak > 0 && peak < MAXLAG) { const a = r[peak - 1], b = r[peak], c = r[peak + 1]; const denom = (a - 2 * b + c); if (Math.abs(denom) > 1e-9) lagEst = peak + 0.5 * (a - c) / denom; }
    const detF = SR / lagEst;
    const cents = 1200 * Math.log2(detF / f0);
    return { x, r, peak, lagEst, detF, cents };
  }, [f0, harm, noise]);

  _useEffect(() => {
    const ctx = window.fitCanvas(cvRef.current, CW, CH);
    ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    // waveform (show ~3 periods)
    const wy0 = 14, wh = 70; const period = SR / f0; const shown = Math.min(N, Math.floor(period * 3.2));
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("waveform", 4, wy0 - 2);
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < CW; i++) { const t = Math.floor(i / CW * shown); const y = wy0 + wh / 2 - data.x[t] * wh / 2 / (harm > 0 ? 2.2 : 1); if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y); }
    ctx.stroke();
    // autocorrelation
    const ay0 = 104, ah = CH - ay0 - 22, ax0 = 24, aw = CW - ax0 - 6;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("autocorrelation r(lag)", ax0, ay0 - 4);
    const X = lag => ax0 + (lag / MAXLAG) * aw, Y = v => ay0 + ah / 2 - v * ah / 2;
    // search band shading
    ctx.fillStyle = "rgba(96,165,250,0.06)"; ctx.fillRect(X(MINLAG), ay0, X(MAXLAG) - X(MINLAG), ah);
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(ax0, Y(0)); ctx.lineTo(ax0 + aw, Y(0)); ctx.stroke();
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let lag = 0; lag <= MAXLAG; lag++) { const x = X(lag), y = Y(data.r[lag]); if (lag === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    // detected peak marker
    const px = X(data.lagEst);
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, ay0); ctx.lineTo(px, ay0 + ah); ctx.stroke();
    ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center"; ctx.fillText("peak lag=" + data.lagEst.toFixed(1), px, ay0 + ah + 10);
    ctx.fillStyle = "#64748b"; ctx.textAlign = "left"; ctx.fillText("0", ax0, ay0 + ah + 10);
    ctx.textAlign = "right"; ctx.fillText(MAXLAG + " (= " + MINF + "Hz)", ax0 + aw, ay0 + ah + 10);
  }, [data, f0, harm]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef}
        style={{ width: CW * (mobile ? 1.05 : 1.45), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 26, color: "#34d399" }}>{data.detF.toFixed(1)} Hz</span>
        <span className="t-mono-s" style={{ color: "var(--white)", fontSize: 14 }}>{noteName(data.detF)}</span>
      </div>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// TRUE PITCH f0" min={80} max={600} step={1} value={f0} onChange={setF0} suffix=" Hz" tone="violet"
        help="Fundamental frequency of the synthesized tone. The autocorrelation peak should land at lag = sample_rate / f0; detected pitch and note name update live." />
      <Slider label="// HARMONICS" min={1} max={16} step={1} value={harm} onChange={setHarm} tone="blue"
        help="How many harmonics the tone has. A pure sine (1) and a rich tone autocorrelate to peaks at the same fundamental period — the strength of autocorrelation is that it locks onto f0 regardless of timbre." />
      <Slider label="// NOISE" min={0} max={1} step={0.02} value={noise} onChange={setNoise}
        help="Additive noise. A little is harmless — the periodic peak still dominates. Push it high and the autocorrelation peak drowns, causing octave errors or a wrong estimate, the classic failure mode pitch trackers fight." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="DETECTED" value={data.detF.toFixed(1) + " Hz"} accent="#34d399" />
        <StatReadout label="NOTE" value={noteName(data.detF)} accent="var(--white)" />
        <StatReadout label="ERROR" value={(data.cents >= 0 ? "+" : "") + data.cents.toFixed(0) + "¢"} accent={Math.abs(data.cents) < 20 ? "#34d399" : Math.abs(data.cents) > 600 ? "#f87171" : "#fbbf24"} />
        <StatReadout label="PEAK LAG" value={data.lagEst.toFixed(1)} accent="var(--violet-lt)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A pitched sound is periodic: it looks the same after one period of
        <i> 1/f0</i> seconds. Slide a copy of the signal against itself and the
        overlap — the <b>autocorrelation</b> r(lag) — spikes whenever the shift
        equals a whole number of periods. The first strong peak inside the search
        band (shaded) marks one period, and the pitch falls right out:
        <b> f0 = sample rate / peak lag</b>.
      </DemoP>
      <DemoP>
        Notice the autocorrelation finds the same fundamental whether the tone is a
        pure sine or packed with <b>harmonics</b> — that timbre-independence is why
        it works on voices and instruments. Then add <b>noise</b>: a little just
        roughens the curve, but past a point the periodic peak no longer dominates
        and the estimate jumps, often by an exact octave (picking 2× or ½ the true
        lag). That octave ambiguity is the central headache of pitch detection, and
        what refinements like YIN's difference function and cumulative-mean
        normalization are built to suppress.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Autocorrelation pitch detection underlies music tuners, voice analysis, and
        the f0 tracking in speech synthesis and singing-voice tools; YIN and pYIN are
        the production-grade descendants. It's the time-domain twin of reading the
        fundamental off a <a href={`${window.__DM_BASE || "../../"}visualize/fourier/`} style={{ color: "#a855f7" }}>Fourier
        spectrum</a> — and indeed autocorrelation is the inverse transform of the
        power spectrum (the Wiener–Khinchin theorem), so the two views are the same
        information seen differently.
      </DemoP>
      <DemoP>
        Autocorrelation is a general tool well beyond audio: it exposes seasonality
        and periodicity in any time series (the ACF behind ARIMA in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/forecasting/`} style={{ color: "#a855f7" }}>forecasting</a>),
        and the "compare a signal to a shifted copy of itself" move is exactly the
        matched-filter / similarity idea. Separating the periodic excitation (pitch)
        from the spectral envelope (timbre) is also the same split that{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/mfcc/`} style={{ color: "#a855f7" }}>MFCCs</a>{" "}
        exploit.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Pitch Detection (Autocorrelation)"
      subtitle="Find the note in a sound. A periodic signal autocorrelates to a peak at its period — f0 = sample rate / peak lag — and noise is what makes it hard."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PitchDetectionDemo />);
