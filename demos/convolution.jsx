// demos/convolution.jsx — image convolution lab. Procedural source image,
// preset + editable 3×3 kernels, live feature map.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Toggle, DemoButton, StatReadout, ControlGroup,
} = window;

const SW = 180, SH = 140, SCALE = 2;

const PRESETS = {
  Identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  "Box Blur": [1, 1, 1, 1, 1, 1, 1, 1, 1],
  Gaussian: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  Sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  Edge: [0, 1, 0, 1, -4, 1, 0, 1, 0],
  "Sobel X": [-1, 0, 1, -2, 0, 2, -1, 0, 1],
  "Sobel Y": [-1, -2, -1, 0, 0, 0, 1, 2, 1],
  Emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
};

function ConvolutionDemo() {
  const srcRef = _useRef(null);
  const outRef = _useRef(null);
  const grayRef = _useRef(null);

  const [kernel, setKernel] = _useState(PRESETS["Sobel X"].slice());
  const [norm, setNorm] = _useState(false);
  const [preset, setPreset] = _useState("Sobel X");

  function buildSource() {
    const off = document.createElement("canvas"); off.width = SW; off.height = SH;
    const c = off.getContext("2d");
    // background gradient
    const g = c.createLinearGradient(0, 0, SW, SH); g.addColorStop(0, "#222"); g.addColorStop(1, "#888");
    c.fillStyle = g; c.fillRect(0, 0, SW, SH);
    // shapes
    c.fillStyle = "#fff"; c.beginPath(); c.arc(54, 58, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#000"; c.fillRect(96, 28, 56, 42);
    c.strokeStyle = "#fff"; c.lineWidth = 6; c.beginPath(); c.moveTo(20, 120); c.lineTo(160, 86); c.stroke();
    c.fillStyle = "#fff"; c.font = "bold 34px 'Space Grotesk', sans-serif"; c.fillText("ML", 100, 122);
    const img = c.getImageData(0, 0, SW, SH).data;
    const gray = new Float32Array(SW * SH);
    for (let i = 0; i < SW * SH; i++) gray[i] = 0.299 * img[i * 4] + 0.587 * img[i * 4 + 1] + 0.114 * img[i * 4 + 2];
    grayRef.current = gray;
    // render source
    const sc = srcRef.current.getContext("2d");
    const sImg = sc.createImageData(SW, SH);
    for (let i = 0; i < SW * SH; i++) { const v = gray[i]; sImg.data[i * 4] = sImg.data[i * 4 + 1] = sImg.data[i * 4 + 2] = v; sImg.data[i * 4 + 3] = 255; }
    sc.putImageData(sImg, 0, 0);
  }

  function convolve() {
    const gray = grayRef.current; if (!gray) return;
    const out = new Float32Array(SW * SH);
    const k = kernel; let sum = 0; for (const v of k) sum += v;
    const div = (norm && sum !== 0) ? sum : 1;
    const offset = Math.round(sum) === 0 ? 128 : 0;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      let acc = 0, ki = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = Math.min(SW - 1, Math.max(0, x + dx)), yy = Math.min(SH - 1, Math.max(0, y + dy));
        acc += gray[yy * SW + xx] * k[ki++];
      }
      out[y * SW + x] = Math.max(0, Math.min(255, acc / div + offset));
    }
    const oc = outRef.current.getContext("2d");
    const oImg = oc.createImageData(SW, SH);
    for (let i = 0; i < SW * SH; i++) { const v = out[i]; oImg.data[i * 4] = oImg.data[i * 4 + 1] = oImg.data[i * 4 + 2] = v; oImg.data[i * 4 + 3] = 255; }
    oc.putImageData(oImg, 0, 0);
  }

  _useEffect(() => { buildSource(); convolve(); }, []);
  _useEffect(() => { convolve(); }, [kernel, norm]);

  function setCell(i, v) { const k = kernel.slice(); k[i] = v === "" || v === "-" ? 0 : parseFloat(v); setKernel(k); setPreset("Custom"); }
  function applyPreset(name) { setKernel(PRESETS[name].slice()); setPreset(name); }

  const kSum = kernel.reduce((a, b) => a + b, 0);

  const stage = (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
      {[["SOURCE", srcRef], ["FEATURE MAP", outRef]].map(([label, ref]) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}</span>
          <canvas ref={ref} width={SW} height={SH}
            style={{ width: SW * SCALE, height: SH * SCALE, imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)" }} />
        </div>
      ))}
    </div>
  );

  const controls = (
    <ControlGroup>
      <div>
        <div className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 8 }}>// PRESETS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.keys(PRESETS).map(name => (
            <button key={name} onClick={() => applyPreset(name)} className="t-mono-s"
              style={{
                padding: "7px 6px", borderRadius: 4, cursor: "pointer",
                border: `1px solid ${preset === name ? "var(--violet-lt)" : "var(--border)"}`,
                background: preset === name ? "rgba(168,85,247,0.14)" : "transparent",
                color: preset === name ? "var(--violet-lt)" : "var(--muted)", fontSize: 10,
              }}>{name}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 8 }}>// KERNEL (editable)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {kernel.map((v, i) => (
            <input key={i} type="number" value={v} onChange={e => setCell(i, e.target.value)}
              className="t-mono"
              style={{
                width: "100%", boxSizing: "border-box", textAlign: "center", padding: "8px 4px",
                borderRadius: 4, border: "1px solid var(--border)", background: "rgba(5,8,22,0.6)",
                color: "var(--white)", fontSize: 13,
              }} />
          ))}
        </div>
      </div>
      <Toggle label="// NORMALIZE (÷ sum)" checked={norm} onChange={setNorm} tone="violet"
        help="Divide the kernel by the sum of its weights so overall brightness is preserved (good for blurs). Edge/derivative kernels sum to zero and instead get a +128 offset." />
      <StatReadout label="KERNEL SUM" value={kSum} accent={kSum === 0 ? "var(--violet-lt)" : "var(--blue-lt)"} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Sum 0 → edge filter (output offset by 128). Edit any cell to go Custom.</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A convolution slides a small <b>kernel</b> over the image and, at every
        pixel, computes a weighted sum of the neighborhood. That tiny 3×3 grid of
        numbers is the entire operation — change it and you change what the layer
        "sees." <b>Box/Gaussian</b> kernels average neighbors (blur). <b>Sharpen</b>
        amplifies the center against its surround. <b>Sobel</b> and <b>Edge</b>
        kernels sum to zero, so flat regions cancel out and only intensity
        <i> changes</i> survive — that's edge detection.
      </DemoP>
      <DemoP>
        This is exactly what a convolutional neural network does, except a CNN
        <i> learns</i> these kernels by gradient descent instead of you typing them.
        Early layers end up discovering edge and texture detectors that look a lot
        like Sobel; deeper layers compose them into parts and objects. Edit the
        kernel cells and watch the feature map respond in real time.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Convolution is the core operation of the CNN era — image classification, object
        detection, segmentation, medical imaging, and the encoders inside many generative
        and multimodal models all stack learned convolutional filters. The key idea is
        <b> weight sharing</b>: one small kernel scans the entire image, giving
        translation-invariance and dramatically fewer parameters than a fully-connected
        layer.
      </DemoP>
      <DemoP>
        What you type by hand here, a CNN <i>learns</i> by backprop — and early layers
        reliably converge to edge and texture detectors that look a lot like Sobel, while
        deeper layers compose them into parts and whole objects (a hierarchy you can
        literally visualize). The same sliding-window, local-receptive-field idea reappears
        in 1-D audio convolutions, and even a Vision Transformer's patch embedding is just
        a strided convolution.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      title="Convolution Lab"
      subtitle="Slide a 3×3 kernel over an image and see what each filter detects — the core operation inside every CNN."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ConvolutionDemo />);
