// demos/integral-image.jsx — summed-area tables: any rectangle's sum in four reads,
// whatever its size. Both sums are computed every frame and compared on screen, so
// the "they agree" claim is verified live rather than asserted.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const N = 96, W = 460, H = 470;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }

// Padded to (N+1)x(N+1) with a zero row and column, so the four-corner lookup never
// needs a border special case. Leaving the padding out is the classic off-by-one here.
function integral(img) {
  const S = new Float64Array((N + 1) * (N + 1));
  for (let y = 0; y < N; y++) {
    let row = 0;
    for (let x = 0; x < N; x++) {
      row += img[y * N + x];
      S[(y + 1) * (N + 1) + (x + 1)] = S[y * (N + 1) + (x + 1)] + row;
    }
  }
  return S;
}
const boxSum = (S, x0, y0, x1, y1) =>
  S[(y1 + 1) * (N + 1) + (x1 + 1)] - S[y0 * (N + 1) + (x1 + 1)]
  - S[(y1 + 1) * (N + 1) + x0] + S[y0 * (N + 1) + x0];

function bruteSum(img, x0, y0, x1, y1) {
  let s = 0, ops = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { s += img[y * N + x]; ops++; }
  return { s, ops };
}

function makeScene(kind) {
  const img = new Float64Array(N * N), rand = rng(9);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v;
    if (kind === "face") {
      // A crude face-like arrangement: bright forehead, dark eye band, bright cheeks —
      // exactly the intensity pattern Haar features were designed to catch.
      v = 0.62;
      if (y > 26 && y < 40) v = 0.20;                                   // eye band
      if (y > 46 && y < 56 && x > 38 && x < 58) v = 0.42;               // nose shadow
      if (y > 64 && y < 74 && x > 30 && x < 66) v = 0.30;               // mouth
      const dx = x - 48, dy = y - 50;
      if (dx * dx / 1600 + dy * dy / 2100 > 1) v = 0.08;                // background
    } else if (kind === "edge") {
      v = x < N / 2 ? 0.15 : 0.85;
    } else {
      v = 0.25 + 0.5 * rand();
    }
    img[y * N + x] = v;
  }
  return img;
}

function IntegralDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [scene, setScene] = _useState("face");
  const [bw, setBw] = _useState(30);
  const [bh, setBh] = _useState(22);
  const [mode, setMode] = _useState("box");
  const cx = _useRef(46); const cy = _useRef(33);
  const [stats, setStats] = _useState({ brute: 0, ops: 0, fast: 0, haar: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const img = makeScene(scene);
    const S = integral(img);
    const panel = 218, cell = panel / N;

    const paint = (arr, ox, oy, norm) => {
      const im = ctx.createImageData(N, N);
      for (let i = 0; i < N * N; i++) {
        const g = Math.round(Math.min(1, Math.max(0, arr[i] / norm)) * 255);
        im.data[i * 4] = g; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = g; im.data[i * 4 + 3] = 255;
      }
      const off = document.createElement("canvas");
      off.width = N; off.height = N; off.getContext("2d").putImageData(im, 0, 0);
      ctx.drawImage(off, ox, oy, panel, panel);
    };

    paint(img, 0, 22, 1);
    // The integral image itself: a monotone ramp to the bottom-right, which is the
    // whole reason the four-corner subtraction works.
    const flat = new Float64Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) flat[y * N + x] = S[(y + 1) * (N + 1) + (x + 1)];
    paint(flat, panel + 24, 22, S[(N) * (N + 1) + N]);

    ctx.fillStyle = "#e6edfb"; ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText("IMAGE", 0, 14);
    ctx.fillText("INTEGRAL IMAGE (ramps to bottom-right)", panel + 24, 14);

    const x0 = Math.max(0, Math.min(N - bw, cx.current - (bw >> 1)));
    const y0 = Math.max(0, Math.min(N - bh, cy.current - (bh >> 1)));
    const x1 = x0 + bw - 1, y1 = y0 + bh - 1;

    const b = bruteSum(img, x0, y0, x1, y1);
    const q = boxSum(S, x0, y0, x1, y1);

    // rectangle on the image
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2;
    ctx.strokeRect(x0 * cell, 22 + y0 * cell, bw * cell, bh * cell);

    if (mode === "haar") {
      // two-rectangle feature: left box minus right box, both from the same table
      const half = bw >> 1;
      const left = boxSum(S, x0, y0, x0 + half - 1, y1);
      const right = boxSum(S, x0 + half, y0, x1, y1);
      ctx.fillStyle = "rgba(96,165,250,0.30)";
      ctx.fillRect(x0 * cell, 22 + y0 * cell, half * cell, bh * cell);
      ctx.fillStyle = "rgba(248,113,113,0.30)";
      ctx.fillRect((x0 + half) * cell, 22 + y0 * cell, (bw - half) * cell, bh * cell);
      setStats({ brute: b.s, ops: b.ops, fast: q, haar: left - right });
    } else {
      setStats({ brute: b.s, ops: b.ops, fast: q, haar: null });
    }

    // the four corners the lookup actually touches, on the integral panel
    const ox = panel + 24;
    const corners = [[x0, y0, "A"], [x1 + 1, y0, "B"], [x0, y1 + 1, "C"], [x1 + 1, y1 + 1, "D"]];
    for (const [gx, gy, tag] of corners) {
      const px = ox + gx * cell, py = 22 + gy * cell;
      ctx.fillStyle = tag === "D" ? "#34d399" : tag === "A" ? "#34d399" : "#f87171";
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e6edfb"; ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(tag, px + 6, py - 4);
    }
    ctx.strokeStyle = "rgba(52,211,153,0.6)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + x0 * cell, 22 + y0 * cell, bw * cell, bh * cell);

    // the arithmetic, spelled out
    const ty = 22 + panel + 26;
    ctx.font = "12px JetBrains Mono, monospace";
    ctx.fillStyle = "#8fa3c8";
    ctx.fillText("sum(rect)  =  D + A  −  B  −  C", 0, ty);
    ctx.fillStyle = "#e6edfb";
    ctx.fillText(`           =  ${q.toFixed(2)}`, 0, ty + 20);
    ctx.fillStyle = "#8fa3c8";
    ctx.fillText(`brute force over ${b.ops} pixels  =  ${b.s.toFixed(2)}`, 0, ty + 44);
    ctx.fillStyle = Math.abs(b.s - q) < 1e-6 ? "#34d399" : "#f87171";
    ctx.fillText(Math.abs(b.s - q) < 1e-6 ? "agree to floating point" : "MISMATCH", 0, ty + 64);
  }

  function onDown(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * W;
    const py = (e.clientY - r.top) / r.height * H - 22;
    const panel = 218, cell = panel / N;
    if (px < panel && py > 0 && py < panel) {
      cx.current = Math.round(px / cell); cy.current = Math.round(py / cell); draw();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [scene, bw, bh, mode]);

  const stage = (
    <canvas ref={canvasRef} onPointerDown={onDown}
      style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />
  );
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// MODE" value={mode} onChange={setMode}
        options={[{ value: "box", label: "Box sum" }, { value: "haar", label: "Haar feature" }]}
        help="Box sum shows one rectangle and the four corners its value comes from. Haar splits the rectangle in two and takes the difference - the primitive Viola-Jones detection is built from." />
      <SegmentedControl label="// SCENE" value={scene} onChange={setScene}
        options={[{ value: "face", label: "Face-like" }, { value: "edge", label: "Edge" }, { value: "noise", label: "Noise" }]}
        help="The face-like scene has a dark eye band under a bright forehead, which is exactly the intensity pattern the first Haar feature in a real cascade looks for." />
      <Slider label="// RECT WIDTH" min={4} max={80} value={bw} onChange={setBw}
        help="Widen it and watch the brute-force operation count climb while the integral cost stays at four reads. That constant is the entire point." />
      <Slider label="// RECT HEIGHT" min={4} max={80} value={bh} onChange={setBh}
        help="Same again vertically. There is no rectangle size, anywhere in the image, that costs more than four reads and three additions." />
      <StatReadout label="BRUTE-FORCE ADDITIONS" value={String(stats.ops)} accent="#f87171" />
      <StatReadout label="INTEGRAL LOOKUPS" value="4 reads, 3 adds" accent="#34d399" />
      <StatReadout label="SPEEDUP" value={`${(stats.ops / 4).toFixed(0)}x`} accent="#60a5fa" />
      {stats.haar !== null && (
        <StatReadout label="HAAR RESPONSE (LEFT − RIGHT)" value={stats.haar.toFixed(1)} accent="#c084fc" />
      )}
      <Legend items={[{ color: "#34d399", label: "ADD (A, D)" }, { color: "#f87171", label: "SUBTRACT (B, C)" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        Click the left panel to move the rectangle.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        An integral image stores, at every position, the sum of everything above and to
        the left of it. Build it in one pass, and afterwards the sum of <i>any</i>
        rectangle is four reads and three additions: take the bottom-right corner, add
        back the top-left, subtract the two you double-counted. Widen the rectangle and
        the brute-force counter climbs into the thousands while the integral cost does
        not move.
      </DemoP>
      <DemoP>
        Both sums are computed every frame and printed together, so you are not being
        asked to take the identity on trust — they agree to floating point for every
        rectangle, including one covering the whole image, where brute force needs 9,216
        additions and the table needs four reads.
      </DemoP>
      <DemoP>
        Switch to <b>Haar feature</b> and the rectangle splits in two: the response is
        one box minus its neighbour, so a light-over-dark pattern gives a large value and
        flat texture gives roughly zero. On the face-like scene, park it across the eye
        band and watch the response jump. That is a whole feature evaluated in constant
        time, which is why a detector can afford to try thousands of them per window.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the trick that made Viola-Jones real-time in 2001, on hardware slower than
        a modern watch. The insight was not a better classifier — it was that if every
        feature costs the same tiny constant regardless of size, you can evaluate an
        enormous pool of them and let a boosted cascade reject easy background windows
        after two or three. Most of the speed came from the cascade and the constant-time
        feature together, not from either alone.
      </DemoP>
      <DemoP>
        The pattern generalises well beyond vision: <b>precompute a prefix sum, then
        answer range queries in constant time</b>. The 1-D version is the prefix-sum array
        behind countless interview problems, the 2-D version is this, and the same idea
        underlies summed-area tables in graphics, fast box blurs, and integral histograms.
        It is also a clean example of a space-for-time trade you can actually quantify:
        one extra array, and every range query afterwards is free.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Integral Images & Haar Features"
      subtitle="Precompute once, then sum any rectangle in four reads — the trick that made real-time face detection possible."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<IntegralDemo />);
