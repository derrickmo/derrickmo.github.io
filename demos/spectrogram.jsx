// demos/spectrogram.jsx — the Short-Time Fourier Transform as a spectrogram.
//
// A single Fourier transform tells you which frequencies are in a signal but not
// WHEN. The STFT slides a window along the signal and FFTs each chunk, producing
// a time-frequency image — the spectrogram. The window length is a hard tradeoff:
// short windows localize events in time but smear frequency; long windows resolve
// frequency sharply but blur time (the uncertainty principle for signals).
// Everything here is a real Hann-windowed radix-2 FFT computed in JS.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, SegmentedControl, StatReadout, ControlGroup, useIsMobile,
} = window;

const SR = 8000;       // sample rate (Hz)
const T = 4096;        // total samples (~0.5 s)
const CW = 330, CH = 250;

// in-place iterative radix-2 FFT
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k, b = a + (len >> 1);
        const vr = re[b] * cwr - im[b] * cwi, vi = re[b] * cwi + im[b] * cwr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
        const ncwr = cwr * wr - cwi * wi; cwi = cwr * wi + cwi * wr; cwr = ncwr;
      }
    }
  }
}

function genSignal(kind) {
  const x = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    const tt = t / SR;
    if (kind === "chirp") { const f0 = 200, f1 = 3200, dur = T / SR; const ph = 2 * Math.PI * (f0 * tt + 0.5 * (f1 - f0) / dur * tt * tt); x[t] = Math.sin(ph); }
    else if (kind === "tones") { x[t] = Math.sin(2 * Math.PI * 500 * tt) + 0.8 * Math.sin(2 * Math.PI * 1800 * tt); }
    else if (kind === "harmonics") { let s = 0; for (let k = 1; k <= 5; k++) s += Math.sin(2 * Math.PI * 300 * k * tt) / k; x[t] = s; }
    else { // burst: a short tone in the middle + a steady low tone
      x[t] = 0.5 * Math.sin(2 * Math.PI * 400 * tt);
      if (t > T * 0.45 && t < T * 0.55) x[t] += Math.sin(2 * Math.PI * 2400 * tt);
    }
  }
  return x;
}

function SpectrogramDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [kind, setKind] = _useState("chirp");
  const [winPow, setWinPow] = _useState(8); // window = 2^winPow

  const spec = _useMemo(() => {
    const x = genSignal(kind);
    const W = 1 << winPow, H = Math.max(1, W >> 2);
    const win = new Float64Array(W);
    for (let i = 0; i < W; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (W - 1)); // Hann
    const frames = [];
    for (let start = 0; start + W <= T; start += H) {
      const re = new Float64Array(W), im = new Float64Array(W);
      for (let i = 0; i < W; i++) re[i] = x[start + i] * win[i];
      fft(re, im);
      const mags = new Float64Array(W >> 1);
      for (let k = 0; k < (W >> 1); k++) mags[k] = 20 * Math.log10(Math.hypot(re[k], im[k]) + 1e-6);
      frames.push(mags);
    }
    let lo = Infinity, hi = -Infinity;
    for (const f of frames) for (const v of f) { if (v < lo) lo = v; if (v > hi) hi = v; }
    return { x, frames, W, H, bins: W >> 1, lo, hi };
  }, [kind, winPow]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    // waveform strip
    const wy0 = 6, wh = 34, x = spec.x;
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < CW; i++) { const s = x[Math.floor(i / CW * T)]; const y = wy0 + wh / 2 - s * wh / 2.2; if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y); }
    ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("waveform", 2, wy0 + 8);
    // spectrogram heatmap
    const gy0 = 50, gh = CH - gy0 - 18, gx0 = 26, gw = CW - gx0 - 4;
    const nf = spec.frames.length, span = (spec.hi - spec.lo) || 1;
    const im = ctx.createImageData(gw, gh), d = im.data;
    for (let py = 0; py < gh; py++) {
      const binF = (1 - py / gh) * (spec.bins - 1); const b = Math.min(spec.bins - 1, Math.floor(binF));
      for (let px = 0; px < gw; px++) {
        const fi = Math.min(nf - 1, Math.floor(px / gw * nf));
        const t = Math.max(0, Math.min(1, (spec.frames[fi][b] - spec.lo) / span));
        const r = Math.round(20 + 168 * t), g = Math.round(10 + 60 * t), bl = Math.round(40 + 207 * t);
        const o = (py * gw + px) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = bl; d[o + 3] = 255;
      }
    }
    ctx.putImageData(im, gx0, gy0);
    // axes
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "right";
    ctx.fillText((SR / 2000).toFixed(0) + "k", gx0 - 3, gy0 + 6); ctx.fillText("0", gx0 - 3, gy0 + gh);
    ctx.save(); ctx.translate(8, gy0 + gh / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("frequency (Hz)", 0, 0); ctx.restore();
    ctx.textAlign = "center"; ctx.fillText("time ->", gx0 + gw / 2, CH - 4);
  }, [spec]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.05 : 1.45), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>brighter = more energy at that time and frequency</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SIGNAL" tone="violet" value={kind} onChange={setKind}
        options={[{ value: "chirp", label: "Chirp" }, { value: "tones", label: "Two tones" }, { value: "harmonics", label: "Harmonics" }, { value: "burst", label: "Burst" }]}
        help="The test signal. Chirp sweeps frequency (a diagonal line); two tones are flat horizontal lines; harmonics stack at integer multiples; burst hides a brief high tone inside a steady low one — the case where time resolution matters." />
      <Slider label="// WINDOW LENGTH" min={6} max={10} step={1} value={winPow} onChange={setWinPow} tone="violet"
        suffix={" = " + (1 << winPow) + " samp"}
        help="STFT window size (2^n samples). Short windows pin down WHEN things happen but smear frequency into horizontal blur; long windows give crisp frequency lines but blur events in time. This is the time-frequency uncertainty tradeoff." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="WINDOW" value={(1 << winPow)} accent="var(--violet-lt)" />
        <StatReadout label="FREQ RES" value={(SR / (1 << winPow)).toFixed(0) + " Hz"} accent="#60a5fa" />
        <StatReadout label="TIME RES" value={((1 << winPow) / SR * 1000).toFixed(0) + " ms"} accent="#34d399" />
        <StatReadout label="FRAMES" value={spec.frames.length} accent="var(--dim)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A plain Fourier transform of a whole clip tells you which frequencies are
        present but throws away <i>when</i> each one occurred. The <b>STFT</b> fixes
        that by chopping the signal into overlapping windows and Fourier-transforming
        each one, stacking the results into a time-frequency image. A rising chirp
        becomes a diagonal streak; steady tones are horizontal lines; the brief
        high-frequency burst shows up as a short bright patch.
      </DemoP>
      <DemoP>
        Now drag the <b>window length</b> and watch the tradeoff that defines all of
        signal processing. A <b>short</b> window resolves time sharply — the burst is
        a crisp vertical sliver — but each frequency smears into a fat horizontal
        band. A <b>long</b> window snaps the frequency lines razor-thin but the burst
        smears across time. You cannot have both: the time-frequency uncertainty
        principle. The frequency- and time-resolution readouts move in opposite
        directions as proof.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The spectrogram is the workhorse representation of audio and speech: it's the
        input to most speech recognizers and audio classifiers (usually after the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/mfcc/`} style={{ color: "#a855f7" }}>mel/MFCC</a>{" "}
        stage), and it's literally how a neural audio model "sees" sound. It builds
        directly on the <a href={`${window.__DM_BASE || "../../"}visualize/fourier/`} style={{ color: "#a855f7" }}>Fourier
        transform</a> — the STFT is just the DFT applied to windowed slices.
      </DemoP>
      <DemoP>
        The same time-frequency tradeoff drives the rest of the field: wavelets vary
        the window length with frequency to escape the fixed compromise, and the
        Heisenberg-style limit here is the exact analog of position/momentum
        uncertainty in physics. Treating a spectrogram as an image is also what lets
        a <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`} style={{ color: "#a855f7" }}>CNN</a>{" "}
        do audio — the bridge from signals to deep learning.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Spectrogram (STFT)"
      subtitle="See frequency change over time. The STFT windows a signal and Fourier-transforms each chunk — and the window length forces a tradeoff between time and frequency resolution."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SpectrogramDemo />);
