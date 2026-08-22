// demos/huffman-coding.jsx — entropy is the limit of lossless compression.
// Build the optimal prefix code (Huffman) for a symbol distribution by greedily
// merging the two least-probable nodes, then compare the resulting average code
// length L against the Shannon entropy H. The bound H <= L < H+1 is the precise
// statement that entropy is the fundamental compression limit. Real Huffman
// construction + real entropy; skew the distribution to watch both move.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const log2 = z => Math.log(z) / Math.LN2;
const LETTERS = "ABCDEFGH";

function buildHuffman(probs) {
  let nodes = probs.map((p, i) => ({ p, sym: LETTERS[i] }));
  if (nodes.length === 1) return { ...nodes[0] };
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.p - b.p);
    const a = nodes.shift(), b = nodes.shift();
    nodes.push({ p: a.p + b.p, l: a, r: b });
  }
  return nodes[0];
}
function assignCodes(node, code, map) {
  if (node.sym != null) { map[node.sym] = code || "0"; return; }
  assignCodes(node.l, code + "0", map); assignCodes(node.r, code + "1", map);
}

function HuffmanCodingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [n, setN] = _useState(5);
  const [skew, setSkew] = _useState(0.55);
  const [, setTick] = _useState(0);

  function probs() {
    const arr = []; let s = 0;
    for (let i = 0; i < n; i++) { const v = Math.pow(skew, i); arr.push(v); s += v; }
    return arr.map(v => v / s);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const P = probs(), root = buildHuffman(P), codes = {};
    assignCodes(root, "", codes);
    // layout: leaves in DFS order get x slots; internal = midpoint; y by depth
    const leaves = []; let maxD = 0;
    (function order(nd, d) { nd.depth = d; maxD = Math.max(maxD, d); if (nd.sym != null) { leaves.push(nd); } else { order(nd.l, d + 1); order(nd.r, d + 1); } })(root, 0);
    const x0 = 30, x1 = 300, slot = (x1 - x0) / Math.max(1, leaves.length - 1 || 1);
    leaves.forEach((lf, i) => { lf.x = leaves.length === 1 ? (x0 + x1) / 2 : x0 + i * slot; });
    (function setx(nd) { if (nd.sym != null) return nd.x; nd.x = (setx(nd.l) + setx(nd.r)) / 2; return nd.x; })(root);
    const topY = 40, dy = Math.min(56, (300 - topY) / Math.max(1, maxD));
    const py = d => topY + d * dy;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("HUFFMAN TREE", x0, 24);
    // edges
    (function edges(nd) {
      if (nd.sym != null) return;
      [["0", nd.l], ["1", nd.r]].forEach(([bit, ch]) => {
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(nd.x, py(nd.depth)); ctx.lineTo(ch.x, py(ch.depth)); ctx.stroke();
        ctx.fillStyle = bit === "0" ? "#60a5fa" : "#a855f7"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center";
        ctx.fillText(bit, (nd.x + ch.x) / 2 + (bit === "0" ? -7 : 7), (py(nd.depth) + py(ch.depth)) / 2);
        edges(ch);
      });
    })(root);
    // nodes
    (function nodes(nd) {
      const x = nd.x, y = py(nd.depth);
      if (nd.sym != null) {
        ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "11px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText(nd.sym, x, y + 4);
      } else {
        ctx.fillStyle = "rgba(148,163,184,0.5)"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        nodes(nd.l); nodes(nd.r);
      }
    })(root);

    // code table (right)
    const rx = 330; ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText("SYM   PROB   CODE", rx, 24);
    let Hh = 0, L = 0;
    for (let i = 0; i < n; i++) { Hh -= P[i] * log2(P[i]); L += P[i] * codes[LETTERS[i]].length; }
    P.forEach((p, i) => {
      const y = 44 + i * 22, s = LETTERS[i];
      ctx.fillStyle = "#3b82f6"; ctx.font = "11px JetBrains Mono"; ctx.fillText(s, rx, y);
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillText(p.toFixed(3), rx + 36, y);
      // prob bar
      ctx.fillStyle = "rgba(96,165,250,0.3)"; ctx.fillRect(rx + 36, y + 3, p * 80, 4);
      ctx.fillStyle = "#a855f7"; ctx.font = "11px JetBrains Mono"; ctx.fillText(codes[s], rx + 110, y);
    });
    // readouts
    const yy = 44 + n * 22 + 16;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText("ENTROPY H (limit)", rx, yy);
    ctx.fillStyle = "#34d399"; ctx.font = "20px Space Grotesk, sans-serif"; ctx.fillText(Hh.toFixed(3), rx, yy + 22);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText("AVG LENGTH L", rx + 100, yy);
    ctx.fillStyle = "#fbbf24"; ctx.font = "20px Space Grotesk, sans-serif"; ctx.fillText(L.toFixed(3), rx + 100, yy + 22);
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono"; ctx.fillText(`bits/symbol - H <= L < H+1`, rx, yy + 40);
    metricRef.current = { H: Hh, L, eff: L > 0 ? Hh / L : 0 };
  }
  const metricRef = _useRef({ H: 0, L: 0, eff: 0 });

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [n, skew]);

  const m = metricRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// SYMBOLS" min={3} max={8} step={1} value={n} onChange={setN}
        help="How many distinct symbols the source emits. A uniform source over 2^k symbols needs exactly k bits each; the interest is in non-uniform sources, where Huffman saves bits." />
      <Slider label="// SKEW" min={0.25} max={1} step={0.05} value={skew} onChange={setSkew}
        help="How unequal the symbol probabilities are (p_i proportional to skew^i). 1 = uniform (high entropy, little to compress); lower = very skewed (low entropy, frequent symbols get short codes)." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSkew(1)} primary>UNIFORM</DemoButton>
        <DemoButton onClick={() => { setN(5); setSkew(0.55); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ENTROPY H" value={m.H.toFixed(3) + " bits"} accent="#34d399" />
        <StatReadout label="AVG LENGTH L" value={m.L.toFixed(3) + " bits"} accent="#fbbf24" />
        <StatReadout label="EFFICIENCY H/L" value={(m.eff * 100).toFixed(1) + "%"} accent="var(--blue-lt)" />
        <StatReadout label="OVERHEAD L-H" value={(m.L - m.H).toFixed(3)} accent="var(--violet-lt)" />
      </div>
      <Legend items={[
        { color: "#3b82f6", label: "symbol (leaf)" },
        { color: "#60a5fa", label: "0 branch" },
        { color: "#a855f7", label: "1 branch" },
        { color: "#34d399", label: "entropy = limit" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        How few bits can you use to store a stream of symbols without losing anything? Shannon's answer
        is the <b>entropy</b> H — the average surprise per symbol — and no lossless code can beat it.
        <b> Huffman coding</b> is the algorithm that gets there: repeatedly merge the two least-likely
        symbols into a subtree, and the path from root to each leaf becomes its codeword. Frequent
        symbols end up near the root with <b>short codes</b>, rare ones get long codes.
      </DemoP>
      <DemoP>
        Compare the two numbers: the average code length <b>L</b> always sits in the band
        <b> H ≤ L &lt; H+1</b> — Huffman is provably optimal among prefix codes and never more than a bit
        from the entropy floor. Skew the distribution toward one dominant symbol and watch entropy
        <i> drop</i> while the tree grows lopsided and L shrinks with it; flatten it to <b>uniform</b>
        and there's nothing to compress (every code becomes the same length). Efficiency H/L is how
        close you are to the theoretical limit.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is the entropy bound made tangible, and it runs underneath everything that stores or moves
        data: Huffman coding is inside JPEG, PNG, MP3, ZIP, and HTTP/2 header compression, usually as the
        final entropy-coding stage (modern codecs use arithmetic/range coding to shave off that last
        fraction of a bit). The same quantity, <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`}>entropy</a>,
        is exactly what a language model's <b>cross-entropy loss</b> measures — bits-per-token <i>is</i> the
        compression rate of the model, which is why "a better model is a better compressor" is literally true.
      </DemoP>
      <DemoP>
        The link to learning is direct: minimizing cross-entropy = finding the code (model) that compresses
        the data best, and the <a href={`${window.__DM_BASE || "../../"}visualize/mutual-information/`}>mutual
        information</a> and <a href={`${window.__DM_BASE || "../../"}visualize/channel-capacity/`}>channel-capacity</a>
        results pin down how much of that information can survive noise or a bottleneck. Source coding
        (compression) and channel coding (reliable transmission) are the two halves of information theory —
        and both are quietly running whenever a model is trained or deployed.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Huffman Coding & Entropy"
      subtitle="Build the optimal compression code and watch its length hug the entropy limit H <= L < H+1."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HuffmanCodingDemo />);
