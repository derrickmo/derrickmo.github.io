// demos/paged-attention.jsx — PagedAttention KV-cache memory management (vLLM).
//
// The KV cache dominates LLM serving memory. Naive serving reserves a contiguous
// chunk for each sequence's MAX possible length, so most of it sits empty
// (internal fragmentation) and few sequences fit at once. PagedAttention borrows
// OS paging: store the KV cache in fixed-size blocks allocated on demand and
// packed anywhere, so memory tracks the tokens actually generated and many more
// sequences fit. Same memory budget, far higher throughput — shown as a memory
// grid plus how many concurrent sequences each scheme serves.

const { useRef: _uR, useState: _uS, useEffect: _uE } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, COLS = 12, ROWS = 5, TOTAL = COLS * ROWS;
const PAL = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#a3e635", "#e879f9", "#38bdf8"];

function PagedAttentionDemo() {
  const canvasRef = _uR(null);
  const dprRef = _uR(1);
  const [mode, setMode] = _uS("paged");
  const [blockSize, setBlockSize] = _uS(4);
  const [nSeq, setNSeq] = _uS(10);
  const [fill, setFill] = _uS(0.3);
  const [, force] = _uS(0);
  const seqRef = _uR(null);

  function gen() {
    seqRef.current = Array.from({ length: 12 }, () => 16 + ((Math.random() * 40) | 0)); // max lengths
    force(v => v + 1);
  }
  if (!seqRef.current) gen();

  const maxLens = seqRef.current.slice(0, nSeq);
  const blocksFor = (len) => Math.ceil(len / blockSize);
  // assign blocks: returns {cells:[{seq,used}], fitContig, fitPaged}
  function layout(m) {
    const cells = new Array(TOTAL).fill(null);
    let ptr = 0, fit = 0;
    for (let s = 0; s < maxLens.length; s++) {
      const curLen = Math.max(1, Math.round(fill * maxLens[s]));
      const curB = blocksFor(curLen);
      const need = m === "contig" ? blocksFor(maxLens[s]) : curB;
      if (ptr + need > TOTAL) break;
      for (let b = 0; b < need; b++) cells[ptr + b] = { seq: s, used: b < curB };
      ptr += need; fit++;
    }
    return { cells, fit };
  }
  const cur = layout(mode);
  const fitContig = layout("contig").fit;
  const fitPaged = layout("paged").fit;
  const usedBlocks = cur.cells.filter(c => c && c.used).length;
  const reservedBlocks = cur.cells.filter(c => c).length;
  const util = reservedBlocks ? usedBlocks / TOTAL : 0;
  const wasted = reservedBlocks - usedBlocks;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("KV-CACHE MEMORY  ·  " + (mode === "contig" ? "contiguous (reserve max length)" : "paged (blocks on demand)") + "  ·  " + blockSize + " tokens/block", 20, 24);

    const ox = 30, oy = 44, cw = (W - 60) / COLS, ch = 30;
    for (let i = 0; i < TOTAL; i++) {
      const r = Math.floor(i / COLS), c = i % COLS, x = ox + c * cw, y = oy + r * ch, cell = cur.cells[i];
      if (!cell) { ctx.fillStyle = "rgba(30,41,59,0.5)"; ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2); }
      else if (cell.used) { ctx.fillStyle = PAL[cell.seq % PAL.length]; ctx.globalAlpha = 0.85; ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2); ctx.globalAlpha = 1; }
      else { // reserved-but-unused (waste) — hatched dim
        ctx.fillStyle = PAL[cell.seq % PAL.length]; ctx.globalAlpha = 0.16; ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2); ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(248,113,113,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, y + ch - 2); ctx.lineTo(x + cw - 2, y + 2); ctx.stroke();
      }
    }
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("solid = tokens in use · hatched = reserved but empty (waste) · dark = free", ox, oy + ROWS * ch + 14);

    // comparison bars
    const by = oy + ROWS * ch + 40, maxFit = Math.max(fitContig, fitPaged, 1);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("CONCURRENT SEQUENCES SERVED (same memory)", 20, by - 4);
    const bar = (yy, label, v, col, hi) => {
      ctx.fillStyle = hi ? "#e2e8f0" : "#94a3b8"; ctx.fillText(label, 20, yy + 12);
      ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(170, yy, W - 240, 16);
      ctx.fillStyle = col; ctx.fillRect(170, yy, (W - 240) * (v / maxFit), 16);
      ctx.fillStyle = "#e2e8f0"; ctx.fillText(String(v), 170 + (W - 240) * (v / maxFit) + 6, yy + 12);
    };
    bar(by + 6, "contiguous", fitContig, "rgba(248,113,113,0.7)", mode === "contig");
    bar(by + 32, "paged", fitPaged, "rgba(52,211,153,0.85)", mode === "paged");
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("memory utilization (" + mode + "): " + (util * 100).toFixed(0) + "%   ·   wasted blocks: " + wasted, 20, by + 60);
  }

  _uE(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SCHEME" tone="violet" value={mode} onChange={setMode}
        options={[{ value: "contig", label: "Contiguous" }, { value: "paged", label: "Paged" }]}
        help="Contiguous reserves each sequence's max length up front (the hatched red waste); paged allocates fixed-size blocks only as tokens are generated and packs them. Flip between them on the same workload and compare the grids." />
      <Slider label="// BLOCK SIZE (tokens)" min={1} max={8} step={1} value={blockSize} onChange={setBlockSize}
        help="KV-cache block granularity. Smaller blocks waste less on the last partial block (less internal fragmentation) but add bookkeeping overhead; vLLM uses ~16 tokens. Watch wasted blocks shrink as you reduce it." />
      <Slider label="// SEQUENCES" min={2} max={12} step={1} value={nSeq} onChange={setNSeq}
        help="How many sequences want to run concurrently. Contiguous hits the memory wall fast (reserving max for each); paged keeps fitting more because it only holds what's been generated." />
      <Slider label="// GENERATION PROGRESS" min={0.1} max={1} step={0.1} value={fill} onChange={setFill}
        help="How far through generation each sequence is (current length ÷ max). Early on (low) most reserved memory is empty, so contiguous waste — and paged's advantage — is largest; near 1 the schemes converge." />
      <DemoButton onClick={gen} primary>RESAMPLE LENGTHS</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CONTIGUOUS" value={fitContig + " seq"} accent="#f87171" />
        <StatReadout label="PAGED" value={fitPaged + " seq"} accent="#34d399" />
      </div>
      <StatReadout label="UTILIZATION" value={(util * 100).toFixed(0) + "%"} accent="#60a5fa" />
      <Legend items={[
        { color: "#60a5fa", label: "tokens in use" },
        { color: "#f87171", label: "reserved, empty (waste)" },
        { color: "#34d399", label: "paged wins" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Serving an LLM, the KV cache is the memory hog, and how you lay it out
        decides how many users you can serve at once. The naive scheme gives each
        sequence one contiguous region sized for its <i>maximum</i> length — but
        early in generation almost all of that is empty, the red-hatched waste in
        the grid. That internal fragmentation means you hit the memory wall with
        only a handful of sequences resident.
      </DemoP>
      <DemoP>
        PagedAttention treats KV memory like virtual memory: fixed-size blocks
        allocated on demand and packed wherever there's room, with a block table
        mapping each sequence to its scattered blocks. Memory now tracks tokens
        actually generated, the waste collapses to at most one partial block per
        sequence, and far more sequences fit — the "concurrent sequences served"
        bar jumps. Slide GENERATION PROGRESS down (early decoding) to see the gap at
        its widest, and shrink BLOCK SIZE to trim the last-block waste.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        PagedAttention (Kwon et al., 2023) is the core idea behind vLLM and modern
        high-throughput inference servers. By eliminating KV-cache fragmentation it
        raises serving throughput several-fold at the same memory, and the block
        table enables copy-on-write sharing — multiple sequences with a common
        prefix (a shared system prompt, or beam-search branches) point at the same
        blocks instead of duplicating them. It's the memory-systems sibling of the
        compute tricks in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kv-cache/`} style={{ color: "#a855f7" }}>KV
        caching</a> and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/quantization/`} style={{ color: "#a855f7" }}>quantization</a>.
      </DemoP>
      <DemoP>
        It's a direct lift of operating-system paging — fixed blocks, on-demand
        allocation, an indirection table — applied to the KV cache instead of RAM,
        trading a little gather/scatter overhead for near-perfect utilization. It
        composes with continuous batching (swap sequences in/out as they finish),
        prefix caching, and KV quantization; together these are why an LLM endpoint
        can serve hundreds of concurrent streams on one GPU.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="EFFICIENCY" title="PagedAttention (KV-cache paging)"
      subtitle="Contiguous KV reservations waste memory on every half-finished sequence; paging packs fixed blocks on demand and fits far more streams in the same GPU."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/llm-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PagedAttentionDemo />);
