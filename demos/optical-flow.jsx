// demos/optical-flow.jsx — Lucas-Kanade optical flow. A fixed random texture is
// rigidly translated over time, so the TRUE flow is a known uniform vector. Each
// frame we estimate flow at grid points by solving the 2x2 LK least-squares
// system from the spatial gradients (Ix, Iy) and the temporal difference (It).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, Toggle, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const W = 168, H = 132, SCALE = 2.1;

// fixed random texture T(x,y) = sum of sinusoids, normalized to [0,1]
function makeTexture() {
  const comps = [];
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < 6; k++) {
    const ang = rnd() * Math.PI, freq = 0.05 + rnd() * 0.16;
    comps.push({ fx: Math.cos(ang) * freq, fy: Math.sin(ang) * freq, ph: rnd() * Math.PI * 2, a: 0.5 + rnd() * 0.5 });
  }
  let amp = 0; for (const c of comps) amp += c.a;
  return (x, y) => {
    let v = 0; for (const c of comps) v += c.a * Math.sin(c.fx * x + c.fy * y + c.ph);
    return 0.5 + 0.5 * (v / amp);
  };
}

function OpticalFlowDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [speed, setSpeed] = _useState(1.6);
  const [angle, setAngle] = _useState(25);   // degrees
  const [win, setWin] = _useState(5);         // LK window radius
  const [showDiff, setShowDiff] = _useState(false);
  const [playing, setPlaying] = _useState(true);
  const [err, setErr] = _useState(0);

  // refs mirror control state so the single rAF loop reads fresh values
  const cfg = _useRef({ speed, angle, win, showDiff, playing });
  _useEffect(() => { cfg.current = { speed, angle, win, showDiff, playing }; }, [speed, angle, win, showDiff, playing]);

  _useEffect(() => {
    const tex = makeTexture();
    const ctx = cvRef.current.getContext("2d");
    let raf, shift = 0, prev = null;
    const cur = new Float32Array(W * H);
    const errEMA = { v: 0 };

    function render(buf, shiftx, shifty) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        buf[y * W + x] = tex(x - shiftx, y - shifty);
    }

    function frame() {
      const { speed, angle, win, showDiff, playing } = cfg.current;
      const a = angle * Math.PI / 180;
      const vx = Math.cos(a) * speed, vy = Math.sin(a) * speed;
      if (playing) shift += 1;
      const shiftx = vx * shift, shifty = vy * shift;
      render(cur, shiftx, shifty);

      // paint the texture (or the temporal difference It)
      const im = ctx.createImageData(W, H); const d = im.data;
      for (let i = 0; i < W * H; i++) {
        let r, g, b;
        if (showDiff && prev) {
          const it = (cur[i] - prev[i]) * 4;             // amplify
          if (it > 0) { r = 30; g = 60; b = 60 + Math.min(195, it * 255); }
          else { r = 60 + Math.min(195, -it * 255); g = 40; b = 40; }
        } else { const v = cur[i] * 255; r = g = b = v; }
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);

      // estimate LK flow at grid points and draw arrows
      if (prev) {
        let sumErr = 0, n = 0;
        const step = 22, scale = 3.2;
        ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(168,85,247,0.95)"; ctx.fillStyle = "rgba(168,85,247,0.95)";
        for (let gy = step; gy < H - step + 1; gy += step) for (let gx = step; gx < W - step + 1; gx += step) {
          let Axx = 0, Axy = 0, Ayy = 0, bx = 0, by = 0;
          for (let dy = -win; dy <= win; dy++) for (let dx = -win; dx <= win; dx++) {
            const x = gx + dx, y = gy + dy;
            if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
            const Ix = (cur[y * W + x + 1] - cur[y * W + x - 1]) * 0.5;
            const Iy = (cur[(y + 1) * W + x] - cur[(y - 1) * W + x]) * 0.5;
            const It = cur[y * W + x] - prev[y * W + x];
            Axx += Ix * Ix; Axy += Ix * Iy; Ayy += Iy * Iy; bx += Ix * It; by += Iy * It;
          }
          const det = Axx * Ayy - Axy * Axy;
          if (Math.abs(det) < 1e-4) continue;
          // solve [Axx Axy; Axy Ayy] [u;v] = -[bx; by]
          const u = (-bx * Ayy + by * Axy) / det;
          const v = (-by * Axx + bx * Axy) / det;
          // accuracy vs known true motion (per-frame displacement = (vx,vy))
          sumErr += Math.hypot(u - vx, v - vy); n++;
          const ex = gx + u * scale, ey = gy + v * scale;
          ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(ex, ey); ctx.stroke();
          const ah = Math.atan2(v, u);
          ctx.beginPath(); ctx.moveTo(ex, ey);
          ctx.lineTo(ex - 4 * Math.cos(ah - 0.4), ey - 4 * Math.sin(ah - 0.4));
          ctx.lineTo(ex - 4 * Math.cos(ah + 0.4), ey - 4 * Math.sin(ah + 0.4));
          ctx.closePath(); ctx.fill();
        }
        if (n) { errEMA.v = errEMA.v * 0.9 + (sumErr / n) * 0.1; }
      }
      const tmp = prev || new Float32Array(W * H);
      tmp.set(cur); prev = tmp;
      // surface the error roughly twice a second
      if ((shift & 7) === 0) setErr(errEMA.v);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const a = angle * Math.PI / 180;
  const trueVx = (Math.cos(a) * speed).toFixed(2), trueVy = (Math.sin(a) * speed).toFixed(2);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>{showDiff ? "TEMPORAL DIFFERENCE It + FLOW" : "MOVING TEXTURE + ESTIMATED FLOW"}</span>
      <canvas ref={cvRef} width={W} height={H}
        style={{ width: W * (mobile ? 1.6 : SCALE), height: H * (mobile ? 1.6 : SCALE), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)", background: "#000" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>arrows = LK estimate · true motion = ({trueVx}, {trueVy}) px/frame</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <DemoButton onClick={() => setPlaying(p => !p)} tone="violet" primary>{playing ? "PAUSE" : "PLAY"}</DemoButton>
      <Slider label="// SPEED" min={0.2} max={3.5} step={0.1} value={speed} onChange={setSpeed} suffix=" px/f" tone="violet"
        help="Magnitude of the true per-frame translation. Lucas-Kanade assumes small motion (it linearizes brightness), so very large speeds break the estimate — the classic LK limitation that pyramids fix." />
      <Slider label="// DIRECTION" min={0} max={359} step={1} value={angle} onChange={setAngle} suffix="deg" tone="blue"
        help="Angle of the true motion. Watch every estimated arrow swing to match — uniform translation gives a uniform flow field." />
      <Slider label="// LK WINDOW" min={2} max={9} step={1} value={win} onChange={setWin} tone="violet"
        help="Radius of the neighborhood summed into the 2x2 system. Larger windows are steadier but blur motion boundaries and assume the whole window moves together." />
      <Toggle label="// SHOW It (frame difference)" checked={showDiff} onChange={setShowDiff} tone="blue"
        help="Color the temporal brightness change It between consecutive frames — red where it darkened, blue where it brightened. It is the raw signal that drives the flow solve." />
      <StatReadout label="MEAN FLOW ERROR" value={err.toFixed(3) + " px"} accent={err < 0.3 ? "var(--blue-lt)" : "var(--violet-lt)"} />
      <Legend items={[{ label: "estimated flow", color: "#a855f7" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Optical flow asks: where did each pixel go between two frames? The key
        assumption is <b>brightness constancy</b> — a point keeps its intensity as it
        moves, so I(x, y, t) = I(x + u, y + v, t + 1). Linearize that and you get the
        <b> optical-flow constraint</b> I<sub>x</sub>u + I<sub>y</sub>v + I<sub>t</sub> = 0:
        one equation, two unknowns (u, v). A single pixel isn't enough — that's the
        <b> aperture problem</b>.
      </DemoP>
      <DemoP>
        <b>Lucas-Kanade</b> fixes this by assuming every pixel in a small window
        shares the same motion, stacking one constraint per pixel and solving the
        2×2 least-squares system. Here the whole texture is rigidly translating, so
        the true flow is a known constant — compare it to the violet arrows and watch
        the <b>mean flow error</b>. Push the <b>speed</b> up and the error grows: LK
        linearizes brightness, so it only handles small motion (real systems run it
        on an image pyramid to cope). Toggle <b>It</b> to see the raw temporal signal.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Optical flow is how machines perceive motion: video stabilization, frame
        interpolation (the "smooth slow-mo" on your phone), action recognition,
        visual odometry and SLAM, and driver-assistance all estimate per-pixel or
        per-feature motion. Classic pipelines track
        <a href={`${window.__DM_BASE || "../../"}visualize/harris-corners/`}> Harris corners</a>
        across frames precisely because corners dodge the aperture problem — they pin
        down both motion components. The gradients here are the same Sobel-style
        derivatives from <a href={`${window.__DM_BASE || "../../"}visualize/edge-detection/`}>edge detection</a>.
      </DemoP>
      <DemoP>
        The aperture problem and its least-squares fix are a general lesson: a local
        measurement underdetermines the answer, so you pool a neighborhood and solve
        a small system — the same move as the structure tensor in corner detection.
        Modern methods (Horn-Schunck's global smoothness, and learned networks like
        RAFT) push accuracy further, but they're all chasing the dense motion field
        Lucas-Kanade estimates sparsely here.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Optical Flow (Lucas-Kanade)"
      subtitle="Estimate per-point motion between frames by assuming brightness is conserved and solving the 2x2 least-squares system in a local window."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<OpticalFlowDemo />);
