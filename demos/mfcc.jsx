// demos/mfcc.jsx — Mel-Frequency Cepstral Coefficients, the classic speech feature.
//
// The MFCC pipeline, run for real on a synthesized voiced frame:
//   1. power spectrum  (|FFT|² of a windowed frame)
//   2. mel filterbank  (triangular filters spaced on the perceptual mel scale)
//   3. log             (compress dynamic range, like loudness perception)
//   4. DCT             (decorrelate -> a few cepstral coefficients that capture
//                       the spectral ENVELOPE, i.e. the vocal-tract shape)
// The first dozen MFCCs summarize "which vowel/phoneme is this" while discarding
// pitch and fine detail — which is exactly why they dominated speech recognition
// for decades. The synthetic vowels are formant-shaped harmonic combs; the
// filterbank, log, and DCT are computed exactly.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, SegmentedControl, StatReadout, ControlGroup, useIsMobile,
} = window;

const SR = 8000, W = 512;
const CW = 330, CH = 250;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cwr = 1, cwi = 0; for (let k = 0; k < len >> 1; k++) { const a = i + k, b = a + (len >> 1); const vr = re[b] * cwr - im[b] * cwi, vi = re[b] * cwi + im[b] * cwr; re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi; const ncwr = cwr * wr - cwi * wi; cwi = cwr * wi + cwi * wr; cwr = ncwr; } }
  }
}
const hz2mel = f => 2595 * Math.log10(1 + f / 700);
const mel2hz = m => 700 * (Math.pow(10, m / 2595) - 1);

const VOWELS = {
  a: { f0: 130, formants: [[800, 1.0], [1200, 0.7], [2800, 0.25]] },
  i: { f0: 150, formants: [[300, 1.0], [2300, 0.6], [3000, 0.3]] },
  u: { f0: 120, formants: [[325, 1.0], [700, 0.6], [2500, 0.15]] },
};

function MFCCDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [vowel, setVowel] = _useState("a");
  const [nMel, setNMel] = _useState(26);
  const [nMfcc, setNMfcc] = _useState(13);

  const data = _useMemo(() => {
    const v = VOWELS[vowel];
    // synth voiced frame: harmonic comb shaped by formant envelope
    const x = new Float64Array(W);
    const env = h => { const f = h * v.f0; let a = 0.02; for (const [ff, amp] of v.formants) a += amp * Math.exp(-((f - ff) * (f - ff)) / (2 * 160 * 160)); return a; };
    for (let t = 0; t < W; t++) { let s = 0; for (let h = 1; h * v.f0 < SR / 2; h++) s += env(h) * Math.sin(2 * Math.PI * h * v.f0 * t / SR); x[t] = s; }
    // Hann + FFT power
    const re = new Float64Array(W), im = new Float64Array(W);
    for (let i = 0; i < W; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (W - 1)); re[i] = x[i] * w; }
    fft(re, im);
    const half = W >> 1, power = new Float64Array(half);
    for (let k = 0; k < half; k++) power[k] = (re[k] * re[k] + im[k] * im[k]) / W;
    // mel filterbank
    const mlo = hz2mel(0), mhi = hz2mel(SR / 2);
    const centers = []; for (let m = 0; m <= nMel + 1; m++) centers.push(mel2hz(mlo + (mhi - mlo) * m / (nMel + 1)));
    const bin = hz => Math.floor((hz / (SR / 2)) * (half - 1));
    const filters = [], melE = new Float64Array(nMel);
    for (let m = 1; m <= nMel; m++) {
      const lo = bin(centers[m - 1]), ce = bin(centers[m]), hi = bin(centers[m + 1]);
      const tri = new Float64Array(half); let e = 0;
      for (let k = lo; k <= hi; k++) { let w = 0; if (k <= ce && ce > lo) w = (k - lo) / (ce - lo); else if (k > ce && hi > ce) w = (hi - k) / (hi - ce); w = Math.max(0, w); tri[k] = w; e += w * power[k]; }
      filters.push({ lo, ce, hi, tri }); melE[m - 1] = e;
    }
    const logmel = melE.map(e => Math.log(e + 1e-8));
    // DCT-II -> MFCC
    const mfcc = new Float64Array(nMfcc);
    for (let n = 0; n < nMfcc; n++) { let s = 0; for (let m = 0; m < nMel; m++) s += logmel[m] * Math.cos(Math.PI * n * (m + 0.5) / nMel); mfcc[n] = s * Math.sqrt(2 / nMel); }
    return { power, half, filters, centers, logmel, mfcc };
  }, [vowel, nMel, nMfcc]);

  _useEffect(() => {
    const ctx = window.fitCanvas(cvRef.current, CW, CH);
    ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const padL = 26, padR = 8, gw = CW - padL - padR;
    // 1) power spectrum + mel triangles
    const sy0 = 16, sh = 78; const half = data.half;
    let pmax = 1e-9; for (let k = 0; k < half; k++) pmax = Math.max(pmax, data.power[k]);
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("power spectrum + mel filters", padL, sy0 - 4);
    // mel triangles faint
    ctx.strokeStyle = "rgba(96,165,250,0.35)"; ctx.lineWidth = 1;
    for (const f of data.filters) { ctx.beginPath(); ctx.moveTo(padL + (f.lo / half) * gw, sy0 + sh); ctx.lineTo(padL + (f.ce / half) * gw, sy0 + sh - 14); ctx.lineTo(padL + (f.hi / half) * gw, sy0 + sh); ctx.stroke(); }
    // spectrum
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let k = 0; k < half; k++) { const x = padL + (k / half) * gw, y = sy0 + sh - (data.power[k] / pmax) * sh; if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.textAlign = "right"; ctx.fillText((SR / 2000) + "k", CW - padR, sy0 + sh + 8);
    ctx.textAlign = "left"; ctx.fillText("0", padL, sy0 + sh + 8);
    // 2) log-mel bars
    const my0 = 122, mh = 46; const M = data.logmel.length;
    let lo = Infinity, hi = -Infinity; for (const v of data.logmel) { lo = Math.min(lo, v); hi = Math.max(hi, v); } const sp = (hi - lo) || 1;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("log-mel energies (" + M + " filters)", padL, my0 - 4);
    const bw = gw / M;
    for (let m = 0; m < M; m++) { const t = (data.logmel[m] - lo) / sp; const h = t * mh; ctx.fillStyle = "#60a5fa"; ctx.fillRect(padL + m * bw + 0.5, my0 + mh - h, bw - 1, h); }
    // 3) MFCC bars (diverging)
    const cy0 = 188, ch = CH - cy0 - 10, mid = cy0 + ch / 2; const K = data.mfcc.length;
    let amax = 1e-9; for (let n = 1; n < K; n++) amax = Math.max(amax, Math.abs(data.mfcc[n]));
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("MFCC coefficients (DCT) — the feature vector", padL, cy0 - 4);
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(padL, mid); ctx.lineTo(CW - padR, mid); ctx.stroke();
    const cbw = gw / K;
    for (let n = 0; n < K; n++) { const val = n === 0 ? 0 : data.mfcc[n] / amax; const h = (val) * (ch / 2 - 2); ctx.fillStyle = n === 0 ? "#64748b" : (val >= 0 ? "#34d399" : "#fbbf24"); ctx.fillRect(padL + n * cbw + 1, mid - Math.max(h, 0), cbw - 2, Math.abs(h) || 1); if (h < 0) ctx.fillRect(padL + n * cbw + 1, mid, cbw - 2, -h); }
  }, [data]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef}
        style={{ width: CW * (mobile ? 1.05 : 1.45), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>spectrum → mel filters → log → DCT → ~13 numbers that name the vowel</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// VOWEL" tone="violet" value={vowel} onChange={setVowel}
        options={[{ value: "a", label: "/a/ as in 'ah'" }, { value: "i", label: "/i/ as in 'ee'" }, { value: "u", label: "/u/ as in 'oo'" }]}
        help="A synthesized voiced vowel — a harmonic comb (the pitch) shaped by formant resonances (the vocal-tract shape). Switching vowels moves the formants, which reshapes the spectrum and changes the MFCC vector even though the pitch barely moves." />
      <Slider label="// MEL FILTERS" min={12} max={40} step={2} value={nMel} onChange={setNMel} tone="violet"
        help="Number of triangular filters on the mel scale. They're packed densely at low frequencies and sparsely at high ones, mimicking how the ear resolves pitch — and pooling the FFT into a compact, perceptually-weighted summary." />
      <Slider label="// MFCC KEPT" min={6} max={20} step={1} value={nMfcc} onChange={setNMfcc} tone="blue"
        help="How many DCT coefficients to keep. The low ones capture the smooth spectral envelope (the phoneme); higher ones add fine detail. Keeping ~13 throws away pitch and noise while preserving 'which sound is this'." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="C0 (ENERGY)" value={data.mfcc[0].toFixed(1)} accent="var(--dim)" />
        <StatReadout label="C1" value={data.mfcc[1].toFixed(2)} accent="#34d399" />
        <StatReadout label="C2" value={data.mfcc[2].toFixed(2)} accent="#34d399" />
        <StatReadout label="FEATURE DIM" value={nMfcc} accent="var(--violet-lt)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Raw audio has thousands of samples per frame; MFCCs squeeze each frame into
        about a dozen numbers that capture <i>which sound</i> it is. The pipeline is
        four steps, all shown stacked: the <b>power spectrum</b> (top, with the mel
        filters drawn over it), the <b>mel filterbank</b> pooling it into
        perceptually-spaced bands, a <b>log</b> to compress loudness, and a
        <b> DCT</b> that turns the log-mel curve into a handful of cepstral
        coefficients.
      </DemoP>
      <DemoP>
        Switch between vowels and watch the bottom <b>MFCC bars</b> change shape: the
        formants move, so the spectral envelope — and its DCT — is different, which
        is exactly the signal a classifier uses to tell /a/ from /i/. Crucially the
        DCT puts the slow envelope in the first few coefficients and pitch/noise in
        the rest, so keeping ~13 discards the speaker's pitch while preserving the
        phoneme. That compression and decorrelation is why MFCCs were the backbone of
        speech recognition for decades.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        MFCCs are the canonical hand-built audio feature, computed on each frame of a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/spectrogram/`} style={{ color: "#a855f7" }}>spectrogram</a>{" "}
        and built on the <a href={`${window.__DM_BASE || "../../"}visualize/fourier/`} style={{ color: "#a855f7" }}>Fourier
        transform</a>. The mel scale encodes auditory perception; the log mimics
        loudness; the DCT is a cheap cousin of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pca/`} style={{ color: "#a855f7" }}>PCA</a>{" "}
        that decorrelates the bands so a simple model (a GMM-HMM, historically) can
        use them.
      </DemoP>
      <DemoP>
        Modern systems often skip the DCT and feed log-mel spectrograms straight into
        a <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`} style={{ color: "#a855f7" }}>CNN</a>{" "}
        or transformer, letting the network learn its own features — but MFCCs remain
        a fast, compact baseline and a clean illustration of the whole "perceptual
        transform → log → decorrelate" recipe that recurs across signal processing.
        The cepstrum trick (a transform of the log spectrum) also separates pitch
        from envelope, the same idea used in pitch detection.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Mel Filterbank & MFCC"
      subtitle="Turn a sound into a dozen numbers. Spectrum to perceptual mel bands to log to DCT — the feature that named phonemes for decades of speech recognition."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MFCCDemo />);
