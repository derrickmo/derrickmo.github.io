// demos/fourier.jsx — Fourier series as rotating epicycles synthesizing a wave.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, StatReadout, ControlGroup,
} = window;

const W = 600, H = 380, CX = 150, CY = H / 2, WAVE0 = 300, SCALE = 80;

function buildTerms(kind, N) {
  const terms = [];
  if (kind === "square") {
    for (let i = 0; i < N; i++) { const k = 2 * i + 1; terms.push({ freq: k, amp: (4 / Math.PI) / k, phase: 0 }); }
  } else if (kind === "sawtooth") {
    for (let k = 1; k <= N; k++) { const c = (2 / Math.PI) / k * (k % 2 === 1 ? 1 : -1); terms.push({ freq: k, amp: Math.abs(c), phase: c < 0 ? Math.PI : 0 }); }
  } else { // triangle
    for (let i = 0; i < N; i++) { const k = 2 * i + 1; const c = (8 / (Math.PI * Math.PI)) * Math.pow(-1, i) / (k * k); terms.push({ freq: k, amp: Math.abs(c), phase: c < 0 ? Math.PI : 0 }); }
  }
  return terms;
}

function FourierDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const termsRef = _useRef(buildTerms("square", 6));
  const waveRef = _useRef([]);
  const timeRef = _useRef(0);
  const rafRef = _useRef(null);
  const spRef = _useRef(6);

  const [kind, setKind] = _useState("square");
  const [n, setN] = _useState(6);
  const [speed, setSpeed] = _useState(6);
  _useEffect(() => { spRef.current = speed; }, [speed]);
  _useEffect(() => { termsRef.current = buildTerms(kind, n); waveRef.current = []; }, [kind, n]);

  function frame() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const t = timeRef.current, terms = termsRef.current;
    // epicycles
    let x = CX, y = CY;
    for (const term of terms) {
      const px0 = x, py0 = y;
      const r = term.amp * SCALE;
      const ang = term.freq * t + term.phase;
      x += r * Math.cos(ang);
      y += r * Math.sin(ang);
      ctx.strokeStyle = "rgba(96,165,250,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px0, py0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(224,231,255,0.6)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(x, y); ctx.stroke();
    }
    // tip
    ctx.fillStyle = "#c084fc"; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    // push wave value
    waveRef.current.unshift(y);
    if (waveRef.current.length > W - WAVE0) waveRef.current.pop();
    // connector
    ctx.strokeStyle = "rgba(192,132,252,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(WAVE0, waveRef.current[0]); ctx.stroke(); ctx.setLineDash([]);
    // wave
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2; ctx.beginPath();
    waveRef.current.forEach((wy, i) => { const wx = WAVE0 + i; i ? ctx.lineTo(wx, wy) : ctx.moveTo(wx, wy); });
    ctx.stroke();
    // axis baseline
    ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(WAVE0, CY); ctx.lineTo(W, CY); ctx.stroke();

    timeRef.current += 0.012 * spRef.current;
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    let alive = true;
    const loop = () => { if (!alive) return; frame(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// TARGET WAVE" value={kind} onChange={setKind}
        options={[{ value: "square", label: "Square" }, { value: "sawtooth", label: "Sawtooth" }, { value: "triangle", label: "Triangle" }]}
        help="The periodic signal to rebuild. Each has a known harmonic recipe — square and sawtooth have sharp jumps that need many terms; triangle converges fastest." />
      <Slider label="// HARMONICS" min={1} max={30} value={n} onChange={setN} tone="violet"
        help="How many sine waves (rotating circles) are summed. More harmonics sharpen the corners and shrink the error, approaching the exact wave." />
      <Slider label="// SPEED" min={1} max={20} value={speed} onChange={setSpeed}
        help="How fast the epicycles rotate. Visual only — it does not affect the reconstruction." />
      <StatReadout label="ROTATING TERMS" value={n} accent="var(--violet-lt)" />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Each circle is one sine wave; their sum traces the curve.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Fourier's idea: <b>any</b> periodic signal is a sum of sine waves at integer
        multiples of a base frequency. Here each rotating circle (an "epicycle") is
        one of those sines — its radius is the amplitude, its speed is the frequency
        — and chaining them tip-to-tail, the final point traces the target wave on
        the right. Add <b>harmonics</b> and watch a few circles turn into a crisp
        square, sawtooth, or triangle.
      </DemoP>
      <DemoP>
        Notice the sharp corners need many high-frequency terms, and that the square
        wave's overshoot at each jump never quite goes away (the Gibbs phenomenon).
        This decomposition is the foundation of signal processing — audio, images,
        compression — and the same frequency-domain thinking shows up in positional
        encodings and spectral methods across modern ML.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The Fourier transform is the backbone of signal processing. Audio codecs like MP3,
        JPEG image compression, the spectrograms that feed speech-recognition models, and
        the convolution theorem that makes filtering fast all rest on the same move you're
        watching: decompose a signal into a sum of frequencies, then keep, drop, or modify
        them.
      </DemoP>
      <DemoP>
        Frequency-domain thinking is very much alive in modern deep learning. The
        sinusoidal <i>positional encodings</i> in transformers are literally Fourier
        features; "Fourier feature" mappings help networks learn high-frequency detail
        (e.g. in NeRF and implicit image models); and FFT-based layers accelerate
        long-convolution sequence models. Even the <b>Gibbs overshoot</b> at each jump is a
        useful caution — finite models approximate sharp discontinuities imperfectly.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Fourier Series"
      subtitle="Watch rotating circles — one per sine wave — sum into a square, sawtooth, or triangle wave."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      repoHref="https://github.com/derrickmo" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<FourierDemo />);
