// demos/agent-router.jsx — tool routing / dispatch for an agent.
//
// Before an agent acts, a router decides WHICH tool handles the query. Here each
// tool has a keyword profile; the router scores the incoming query against every
// tool, softmaxes the scores into a confidence, and routes to the top tool — but
// only if its confidence clears a threshold. Below it (or when nothing matches),
// it falls back to the general model. Keyword matching stands in for the learned
// classifier / function-calling a real router uses; the dispatch logic is the same.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const TOOLS = [
  { name: "CALC", color: "#60a5fa", kw: ["calculate", "percent", "%", "plus", "minus", "times", "multiply", "divide", "sum", "average", "compute", "square root"] },
  { name: "WEATHER", color: "#34d399", kw: ["weather", "rain", "temperature", "forecast", "sunny", "snow", "tokyo", "cold", "hot", "umbrella"] },
  { name: "CODE", color: "#a855f7", kw: ["run", "python", "code", "function", "script", "execute", "debug", "compile", "javascript"] },
  { name: "CALENDAR", color: "#fbbf24", kw: ["schedule", "meeting", "calendar", "appointment", "remind", "book", "friday", "monday", "3pm", "tomorrow"] },
  { name: "SEARCH", color: "#f472b6", kw: ["who", "when", "where", "latest", "news", "world cup", "capital", "wikipedia", "invented", "founded", "2019", "2023"] },
];
const QUERIES = [
  { value: "math", q: "what is 17% of 240?" },
  { value: "weather", q: "will it rain in Tokyo tomorrow?" },
  { value: "code", q: "run this Python function for me" },
  { value: "cal", q: "schedule a meeting Friday at 3pm" },
  { value: "search", q: "who won the 2019 world cup?" },
  { value: "chat", q: "tell me a fun thought about otters" },
];

function AgentRouterDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [qid, setQid] = _useState("math");
  const [thresh, setThresh] = _useState(0.35);
  const [temp, setTemp] = _useState(0.6);
  const [, force] = _useState(0);

  const query = QUERIES.find(q => q.value === qid).q;
  const ql = query.toLowerCase();
  const raw = TOOLS.map(t => {
    let s = t.kw.reduce((a, k) => a + (ql.includes(k) ? 1 : 0), 0);
    if (t.name === "CALC" && /\d/.test(ql)) s += 1;
    return s;
  });
  // softmax over scores (temperature)
  const ex = raw.map(s => Math.exp(s / temp)), z = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map(e => e / z);
  let best = 0; for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  const conf = probs[best];
  const fallback = raw[best] === 0 || conf < thresh;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";

    // query box
    ctx.fillStyle = "rgba(168,85,247,0.06)"; ctx.strokeStyle = "var(--border)";
    ctx.fillRect(20, 36, W - 40, 40); ctx.strokeStyle = "rgba(168,85,247,0.4)"; ctx.lineWidth = 1; ctx.strokeRect(20, 36, W - 40, 40);
    ctx.fillStyle = "#a855f7"; ctx.font = "9px JetBrains Mono"; ctx.fillText("INCOMING QUERY", 28, 52);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "14px JetBrains Mono"; ctx.fillText('"' + query + '"', 28, 70);

    // router label
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("ROUTER  ·  confidence per tool (softmax of keyword match)", 20, 108);

    // tool cards
    const n = TOOLS.length, cw = (W - 40) / n, cy = 120, ch = 120;
    TOOLS.forEach((t, i) => {
      const x = 20 + i * cw, chosen = !fallback && i === best;
      ctx.fillStyle = chosen ? `${t.color}22` : "rgba(30,41,59,0.5)";
      ctx.fillRect(x + 3, cy, cw - 6, ch);
      ctx.strokeStyle = chosen ? t.color : "rgba(148,163,184,0.2)"; ctx.lineWidth = chosen ? 2.5 : 1;
      ctx.strokeRect(x + 3, cy, cw - 6, ch);
      // bar
      const bh = probs[i] * (ch - 34);
      ctx.fillStyle = t.color; ctx.globalAlpha = chosen ? 0.9 : 0.5;
      ctx.fillRect(x + cw / 2 - 8, cy + ch - 26 - bh, 16, bh); ctx.globalAlpha = 1;
      ctx.fillStyle = chosen ? "#e2e8f0" : "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText(t.name, x + cw / 2, cy + ch - 10);
      ctx.fillText((probs[i] * 100).toFixed(0) + "%", x + cw / 2, cy + ch - 26 - bh - 4);
      ctx.textAlign = "left";
      // routing arrow from query to chosen
      if (chosen) {
        ctx.strokeStyle = t.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + cw / 2, 78); ctx.lineTo(x + cw / 2, cy - 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + cw / 2, cy - 2); ctx.lineTo(x + cw / 2 - 4, cy - 9); ctx.lineTo(x + cw / 2 + 4, cy - 9); ctx.fill();
      }
    });

    // decision
    const dy = cy + ch + 40;
    ctx.textAlign = "left";
    if (fallback) {
      ctx.fillStyle = "#fbbf24"; ctx.font = "600 22px Space Grotesk, JetBrains Mono"; ctx.fillText("→ FALLBACK: general model", 20, dy);
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText(raw[best] === 0 ? "no tool keywords matched" : "top tool confidence " + (conf * 100).toFixed(0) + "% < threshold " + (thresh * 100).toFixed(0) + "%", 20, dy + 18);
    } else {
      ctx.fillStyle = TOOLS[best].color; ctx.font = "600 22px Space Grotesk, JetBrains Mono"; ctx.fillText("→ ROUTE TO: " + TOOLS[best].name, 20, dy);
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("confidence " + (conf * 100).toFixed(0) + "%  (≥ threshold " + (thresh * 100).toFixed(0) + "%)", 20, dy + 18);
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// QUERY" tone="violet" value={qid} onChange={setQid}
        options={QUERIES.map(q => ({ value: q.value, label: q.value }))}
        help="Pick an incoming request. Five are squarely in a tool's wheelhouse; 'chitchat' matches nothing, so the router should fall back to the general model rather than force a bad tool call." />
      <Slider label="// CONFIDENCE THRESHOLD" min={0.2} max={0.7} step={0.05} value={thresh} onChange={setThresh}
        help="The minimum top-tool confidence to actually call a tool. Raise it and borderline queries fall back to the general model (safer, fewer wrong tool calls); lower it and the router commits more eagerly (riskier). The precision/coverage dial of routing." />
      <Slider label="// ROUTER SHARPNESS" min={0.3} max={1.5} step={0.1} value={temp} onChange={setTemp}
        help="Softmax temperature over the tool scores. Sharper (low) = a decisive winner; softer (high) = spread-out confidence, so a clear match may dip below threshold and fall back." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ROUTE" value={fallback ? "FALLBACK" : TOOLS[best].name} accent={fallback ? "#fbbf24" : TOOLS[best].color} />
        <StatReadout label="CONFIDENCE" value={(conf * 100).toFixed(0) + "%"} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "tool confidence" },
        { color: "#fbbf24", label: "fallback (no match)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        An agent with many tools needs a dispatcher: given a request, which tool —
        calculator, web search, code runner, calendar, weather — should handle it?
        The router scores the query against each tool's profile, turns those scores
        into confidences with a softmax, and picks the top one. Switch between the
        preset queries and watch the bars shift: a math question lights up CALC, a
        Tokyo-rain question lights up WEATHER, and the chosen tool gets the routing
        arrow.
      </DemoP>
      <DemoP>
        The crucial part is knowing when <i>not</i> to route. The "chitchat" query
        matches no tool, and the CONFIDENCE THRESHOLD catches that: if the best
        tool's confidence is too low, the router falls back to the general model
        instead of forcing a wrong tool call. Raise the threshold and even decent
        matches fall back (cautious); lower it and the router commits aggressively.
        That precision-vs-coverage tradeoff — and a good fallback — is what
        separates a useful router from one that confidently does the wrong thing.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Tool routing is the dispatch layer of agentic systems — the decision that
        precedes the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/react-agent/`} style={{ color: "#a855f7" }}>ReAct
        act step</a>. In practice the router is the model's own function-calling
        (it emits which tool + arguments), a small intent classifier over query
        embeddings, or a cheap LLM "selector". The same pattern scales up to
        plan-and-execute agents (route each sub-task), model routing (send easy
        queries to a small model, hard ones to a big one), and MoE-style expert
        selection.
      </DemoP>
      <DemoP>
        The failure modes the demo surfaces are the real ones: over-eager routing
        fires the wrong tool on ambiguous input, and missing a fallback turns
        out-of-scope requests into nonsense tool calls. Production routers pair the
        confidence threshold with a default path, log mis-routes to improve the
        classifier, and lean on{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/guardrails/`} style={{ color: "#a855f7" }}>guardrails</a>{" "}
        to catch what slips through. Good routing is mostly about calibrated
        confidence and a graceful escape hatch.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="Agent Tool Router"
      subtitle="Which tool handles this query? Score the request against each tool, route to the top one above a confidence threshold — and fall back to the model when nothing fits."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AgentRouterDemo />);
