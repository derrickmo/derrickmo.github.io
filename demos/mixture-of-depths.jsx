// demos/mixture-of-depths.jsx — per-token dynamic compute (Mixture-of-Depths).
//
// In a normal transformer every token flows through every block's full compute.
// Mixture-of-Depths (Raposo et al., 2024) puts a tiny ROUTER in front of each
// block that, under a fixed CAPACITY, selects only the top-scoring tokens to be
// processed; the rest take the residual skip with zero compute for that block.
// Because capacity is fixed, the FLOPs are fixed and lower than dense — and if
// the router spends its budget on the tokens that actually need depth, quality
// barely moves. If it routes badly (or capacity is too tight for the hard
// tokens), the underserved tokens degrade.
//
// The routing simulation is exact: each layer fills its capacity with the
// highest-scoring tokens by *unmet compute need*. The per-token "need" is a
// stylized model (a few hard tokens need many blocks, most need few), which is
// the qualitative finding behind MoD and early-exit. "Quality" = mean fraction
// of each token's required depth that it actually received.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const T = 28;   // tokens
const L = 8;    // transformer blocks
const CW = 330, CH = 210;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// per-token required depth: most tokens easy (few blocks), a few hard (many)
function buildNeeds(seed) {
  const rand = rng(seed), need = new Array(T);
  for (let i = 0; i < T; i++) {
    const d = Math.pow(rand(), 1.8);         // skew toward easy
    need[i] = Math.round(d * L);             // 0..L blocks needed
  }
  return need;
}

