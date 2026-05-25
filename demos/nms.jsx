// demos/nms.jsx — object detection cleanup: Intersection-over-Union + Non-Maximum
// Suppression. Real IoU and the greedy NMS algorithm on a scene of noisy,
// overlapping candidate boxes with confidence scores.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 460;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function genScene(seed) {
  const rng = mulberry32(seed);
  const objects = [
    { x: 60, y: 70, w: 120, h: 95 },
    { x: 270, y: 60, w: 110, h: 130 },
    { x: 90, y: 270, w: 140, h: 120 },
    { x: 300, y: 280, w: 100, h: 100 },
  ];
  const boxes = [];
  objects.forEach((o, oi) => {
    const n = 3 + ((rng() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const jx = (rng() - 0.5) * 42, jy = (rng() - 0.5) * 42;
      const jw = (rng() - 0.5) * 36, jh = (rng() - 0.5) * 36;
      boxes.push({ x: o.x + jx, y: o.y + jy, w: o.w + jw, h: o.h + jh, score: 0.45 + rng() * 0.55, obj: oi });
    }
  });
  return boxes;
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const uni = a.w * a.h + b.w * b.h - inter;
  return uni > 0 ? inter / uni : 0;
}

function nms(boxes, iouT, confT) {
  const cand = boxes.filter(b => b.score >= confT).sort((a, b) => b.score - a.score);
  const kept = [];
  const pool = cand.slice();
  while (pool.length) { const m = pool.shift(); kept.push(m); for (let i = pool.length - 1; i >= 0; i--) if (iou(m, pool[i]) > iouT) pool.splice(i, 1); }
  return kept;
}

function NMSDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const boxesRef = _useRef(genScene(5));
  const seedRef = _useRef(5);
  const [iouT, setIouT] = _useState(0.4);
  const [confT, setConfT] = _useState(0.45);
  const [stats, setStats] = _useState({ cand: 0, kept: 0, supp: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const boxes = boxesRef.current;
    const kept = nms(boxes, iouT, confT);
    const keptSet = new Set(kept);
    ctx.font = "11px JetBrains Mono, monospace";

    // suppressed / below-threshold first (so kept draw on top)
    for (const b of boxes) {
      if (keptSet.has(b)) continue;
      const below = b.score < confT;
      ctx.strokeStyle = below ? "rgba(100,116,139,0.18)" : "rgba(248,113,113,0.55)";
      ctx.lineWidth = 1; ctx.setLineDash(below ? [2, 3] : [4, 3]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
    ctx.setLineDash([]);
    for (const b of kept) {
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2.4; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#34d399"; ctx.fillRect(b.x, b.y - 15, 40, 15);
      ctx.fillStyle = "#04210f"; ctx.fillText(b.score.toFixed(2), b.x + 4, b.y - 4);
    }

    const cand = boxes.filter(b => b.score >= confT).length;
    setStats({ cand, kept: kept.length, supp: cand - kept.length });
  }

  function reseed() { seedRef.current += 1; boxesRef.current = genScene(seedRef.current); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [iouT, confT]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// IoU THRESHOLD" min={0.1} max={0.9} step={0.05} value={iouT} onChange={setIouT} />
      <Slider label="// CONFIDENCE THRESHOLD" min={0} max={0.95} step={0.05} value={confT} onChange={setConfT} tone="violet" />
      <DemoButton onClick={reseed} primary>NEW SCENE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatReadout label="CANDIDATES" value={stats.cand} />
        <StatReadout label="KEPT" value={stats.kept} accent="#34d399" />
        <StatReadout label="SUPPRESSED" value={stats.supp} accent="#f87171" />
      </div>
      <Legend items={[{ color: "#34d399", label: "KEPT" }, { color: "#f87171", label: "SUPPRESSED" }, { color: "#64748b", label: "BELOW CONFIDENCE" }]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A detector doesn't emit one clean box per object — it fires dozens of
        overlapping candidates, each with a confidence score. <b>Non-Maximum
        Suppression</b> cleans that up with a greedy rule: take the highest-scoring
        box, throw away every other box that overlaps it too much, and repeat. "Too
        much" is measured by <b>Intersection-over-Union</b> — the shared area divided
        by the combined area of two boxes. Drag the <b>IoU threshold</b>: low values
        suppress aggressively (one box per object), high values let near-duplicates
        survive.
      </DemoP>
      <DemoP>
        The <b>confidence threshold</b> first drops weak detections entirely (greyed
        out) before NMS even runs. Tuning these two knobs is the everyday reality of
        shipping an object detector — too strict and you miss real objects, too loose
        and the image fills with duplicate boxes. The same IoU metric also defines how
        detection accuracy (mAP) is scored against ground truth.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="COMPUTER VISION · DETECTION" title="IoU & Non-Max Suppression"
      subtitle="From a cloud of overlapping detections to one clean box per object — the greedy algorithm every detector ends with."
      stage={stage} controls={controls} explainer={explainer}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NMSDemo />);
