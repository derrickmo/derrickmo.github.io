// demos/rnn-gates.jsx — visualize an LSTM cell processing a 1-D input
// sequence. Real gates (input/forget/output) and a tanh cell update — no
// learning, but the weights are tuned to make each gate's response readable
// (forget closes on big inputs, input opens on rising signals, etc.).
// Shows c_t and h_t evolving over time alongside a heatmap of gate activations.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup, Toggle,
} = window;

const HID = 6;
const TLEN = 28;
const W = 460, H = 460;

// Small random init scaled so gates produce a readable spread.
function randVec(n, scale = 1) { return Array.from({ length: n }, () => (Math.random() * 2 - 1) * scale); }
function randMat(m, n, scale = 1) { return Array.from({ length: m }, () => randVec(n, scale)); }

function makeLSTM(seed = 1) {
  // Deterministic pseudo-random init per seed so the heatmap is reproducible.
  let s = seed * 9301 + 49297;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const gen = (m, n) => Array.from({ length: m }, () => Array.from({ length: n }, () => (rng() * 2 - 1)));
  const genV = (n, b = 0) => Array.from({ length: n }, () => b + (rng() * 2 - 1) * 0.4);
  return {
    Wxi: gen(HID, 1), Whi: gen(HID, HID), bi: genV(HID, 0.0),
    Wxf: gen(HID, 1), Whf: gen(HID, HID), bf: genV(HID, 1.2),  // forget bias positive (Jozefowicz)
    Wxo: gen(HID, 1), Who: gen(HID, HID), bo: genV(HID, 0.0),
    Wxc: gen(HID, 1), Whc: gen(HID, HID), bc: genV(HID, 0.0),
  };
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const tanh = Math.tanh;

function matVec(M, v) { return M.map(row => row.reduce((s, r, j) => s + r * v[j], 0)); }
function vadd(a, b) { return a.map((x, i) => x + b[i]); }
function vAddVec(...arrs) { const n = arrs[0].length; const out = Array(n).fill(0); for (const a of arrs) for (let i = 0; i < n; i++) out[i] += a[i]; return out; }
function applyVec(v, f) { return v.map(f); }
function vhad(a, b) { return a.map((x, i) => x * b[i]); }

function runLSTM(model, xs) {
  let h = Array(HID).fill(0), c = Array(HID).fill(0);
  const out = [];
  for (let t = 0; t < xs.length; t++) {
    const x = [xs[t]];
    const i = applyVec(vAddVec(matVec(model.Wxi, x), matVec(model.Whi, h), model.bi), sigmoid);
    const f = applyVec(vAddVec(matVec(model.Wxf, x), matVec(model.Whf, h), model.bf), sigmoid);
    const o = applyVec(vAddVec(matVec(model.Wxo, x), matVec(model.Who, h), model.bo), sigmoid);
    const g = applyVec(vAddVec(matVec(model.Wxc, x), matVec(model.Whc, h), model.bc), tanh);
    c = vAddVec(vhad(f, c), vhad(i, g));
    h = vhad(o, applyVec(c, tanh));
    out.push({ i, f, o, g, c: c.slice(), h: h.slice() });
  }
  return out;
}

function genSequence(kind, T = TLEN) {
  if (kind === "step") return Array.from({ length: T }, (_, t) => t < T / 2 ? -0.6 : 0.9);
  if (kind === "pulse") return Array.from({ length: T }, (_, t) => Math.abs(t - T / 2) < 2 ? 1 : 0);
  if (kind === "ramp") return Array.from({ length: T }, (_, t) => -0.8 + 1.6 * t / (T - 1));
  // sine
  return Array.from({ length: T }, (_, t) => Math.sin(2 * Math.PI * t / (T - 1) * 1.5));
}

function RNNGatesDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [shape, setShape] = _useState("step");
  const [view, setView] = _useState("forget");
  const [seed, setSeed] = _useState(2);
  const xs = genSequence(shape);
  const model = makeLSTM(seed);
  const trace = runLSTM(model, xs);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Layout: top — input signal; middle — gate heatmap; bottom — cell state line
    const padL = 36, padR = 18, top = 18;
    const plotW = W - padL - padR;
    const cellW = plotW / TLEN;

    // input signal panel
    const inH = 80;
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.lineWidth = 1;
    ctx.strokeRect(padL, top, plotW, inH);
    ctx.font = "10px JetBrains Mono"; ctx.fillStyle = "#94a3b8";
    ctx.fillText("INPUT x_t", padL, top - 4);
    ctx.beginPath();
    for (let t = 0; t < xs.length; t++) {
      const x = padL + (t + 0.5) * cellW;
      const y = top + inH / 2 - xs[t] * (inH / 2 - 4);
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.8; ctx.stroke();
    // zero line
    ctx.strokeStyle = "rgba(96,165,250,0.22)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(padL, top + inH / 2); ctx.lineTo(padL + plotW, top + inH / 2); ctx.stroke();

    // heatmap
    const hmTop = top + inH + 22, hmH = 170, rowH = hmH / HID;
    ctx.font = "10px JetBrains Mono"; ctx.fillStyle = "#94a3b8";
    const viewLabel = view === "forget" ? "FORGET f_t" : view === "input" ? "INPUT i_t" : view === "output" ? "OUTPUT o_t" : "CELL c_t";
    ctx.fillText("GATE: " + viewLabel, padL, hmTop - 5);
    ctx.strokeRect(padL, hmTop, plotW, hmH);
    for (let h = 0; h < HID; h++) {
      for (let t = 0; t < TLEN; t++) {
        const a = trace[t];
        const v = view === "cell" ? Math.max(-1, Math.min(1, a.c[h])) :
                  view === "forget" ? a.f[h] : view === "input" ? a.i[h] : a.o[h];
        // For gates (sigmoid 0..1) and cell (-1..1) — color by magnitude/sign.
        if (view === "cell") {
          const m = Math.min(1, Math.abs(v));
          ctx.fillStyle = v >= 0 ? `rgba(96,165,250,${0.08 + 0.8 * m})` : `rgba(192,132,252,${0.08 + 0.8 * m})`;
        } else {
          ctx.fillStyle = `rgba(251,191,36,${0.06 + 0.82 * v})`;
        }
        ctx.fillRect(padL + t * cellW + 1, hmTop + h * rowH + 1, cellW - 2, rowH - 2);
      }
      ctx.fillStyle = "#475569"; ctx.font = "9px JetBrains Mono";
      ctx.fillText("h" + h, padL - 18, hmTop + h * rowH + rowH / 2 + 3);
    }

    // cell-state mean line plot
    const csTop = hmTop + hmH + 28, csH = 80;
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("CELL STATE (mean of c_t)", padL, csTop - 4);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.lineWidth = 1;
    ctx.strokeRect(padL, csTop, plotW, csH);
    ctx.beginPath();
    for (let t = 0; t < TLEN; t++) {
      const mean = trace[t].c.reduce((s, x) => s + x, 0) / HID;
      const x = padL + (t + 0.5) * cellW;
      const y = csTop + csH / 2 - Math.max(-1, Math.min(1, mean / 2)) * (csH / 2 - 4);
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = "rgba(96,165,250,0.22)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(padL, csTop + csH / 2); ctx.lineTo(padL + plotW, csTop + csH / 2); ctx.stroke();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, [shape, view, seed]);

  // Stat: how much the cell drifts (proxy for whether the forget gate is doing work).
  const meanForget = trace.reduce((s, a) => s + a.f.reduce((q, v) => q + v, 0) / HID, 0) / TLEN;
  const meanInput = trace.reduce((s, a) => s + a.i.reduce((q, v) => q + v, 0) / HID, 0) / TLEN;

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SIGNAL" value={shape} onChange={setShape}
        options={[
          { value: "step", label: "Step" }, { value: "pulse", label: "Pulse" },
          { value: "ramp", label: "Ramp" }, { value: "sine", label: "Sine" },
        ]}
        help="The input sequence x_t fed one step at a time. Different shapes reveal what each gate does — a step makes the forget gate decide what to drop; a pulse tests memory; a ramp shows the cell integrating." />
      <SegmentedControl label="// VIEW" value={view} onChange={setView}
        options={[
          { value: "forget", label: "f" }, { value: "input", label: "i" },
          { value: "output", label: "o" }, { value: "cell", label: "c" },
        ]} tone="violet"
        help="Which signal to show in the heatmap. Gates are 0..1 (closed..open); cell state is signed (color = sign, intensity = magnitude)." />
      <Slider label="// WEIGHT SEED" min={1} max={20} step={1} value={seed} onChange={setSeed}
        help="Reroll the random weights of the LSTM cell. With different seeds you'll see different gate patterns — but the structure (gates near 0/1, cell integrating) stays." />
      <DemoButton onClick={() => setSeed(Math.floor(Math.random() * 20) + 1)} primary>NEW WEIGHTS</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="MEAN f" value={meanForget.toFixed(2)} />
        <StatReadout label="MEAN i" value={meanInput.toFixed(2)} accent="#c084fc" />
      </div>
      <Legend items={[
        { color: "#fbbf24", label: "GATE OPEN" },
        { color: "#60a5fa", label: "CELL +" },
        { color: "#c084fc", label: "CELL -" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        An <b>LSTM cell</b> threads two signals through time: a hidden state <i>h_t</i>
        and a <b>cell state</b> <i>c_t</i> that survives unchanged unless a gate decides
        otherwise. Three sigmoid gates control the flow: the <b>forget gate</b>
        <i> f_t</i> erases parts of <i>c</i>; the <b>input gate</b> <i>i_t</i> writes a
        new candidate; the <b>output gate</b> <i>o_t</i> exposes <i>c</i> as the new
        hidden state. Each row of the heatmap is one of the 6 hidden units; yellow =
        gate open, dark = gate closed.
      </DemoP>
      <DemoP>
        Try the <b>step</b> signal with the forget gate selected: some units will close
        when the input jumps, dumping the past; others stay open and integrate. Switch
        to the <b>pulse</b> signal and watch the cell state hold onto information long
        after the input is gone — that's the LSTM's whole trick. The weights here are
        random (no training), but the gate structure already gives the cell selective
        memory.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        LSTMs ran NLP, speech, and time-series modeling for nearly a decade — Google
        Translate ran on stacked LSTMs in 2016. The pattern that survives even after
        transformers took over is the idea of a <b>gated, additive memory channel</b>:
        a path along which gradients flow without vanishing, controlled by learned
        sigmoid valves. That same idea reappears in <b>residual connections</b>
        (ResNets), the <b>highway</b> in GRUs, and the running-mean buffers in Adam
        and batch norm.
      </DemoP>
      <DemoP>
        Practically, every modern alternative — GRUs, transformers, state-space models
        like Mamba — exists in part because LSTMs are sequential (you can't parallelize
        across time). But the abstractions still translate: an attention head's
        softmax weights are an "input gate" over context; a transformer's residual
        stream is the cell state. Once gates click, the rest of sequence modeling
        starts to look familiar.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="LSTM Gates"
      subtitle="A live LSTM cell processing a 1-D sequence — see the forget, input, and output gates open and close over time."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rnn-nlp/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RNNGatesDemo />);