// route: for each layer fill `cap` slots with the top tokens by a score that
// blends unmet need (good routing) with noise (bad routing), per routerQuality.
function route(need, cap, rq, seed) {
  const rand = rng(seed * 7 + 1);
  const processed = new Array(T).fill(0);
  const grid = Array.from({ length: L }, () => new Array(T).fill(false));
  for (let l = 0; l < L; l++) {
    const scored = [];
    for (let i = 0; i < T; i++) {
      const unmet = Math.max(0, need[i] - processed[i]) / L;
      const score = rq * unmet + (1 - rq) * rand();
      scored.push([score, i]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < Math.min(cap, T); k++) { const i = scored[k][1]; grid[l][i] = true; processed[i]++; }
  }
  const q = [];
  for (let i = 0; i < T; i++) q[i] = need[i] === 0 ? 1 : Math.min(1, processed[i] / need[i]);
  const quality = q.reduce((a, b) => a + b, 0) / T;
  return { grid, processed, q, quality };
}

function MixtureOfDepthsDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [capFrac, setCapFrac] = _useState(0.5);
  const [rq, setRq] = _useState(0.85);
  const [seed, setSeed] = _useState(4);

  const need = _useMemo(() => buildNeeds(seed * 131 + 3), [seed]);
  const cap = Math.max(1, Math.round(capFrac * T));
  const res = _useMemo(() => route(need, cap, rq, seed), [need, cap, rq, seed]);
  const randRef = _useMemo(() => route(need, cap, 0, seed), [need, cap, seed]); // random-routing reference

  const compute = (cap * L) / (T * L); // = cap/T
  const underserved = res.q.filter(x => x < 0.999).length;

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const padL = 30, padT = 24, gap = 6;
    const cw = (CW - padL - 8) / T;
    const ch = 16;
    // difficulty strip
    const maxNeed = Math.max(1, ...need);
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "right";
    ctx.fillText("need", padL - 4, padT - 4);
    for (let i = 0; i < T; i++) {
      const t = need[i] / maxNeed;
      ctx.fillStyle = `rgba(251,191,36,${0.25 + 0.75 * t})`;
      ctx.fillRect(padL + i * cw + 0.5, padT - 14, cw - 1, 10);
    }
    // grid: rows = layers
    for (let l = 0; l < L; l++) {
      const y = padT + gap + l * ch;
      ctx.fillStyle = "#94a3b8"; ctx.textAlign = "right"; ctx.font = "8px monospace";
      ctx.fillText("L" + (l + 1), padL - 4, y + ch - 4);
      for (let i = 0; i < T; i++) {
        const x = padL + i * cw;
        if (res.grid[l][i]) { ctx.fillStyle = "#a855f7"; }
        else { ctx.fillStyle = "rgba(100,116,139,0.28)"; }
        ctx.fillRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
      }
    }
    // satisfied row
    const sy = padT + gap + L * ch + 4;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "right"; ctx.fillText("ok?", padL - 4, sy + 9);
    for (let i = 0; i < T; i++) {
      const x = padL + i * cw;
      const qi = res.q[i];
      ctx.fillStyle = qi >= 0.999 ? "#34d399" : qi >= 0.6 ? "#fbbf24" : "#f87171";
      ctx.fillRect(x + 0.5, sy, cw - 1, 8);
    }
    ctx.fillStyle = "#64748b"; ctx.textAlign = "left"; ctx.font = "8px monospace";
    ctx.fillText("tokens ->", padL, CH - 4);
  }, [need, res]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>PER-BLOCK ROUTING — processed (violet) vs skipped (gray), per token per layer</span>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.0 : 1.35), height: CH * (mobile ? 1.0 : 1.35), borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "processed (full compute)", color: "#a855f7" },
        { label: "skipped (residual only)", color: "#64748b" },
        { label: "token need", color: "#fbbf24" },
        { label: "underserved", color: "#f87171" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// CAPACITY" min={0.125} max={1} step={0.125} value={capFrac} onChange={setCapFrac}
        suffix={" (" + cap + "/" + T + ")"} tone="violet"
        help="Fraction of tokens each block is allowed to process. This fixes the FLOPs: lower capacity = cheaper but fewer tokens get depth. At 100% it's a normal dense transformer." />
      <Slider label="// ROUTER QUALITY" min={0} max={1} step={0.05} value={rq} onChange={setRq} tone="violet"
        help="How well the router spends its budget. 1 = always pick the tokens with the most unmet compute need (a well-trained router); 0 = pick at random (an untrained router that wastes capacity on easy tokens)." />
      <Slider label="// SEQUENCE" min={1} max={9} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample which tokens are hard. A few tokens genuinely need many blocks; most need only a couple — the structure MoD exploits." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="COMPUTE vs DENSE" value={(compute * 100).toFixed(0) + "%"} accent="var(--violet-lt)" />
        <StatReadout label="QUALITY" value={(res.quality * 100).toFixed(0) + "%"} accent={res.quality > 0.95 ? "#34d399" : res.quality > 0.8 ? "#fbbf24" : "#f87171"} />
        <StatReadout label="RANDOM-ROUTE QUALITY" value={(randRef.quality * 100).toFixed(0) + "%"} accent="var(--dim)" />
        <StatReadout label="UNDERSERVED TOKENS" value={underserved + " / " + T} accent={underserved ? "#fbbf24" : "#34d399"} />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A dense transformer spends the <i>same</i> compute on every token — the
        comma and the crux of the sentence both run every block. But tokens aren't
        equally hard. <b>Mixture-of-Depths</b> gives each block a router and a
        fixed <b>capacity</b>: only the top-scoring tokens get processed (violet);
        the rest skip the block via the residual and cost nothing. The amber strip
        on top is each token's true compute need; the bottom strip is whether it
        ended up served.
      </DemoP>
      <DemoP>
        The magic is in <b>router quality</b>. With a good router, dropping capacity
        to 50% leaves quality almost untouched — it simply stops processing the easy
        tokens it didn't need to. Spin the router quality down to 0 and the same
        capacity now wastes slots on easy tokens, starving the few hard ones: the
        bottom strip lights up red even though compute is unchanged. Compare your
        QUALITY against the RANDOM-ROUTE reference to see exactly what smart routing
        buys at a fixed FLOPs budget.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Mixture-of-Depths is conditional computation along the <i>depth</i> axis,
        and it pairs naturally with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/moe/`} style={{ color: "#a855f7" }}>mixture-of-experts</a>,
        which is conditional computation along the <i>width</i> axis (route to a few
        experts instead of a few blocks). Both spend a fixed budget where it
        matters. It's also the per-token cousin of the whole-model{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/model-cascade/`} style={{ color: "#a855f7" }}>cascade /
        early-exit</a> idea and of token-level{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/speculative-decoding/`} style={{ color: "#a855f7" }}>speculative
        decoding</a>.
      </DemoP>
      <DemoP>
        The fixed-capacity top-k is the key engineering trick: it keeps the compute
        graph static (so it batches and compiles cleanly) while still being
        input-dependent, unlike early-exit which gives ragged, hard-to-batch depths.
        The cost is a learned router that must be trained jointly — a bad router, as
        the slider shows, throws the efficiency away. The same "is this token worth
        the compute?" signal connects to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kv-cache-eviction/`} style={{ color: "#a855f7" }}>KV-cache
        eviction</a>.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="Mixture-of-Depths"
      subtitle="Per-token dynamic compute: a router picks which tokens each block processes under a fixed capacity. Smart routing keeps quality at a fraction of the FLOPs."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MixtureOfDepthsDemo />);
