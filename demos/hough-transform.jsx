// demos/hough-transform.jsx — the Hough line transform. Edge points each vote
// for every line that could pass through them; lines show up as bright peaks in
// the (rho, theta) accumulator. Peaks above the vote threshold are drawn back on
// the image. Real accumulator + local-max peak finding.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, Toggle, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const W = 170, H = 170, SCALE = 2;
const T_BINS = 180;                       // theta: 0..180 deg
const D = Math.ceil(Math.hypot(W, H));    // max |rho|
const R_BINS = 2 * D + 1;                 // rho: -D..D

// deterministic RNG so the noise pattern is stable as the slider changes density
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// the true scene: a triangle (3 lines) + one stray line. Returns edge points.
const SEGMENTS = [
  [[30, 135], [140, 135]],   // base
  [[30, 135], [85, 35]],     // left side
  [[140, 135], [85, 35]],    // right side
  [[20, 40], [150, 95]],     // stray diagonal
];

function buildEdges(noiseCount) {
  const pts = [];
  for (const [[x0, y0], [x1, y1]] of SEGMENTS) {
    const steps = Math.round(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      pts.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)]);
    }
  }
  const rng = mulberry(7);
  for (let i = 0; i < noiseCount; i++)
    pts.push([Math.floor(rng() * W), Math.floor(rng() * H)]);
  return pts;
}

