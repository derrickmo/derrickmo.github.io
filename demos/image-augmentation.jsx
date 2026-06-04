// demos/image-augmentation.jsx — Data augmentation. One base image is drawn once;
// each tile applies a fresh random composition of real pixel transforms (h-flip,
// rotate, scale-crop, brightness/contrast jitter, cutout) with the current knob
// ranges. The label never changes, but the pixels do — that's the regularizer.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, Toggle, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const TILE = 72;          // tile resolution (px)
const COLS = 4, ROWS = 3; // 12 augmented samples
const BG = [9, 11, 22];   // background color (matches the deep canvas)

// deterministic RNG so a given seed reproduces the whole sample set
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// draw the base "object" once into an offscreen canvas: a stylized rocket on a
// textured ground — asymmetric so h-flip is visible, colored so jitter shows.
function buildBase() {
  const off = document.createElement("canvas"); off.width = TILE; off.height = TILE;
  const c = off.getContext("2d");
  c.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`; c.fillRect(0, 0, TILE, TILE);
  const cx = 36;
  // body
  c.fillStyle = "#e2e8f0";
  c.beginPath();
  c.moveTo(cx, 12); c.quadraticCurveTo(cx + 13, 30, cx + 12, 50);
  c.lineTo(cx - 12, 50); c.quadraticCurveTo(cx - 13, 30, cx, 12); c.closePath(); c.fill();
  // window
  c.fillStyle = "#60a5fa"; c.beginPath(); c.arc(cx, 30, 6, 0, Math.PI * 2); c.fill();
  // fins (asymmetric tint so flips are obvious)
  c.fillStyle = "#a855f7"; c.beginPath(); c.moveTo(cx - 12, 44); c.lineTo(cx - 22, 56); c.lineTo(cx - 12, 56); c.closePath(); c.fill();
  c.fillStyle = "#f472b6"; c.beginPath(); c.moveTo(cx + 12, 44); c.lineTo(cx + 22, 56); c.lineTo(cx + 12, 56); c.closePath(); c.fill();
  // flame
  c.fillStyle = "#fbbf24"; c.beginPath(); c.moveTo(cx - 6, 52); c.lineTo(cx, 66); c.lineTo(cx + 6, 52); c.closePath(); c.fill();
  return off;
}

function ImageAugmentationDemo() {
  const baseRef = _useRef(null);
  const gridRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [flip, setFlip] = _useState(true);
  const [rot, setRot] = _useState(20);       // max abs rotation, degrees
  const [zoom, setZoom] = _useState(25);     // +/- scale jitter, percent
  const [jitter, setJitter] = _useState(35); // color jitter strength, percent
  const [cut, setCut] = _useState(22);       // cutout size, percent of tile
  const [seed, setSeed] = _useState(7);

  const base = _useMemo(() => buildBase(), []);

  // draw the untouched original
  _useEffect(() => {
    const ctx = baseRef.current.getContext("2d");
    ctx.clearRect(0, 0, TILE, TILE);
    ctx.drawImage(base, 0, 0);
  }, [base]);

  // draw the 12 augmented samples + measure mean pixel change vs the original
  const [meanDiff, setMeanDiff] = _useState(0);
  _useEffect(() => {
    const canvas = gridRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // reference pixels (the original) for the diff metric
    const refCtx = base.getContext("2d");
    const ref = refCtx.getImageData(0, 0, TILE, TILE).data;

    const rand = rng(seed * 2654435761);
    const tmp = document.createElement("canvas"); tmp.width = TILE; tmp.height = TILE;
    const tctx = tmp.getContext("2d");
    let diffAcc = 0, diffN = 0;

    for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
      // --- geometric transforms (real affine) into tmp ---
      tctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`; tctx.fillRect(0, 0, TILE, TILE);
      tctx.save();
      tctx.translate(TILE / 2, TILE / 2);
      const doFlip = flip && rand() < 0.5;
      if (doFlip) tctx.scale(-1, 1);
      const ang = (rand() * 2 - 1) * rot * Math.PI / 180;
      tctx.rotate(ang);
      const s = 1 + (rand() * 2 - 1) * (zoom / 100);   // scale-crop jitter
      tctx.scale(s, s);
      // small random translation (part of random-crop)
      const tx = (rand() * 2 - 1) * 6, ty = (rand() * 2 - 1) * 6;
      tctx.translate(tx - TILE / 2, ty - TILE / 2);
      tctx.drawImage(base, 0, 0);
      tctx.restore();

      // --- photometric jitter (per-pixel brightness/contrast) ---
      const jb = (rand() * 2 - 1) * (jitter / 100) * 90;        // brightness offset
      const jc = 1 + (rand() * 2 - 1) * (jitter / 100) * 0.8;   // contrast factor
      const img = tctx.getImageData(0, 0, TILE, TILE); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          let v = (d[i + k] - 128) * jc + 128 + jb;
          d[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
      }
      tctx.putImageData(img, 0, 0);

      // --- cutout (random erased square filled with background) ---
      if (cut > 0) {
        const cs = (cut / 100) * TILE;
        const px = rand() * (TILE - cs), py = rand() * (TILE - cs);
        tctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`;
        tctx.fillRect(px, py, cs, cs);
      }

      // accumulate mean per-pixel difference vs original
      const aug = tctx.getImageData(0, 0, TILE, TILE).data;
      for (let i = 0; i < aug.length; i += 4) {
        diffAcc += Math.abs(aug[i] - ref[i]) + Math.abs(aug[i + 1] - ref[i + 1]) + Math.abs(aug[i + 2] - ref[i + 2]);
        diffN += 3;
      }

      // blit tile into the grid with a small gutter
      const gx = col * (TILE + 6) + 3, gy = r * (TILE + 6) + 3;
      ctx.drawImage(tmp, gx, gy);
      ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(gx + 0.5, gy + 0.5, TILE - 1, TILE - 1);
    }
    setMeanDiff(diffN ? (diffAcc / diffN) / 255 * 100 : 0);
  }, [base, flip, rot, zoom, jitter, cut, seed]);

  const gw = COLS * (TILE + 6), gh = ROWS * (TILE + 6);
  const anyAug = flip || rot > 0 || zoom > 0 || jitter > 0 || cut > 0;

  const stage = (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>ORIGINAL</span>
        <canvas ref={baseRef} width={TILE} height={TILE}
          style={{ width: TILE * (mobile ? 1.4 : 1.7), height: TILE * (mobile ? 1.4 : 1.7), imageRendering: "auto", borderRadius: 4, border: "1px solid var(--border)", background: "#000" }} />
        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>label: "rocket"</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span className="t-mono-s" style={{ color: "var(--muted)" }}>AUGMENTED SAMPLES (same label)</span>
        <canvas ref={gridRef} width={gw} height={gh}
          style={{ width: gw * (mobile ? 0.78 : 1), height: gh * (mobile ? 0.78 : 1), borderRadius: 4, border: "1px solid var(--border)", background: "#05060f" }} />
        <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>{anyAug ? "every tile is a fresh random transform" : "all knobs at zero — identical copies"}</span>
      </div>
    </div>
  );

  const controls = (
    <ControlGroup>
      <DemoButton onClick={() => setSeed(s => s + 1)} tone="violet" primary>RESAMPLE</DemoButton>
      <Toggle label="// HORIZONTAL FLIP" checked={flip} onChange={setFlip} tone="violet"
        help="Randomly mirror left-right with 50% probability. Safe when the label is flip-invariant (a rocket is still a rocket) but wrong for text or left/right-handed classes — choosing label-preserving transforms is the whole art of augmentation." />
      <Slider label="// ROTATION" min={0} max={45} step={1} value={rot} onChange={setRot} suffix="deg" tone="blue"
        help="Maximum random rotation each way. Teaches rotation tolerance; too much can push the object out of frame or create unrealistic poses." />
      <Slider label="// SCALE / CROP" min={0} max={45} step={1} value={zoom} onChange={setZoom} suffix="%" tone="violet"
        help="Random zoom in/out (a random-resized-crop stand-in). Forces the model to recognize the object at different sizes and positions." />
      <Slider label="// COLOR JITTER" min={0} max={80} step={1} value={jitter} onChange={setJitter} suffix="%" tone="blue"
        help="Random brightness + contrast shift per sample. Builds invariance to lighting and camera exposure so the model keys on shape, not absolute pixel values." />
      <Slider label="// CUTOUT" min={0} max={45} step={1} value={cut} onChange={setCut} suffix="%" tone="violet"
        help="Erase a random square (Cutout / Random Erasing). Stops the model from leaning on one tell-tale patch and forces it to use the whole object — a form of dropout on the input." />
      <StatReadout label="MEAN PIXEL CHANGE" value={meanDiff.toFixed(1) + "%"} accent="var(--violet-lt)" />
      <StatReadout label="EFFECTIVE VARIETY" value={anyAug ? "1 image -> infinite views" : "1 image (no aug)"} accent="var(--blue-lt)" />
      <Legend items={[{ label: "fin tints mark left/right", color: "#a855f7" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Data augmentation manufactures new training examples from old ones by applying
        transforms that <b>change the pixels but not the label</b>. The original on the
        left is one labeled image; every tile on the right is the <i>same</i> rocket
        seen through a random composition of flip, rotation, scale, color jitter, and
        cutout. The model is forced to call all of them "rocket," so it learns the
        features that survive these nuisances instead of memorizing one exact bitmap.
      </DemoP>
      <DemoP>
        Watch the <b>mean pixel change</b>: even modest knobs move a large fraction of
        the pixels, yet a human reads every tile as the same object. That gap is the
        free lunch — you multiply a small dataset into endless views and bake in the
        invariances you know are true (a rocket is still a rocket flipped, rotated, or
        partly hidden). The cost is that each transform encodes an assumption: flip a
        digit and you may turn a 6 into something that isn't a 6, so the right
        augmentations are domain-specific.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Augmentation is one of the most reliable regularizers in deep learning — it
        directly attacks <a href={`${window.__DM_BASE || "../../"}visualize/overfitting/`}>overfitting</a> by
        enlarging and diversifying the data the model sees, which is why ImageNet-scale
        vision, self-supervised pretraining, and almost every winning competition model
        lean on it. <b>Cutout</b> is essentially
        <a href={`${window.__DM_BASE || "../../"}visualize/regularization/`}> regularization</a> applied
        to the input (dropout on pixels), and the flip/crop/jitter family is exactly the
        invariance a <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`}>convolutional</a> network
        only partially gets for free from weight sharing.
      </DemoP>
      <DemoP>
        The same idea generalizes far beyond images: token masking and synonym swaps in
        NLP, time/frequency masking on audio spectrograms, and the two-view augmentation
        at the heart of <a href={`${window.__DM_BASE || "../../"}visualize/contrastive-learning/`}>contrastive learning</a>,
        where the model is trained to pull augmented views of the same image together.
        The recurring principle: if you know a transform shouldn't change the answer,
        teach the model that invariance by showing it the transform.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="COMPUTER VISION"
      title="Data Augmentation"
      subtitle="Manufacture endless training views from one labeled image with label-preserving random transforms — the cheapest, most reliable regularizer in deep learning."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ImageAugmentationDemo />);
