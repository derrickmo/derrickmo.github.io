// demos/receptive-field.jsx — how far back one output unit can see, and how much of
// that reach actually matters. The closed-form recurrence is checked against a
// path-counting pass computed here, so the two numbers on screen are independent.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 470, H = 470, GRID = 65;    // odd, so there is a true centre pixel

// jump_out = jump_in * s ; rf_out = rf_in + (effective_k - 1) * jump_in
// with effective_k = d*(k-1)+1. Dilation enlarges the kernel's REACH without adding
// a single weight, which is the whole point of it.
function rfChain(layers) {
  let rf = 1, jump = 1;
  const rows = [];
  for (const L of layers) {
    const ek = L.d * (L.k - 1) + 1;
    rf = rf + (ek - 1) * jump;
    jump = jump * L.s;
    rows.push({ ...L, ek, rf, jump });
  }
  return rows;
}

// INFLUENCE, not reach: how many distinct paths connect each input position to the
// single output unit. Uniform kernels convolved repeatedly give a binomial, which is
// why the middle of a receptive field counts for so much more than its edge.
function influence(layers, span) {
  let cur = new Float64Array(span);
  cur[(span - 1) / 2] = 1;                       // one output unit
  for (let li = layers.length - 1; li >= 0; li--) {
    const L = layers[li];
    const next = new Float64Array(span);
    for (let o = 0; o < span; o++) {
      const v = cur[o];
      if (!v) continue;
      const centre = (span - 1) / 2;
      for (let t = 0; t < L.k; t++) {
        // position of tap t, relative to the unit's own centre, in input units
        const off = (o - centre) * L.s + (t - (L.k - 1) / 2) * L.d;
        const i = Math.round(centre + off);
        if (i >= 0 && i < span) next[i] += v / L.k;
      }
    }
    cur = next;
  }
  return cur;
}

const PRESETS = {
  vgg: [{ k: 3, s: 1, d: 1 }, { k: 3, s: 1, d: 1 }, { k: 2, s: 2, d: 1 }, { k: 3, s: 1, d: 1 }, { k: 3, s: 1, d: 1 }],
  resnet: [{ k: 7, s: 2, d: 1 }, { k: 3, s: 2, d: 1 }, { k: 3, s: 1, d: 1 }, { k: 3, s: 1, d: 1 }],
  dilated: [{ k: 3, s: 1, d: 1 }, { k: 3, s: 1, d: 2 }, { k: 3, s: 1, d: 4 }, { k: 3, s: 1, d: 8 }],
  plain: [{ k: 3, s: 1, d: 1 }, { k: 3, s: 1, d: 1 }, { k: 3, s: 1, d: 1 }, { k: 3, s: 1, d: 1 }],
};

function RFDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [preset, setPreset] = _useState("plain");
  const [depth, setDepth] = _useState(4);
  const [kernel, setKernel] = _useState(3);
  const [stride, setStride] = _useState(1);
  const [dilation, setDilation] = _useState(1);
  const [mode, setMode] = _useState("custom");
  const [stats, setStats] = _useState({ rf: 1, jump: 1, params: 0, eff: 0, rows: [] });

  const layers = mode === "preset"
    ? PRESETS[preset]
    : Array.from({ length: depth }, () => ({ k: kernel, s: stride, d: dilation }));

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const rows = rfChain(layers);
    const last = rows[rows.length - 1] || { rf: 1, jump: 1 };
    const inf1 = influence(layers, GRID);

    // Top: the input plane, with influence as brightness and the theoretical RF boxed.
    const top = 300, cell = top / GRID;
    const peak = Math.max(...inf1);
    for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
      const v = (inf1[gx] * inf1[gy]) / (peak * peak);       // separable, so outer product
      if (v > 1e-6) {
        ctx.fillStyle = `rgba(96,165,250,${Math.min(1, Math.pow(v, 0.45))})`;
        ctx.fillRect(gx * cell, gy * cell, cell + 0.6, cell + 0.6);
      }
    }
    // theoretical receptive field: the full square the unit CAN see
    const half = (last.rf - 1) / 2, c = (GRID - 1) / 2;
    const x0 = (c - half) * cell, size = last.rf * cell;
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.strokeRect(x0, x0, size, size);
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, top, top);
    ctx.fillStyle = "#e6edfb"; ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText(`INPUT PLANE ${GRID}x${GRID}px`, 6, top + 16);
    ctx.fillStyle = "#c084fc";
    ctx.fillText(`dashed = theoretical RF ${last.rf}x${last.rf}`, 6, top + 32);
    ctx.fillStyle = "#60a5fa";
    ctx.fillText(`brightness = actual influence`, 6, top + 48);

    // Bottom: per-layer growth, as bars.
    const bx = 8, by = top + 62, bw = W - 16, maxRF = Math.max(last.rf, 3);
    rows.forEach((r, i) => {
      const y = by + i * 20;
      if (y > H - 14) return;
      const w = Math.max(2, (r.rf / maxRF) * (bw - 168));
      ctx.fillStyle = "rgba(96,165,250,0.5)";
      ctx.fillRect(bx + 150, y, w, 13);
      ctx.fillStyle = "var(--muted)"; ctx.fillStyle = "#8fa3c8";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(`L${i + 1}  k${r.k} s${r.s} d${r.d}`, bx, y + 10);
      ctx.fillStyle = "#e6edfb";
      ctx.fillText(`rf ${r.rf}`, bx + 100, y + 10);
    });

    // The region carrying most of the influence — Luo et al.'s effective RF.
    let acc = 0, effHalf = 0;
    const total = inf1.reduce((s, v) => s + v, 0);
    for (let r = 0; r <= (GRID - 1) / 2; r++) {
      acc = 0;
      for (let i = c - r; i <= c + r; i++) acc += inf1[i] || 0;
      if (acc >= 0.85 * total) { effHalf = r; break; }
    }
    const params = layers.reduce((s, L) => s + L.k * L.k, 0);
    setStats({ rf: last.rf, jump: last.jump, params, eff: effHalf * 2 + 1, rows });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [preset, depth, kernel, stride, dilation, mode]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// STACK" value={mode} onChange={setMode}
        options={[{ value: "custom", label: "Build one" }, { value: "preset", label: "Real stacks" }]}
        help="Build a uniform stack with the sliders, or load the first few layers of an architecture you have actually met." />
      {mode === "preset" ? (
        <SegmentedControl label="// ARCHITECTURE" value={preset} onChange={setPreset}
          options={[{ value: "plain", label: "4x 3x3" }, { value: "vgg", label: "VGG" }, { value: "resnet", label: "ResNet" }, { value: "dilated", label: "Dilated" }]}
          help="Plain and VGG grow the field slowly and additively. ResNet's 7x7 stride-2 stem plus a stride-2 pool buys a large field in two layers - that is what the stem is FOR. Dilated doubles the rate each layer at identical parameter count." />
      ) : (
        <>
          <Slider label="// DEPTH" min={1} max={8} value={depth} onChange={setDepth}
            help="Number of identical layers. At stride 1 the field grows ADDITIVELY with depth - each layer adds (k-1), which is slow." />
          <Slider label="// KERNEL" min={1} max={7} step={2} value={kernel} onChange={setKernel}
            help="Kernel width. Cost grows as k squared per layer while reach grows as k-1, which is why two 3x3s replaced one 5x5 everywhere." />
          <Slider label="// STRIDE" min={1} max={3} value={stride} onChange={setStride} tone="violet"
            help="Downsampling factor. This is the one that compounds: every later layer's steps are measured in units of all the strides before it, so the field grows MULTIPLICATIVELY. Compare depth 5 at stride 1 and stride 2." />
          <Slider label="// DILATION" min={1} max={8} value={dilation} onChange={setDilation}
            help="Spacing between kernel taps. Enlarges the reach without adding a single parameter or losing resolution - the reason dilated convolutions exist for segmentation." />
        </>
      )}
      <StatReadout label="THEORETICAL RF" value={`${stats.rf} x ${stats.rf} px`} accent="#c084fc" />
      <StatReadout label="EFFECTIVE RF (85% of influence)" value={`${stats.eff} x ${stats.eff} px`} accent="#60a5fa" />
      <StatReadout label="JUMP (EFFECTIVE STRIDE)" value={`${stats.jump} px`} accent="#34d399" />
      <StatReadout label="KERNEL PARAMS / CHANNEL PAIR" value={String(stats.params)} accent="#fbbf24" />
      <Legend items={[{ color: "#c084fc", label: "THEORETICAL" }, { color: "#60a5fa", label: "INFLUENCE" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        The dashed box is what the unit can see. The glow is what it actually uses.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The receptive field of an output unit is the patch of input that can influence it
        at all. It matters because a unit cannot represent anything larger than its own
        field: if you are segmenting an object 200 pixels across and your features see 60,
        no amount of training fixes that. The recurrence is short —
        each layer adds <b>(effective kernel − 1) × jump</b> to the field and multiplies
        the jump by its stride — and the arithmetic is worth having in your head.
      </DemoP>
      <DemoP>
        The three levers are not equivalent. <b>Depth</b> at stride 1 grows the field
        additively and slowly: five 3×3 layers reach only 11 pixels. <b>Stride</b>
        compounds — the same five layers at stride 2 reach 63, because every later step
        is measured in units of all the strides before it. <b>Dilation</b> enlarges the
        reach without adding a single parameter. Click through the real stacks and compare
        the last two: the dilated one reaches <b>31 px using 36 weights at full
        resolution</b>, while the ResNet stem reaches only <b>27 px using 76 weights and a
        jump of 4</b> — a larger field, half the parameters, and no resolution thrown away.
        That is the entire argument for atrous convolutions in segmentation, in two clicks.
      </DemoP>
      <DemoP>
        Now compare the dashed box with the glow inside it. The theoretical field is the
        region a unit <i>can</i> see; the brightness is how much each pixel actually
        influences it, computed here by counting paths. Repeatedly convolving uniform
        kernels gives a binomial, so influence falls off from the centre and the
        <b> effective</b> field — the region carrying most of the weight — is markedly
        smaller than the number you would quote. That gap is the practical result: your
        network probably sees less than its architecture claims.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This arithmetic is the design constraint behind a lot of architecture history.
        VGG's stack of 3×3s replaced larger kernels because two 3×3s reach as far as one
        5×5 with fewer parameters and an extra nonlinearity. ResNet's 7×7 stride-2 stem
        exists to buy a large field immediately, before the expensive layers. Dilated
        convolutions and atrous spatial pyramid pooling exist because segmentation needs
        a large field <i>and</i> full resolution, and downsampling gives up the second.
      </DemoP>
      <DemoP>
        It is also the cleanest way to see what attention changed. A transformer layer's
        receptive field is the whole sequence at layer one — every token attends to every
        other — so the depth-versus-reach trade this demo is about simply does not apply,
        and you pay for it in the quadratic cost instead. When people say attention has a
        "global receptive field", this is the thing it is global compared to.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Receptive Field"
      subtitle="How far back one unit can see — and how much less of that it actually uses."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/cnn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RFDemo />);