function HoughTransformDemo() {
  const srcRef = _useRef(null);
  const accRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [threshold, setThreshold] = _useState(70);
  const [noise, setNoise] = _useState(40);
  const [overlay, setOverlay] = _useState(true);

  // precompute the cos/sin table once
  const trig = _useMemo(() => {
    const cos = new Float32Array(T_BINS), sin = new Float32Array(T_BINS);
    for (let t = 0; t < T_BINS; t++) { const a = t * Math.PI / T_BINS; cos[t] = Math.cos(a); sin[t] = Math.sin(a); }
    return { cos, sin };
  }, []);

  const { edges, acc, maxVotes, peaks } = _useMemo(() => {
    const edges = buildEdges(noise);
    const acc = new Uint16Array(R_BINS * T_BINS);
    const { cos, sin } = trig;
    let maxVotes = 0;
    for (const [x, y] of edges) {
      for (let t = 0; t < T_BINS; t++) {
        const rho = Math.round(x * cos[t] + y * sin[t]) + D;   // shift into 0..2D
        const idx = rho * T_BINS + t;
        const v = ++acc[idx];
        if (v > maxVotes) maxVotes = v;
      }
    }
    // peak finding: above threshold AND a local max in a 5x5 Hough window
    const peaks = [];
    const win = 2;
    for (let r = 0; r < R_BINS; r++) for (let t = 0; t < T_BINS; t++) {
      const v = acc[r * T_BINS + t];
      if (v < threshold) continue;
      let isMax = true;
      for (let dr = -win; dr <= win && isMax; dr++) for (let dt = -win; dt <= win; dt++) {
        const rr = r + dr, tt = t + dt;
        if (rr < 0 || rr >= R_BINS || tt < 0 || tt >= T_BINS) continue;
        if (acc[rr * T_BINS + tt] > v) { isMax = false; break; }
      }
      if (isMax) peaks.push({ r, t, v });
    }
    peaks.sort((a, b) => b.v - a.v);
    return { edges, acc, maxVotes, peaks };
  }, [noise, threshold, trig]);

  // draw the source: edge points + (optionally) detected lines
  _useEffect(() => {
    const c = srcRef.current.getContext("2d");
    c.fillStyle = "#05060f"; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(200,210,230,0.85)";
    for (const [x, y] of edges) c.fillRect(x, y, 1, 1);
    if (overlay) {
      c.lineWidth = 1; c.strokeStyle = "rgba(168,85,247,0.95)";
      const { cos, sin } = trig;
      for (const p of peaks) {
        const theta = p.t * Math.PI / T_BINS, rho = p.r - D;
        const ct = cos[p.t], st = sin[p.t];
        c.beginPath();
        if (Math.abs(st) > 0.01) {
          c.moveTo(0, rho / st);
          c.lineTo(W, (rho - W * ct) / st);
        } else {
          c.moveTo(rho / ct, 0); c.lineTo(rho / ct, H);
        }
        c.stroke();
      }
    }
  }, [edges, peaks, overlay, trig]);

  // draw the accumulator heatmap (theta x rho) + mark detected peaks
  _useEffect(() => {
    const c = accRef.current.getContext("2d");
    const im = c.createImageData(T_BINS, R_BINS);
    const d = im.data;
    const norm = maxVotes || 1;
    for (let i = 0; i < R_BINS * T_BINS; i++) {
      const v = acc[i] / norm;                       // 0..1
      const g = Math.pow(v, 0.6);                      // gamma for visibility
      d[i * 4] = Math.min(255, g * 120 + v * 135);     // blue->violet ramp
      d[i * 4 + 1] = g * 70;
      d[i * 4 + 2] = Math.min(255, 60 + g * 195);
      d[i * 4 + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    // mark peaks
    c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 0.8;
    for (const p of peaks) { c.strokeRect(p.t - 2, p.r - 2, 5, 5); }
  }, [acc, maxVotes, peaks]);

  const stage = (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>EDGE IMAGE + DETECTED LINES</span>
        <canvas ref={srcRef} width={W} height={H}
          style={{ width: W * (mobile ? 1.5 : SCALE), height: H * (mobile ? 1.5 : SCALE), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>ACCUMULATOR (theta x rho)</span>
        <canvas ref={accRef} width={T_BINS} height={R_BINS}
          style={{ width: T_BINS * (mobile ? 1.0 : 1.4), height: R_BINS * (mobile ? 0.42 : 0.56), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)", background: "#05060f" }} />
        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>each point votes along a sinusoid; lines = bright crossings</span>
      </div>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// VOTE THRESHOLD" min={20} max={Math.max(40, maxVotes)} step={1} value={Math.min(threshold, Math.max(40, maxVotes))} onChange={setThreshold} tone="violet"
        help="Minimum number of edge points that must agree on a line before it counts. Lower it to find faint/short lines (and noise); raise it to keep only the strongest." />
      <Slider label="// NOISE POINTS" min={0} max={250} step={5} value={noise} onChange={setNoise} tone="blue"
        help="Random scattered edge pixels added on top of the real lines. They smear the accumulator with low background votes but rarely conspire into a false peak — which is exactly why Hough voting is robust." />
      <Toggle label="// OVERLAY DETECTED LINES" checked={overlay} onChange={setOverlay} tone="violet"
        help="Draw every accumulator peak back onto the image as a full line. Turn off to see the raw edge points alone." />
      <StatReadout label="LINES FOUND" value={peaks.length} accent="var(--violet-lt)" />
      <StatReadout label="PEAK VOTES" value={maxVotes} accent="var(--blue-lt)" />
      <Legend items={[
        { label: "edge point", color: "rgba(200,210,230,0.85)" },
        { label: "detected line", color: "#a855f7" },
        { label: "accumulator peak", color: "#fff" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        How do you find a straight line in a cloud of edge points when you don't
        know where it is or how long it is? The Hough transform flips the problem
        around. Instead of searching the image, every edge point <b>votes</b> for
        all the lines that could pass through it. A line in (x, y) space is written
        as ρ = x·cosθ + y·sinθ, so a single point traces out a whole <i>sinusoid</i>
        in (ρ, θ) parameter space — one vote per possible angle.
      </DemoP>
      <DemoP>
        Points that are collinear in the image vote for the <i>same</i> (ρ, θ) cell,
        so a real line shows up as a bright <b>peak</b> where many sinusoids cross.
        Read the peaks back out and you have the lines — and because each point votes
        independently, scattered noise just spreads thin background votes that almost
        never pile up into a false peak. Crank the <b>noise</b> slider and watch the
        true peaks survive. Lower the <b>threshold</b> to pull in fainter lines.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The Hough transform is the classic next step after
        <a href={`${window.__DM_BASE || "../../"}visualize/edge-detection/`}> edge detection</a>:
        Canny gives you a sparse set of edge pixels, Hough turns them into actual
        geometric lines. It still ships in real systems — lane detection in driver
        assistance, document and form de-skewing, barcode and grid finding, detecting
        the horizon or runway edges. The same accumulator idea extends to circles
        (vote in (a, b, r) space) and arbitrary shapes (the generalized Hough
        transform).
      </DemoP>
      <DemoP>
        The deep idea is <b>voting in a parameter space</b> for robustness: let every
        local observation cast a weak vote, and trust the consensus instead of any one
        measurement. That's the same robustness principle behind
        <a href={`${window.__DM_BASE || "../../"}visualize/self-consistency/`}> self-consistency</a> in
        LLMs and RANSAC in geometry — many noisy votes beat one fragile fit. Reading
        a peak out of the accumulator is itself a
        <a href={`${window.__DM_BASE || "../../"}visualize/nms/`}> non-maximum suppression</a> step,
        just like the one inside Canny and every object detector.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="COMPUTER VISION"
      title="Hough Transform"
      subtitle="Every edge point votes for the lines that could pass through it — and real lines emerge as bright peaks in the accumulator."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HoughTransformDemo />);
