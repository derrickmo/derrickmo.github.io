// demos/react-agent.jsx — the ReAct (Reason + Act) agent loop.
//
// An agent answers a question by interleaving Thought -> Action (a tool call) ->
// Observation, step by step, until it can answer. Tools ground the model in
// facts and arithmetic it can't do reliably from weights alone. The traces here
// are worked examples (scripted ideal tool sequences), but a per-step RELIABILITY
// knob injects missteps: with reliability < 1 the agent may call the wrong tool,
// get a junk observation, and the whole chain derails — which is why real agents
// wrap the loop in verification, retries, and guardrails.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, ControlGroup,
} = window;

const TASKS = [
  {
    value: "capital", label: "Population of a capital", q: "What is the population of the capital of France?",
    steps: [
      { thought: "I need the capital of France first.", tool: "SEARCH", arg: "capital of France", obs: "Paris" },
      { thought: "Now I need Paris's population.", tool: "SEARCH", arg: "population of Paris", obs: "≈ 2,100,000" },
    ],
    answer: "The capital is Paris, population ≈ 2.1 million.",
  },
  {
    value: "churn", label: "Multi-step arithmetic", q: "We have 1,240 users with 17% monthly churn. How many remain after one month?",
    steps: [
      { thought: "First compute how many churn: 17% of 1240.", tool: "CALC", arg: "0.17 * 1240", obs: "210.8" },
      { thought: "Subtract churned from the total.", tool: "CALC", arg: "1240 - 210.8", obs: "1029.2" },
    ],
    answer: "About 1,029 users remain.",
  },
  {
    value: "paper", label: "Multi-hop lookup", q: "Who wrote the paper that introduced the Transformer, and in what year?",
    steps: [
      { thought: "Identify the paper that introduced the Transformer.", tool: "SEARCH", arg: "paper that introduced the Transformer", obs: "\"Attention Is All You Need\" (2017)" },
      { thought: "Find that paper's authors.", tool: "SEARCH", arg: "authors of Attention Is All You Need", obs: "Vaswani, Shazeer, Parmar, et al." },
    ],
    answer: "Vaswani et al., 2017 (\"Attention Is All You Need\").",
  },
];

function ReactAgentDemo() {
  const [taskId, setTaskId] = _useState("capital");
  const [reliability, setReliability] = _useState(0.85);
  const [revealed, setRevealed] = _useState(0);
  const [running, setRunning] = _useState(false);
  const traceRef = _useRef(null);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const task = TASKS.find(t => t.value === taskId);

  // compute a trace: roll a misfire at each action step
  function buildTrace() {
    let missAt = -1;
    for (let i = 0; i < task.steps.length; i++) {
      if (Math.random() > reliability) { missAt = i; break; }
    }
    traceRef.current = { missAt, nExec: missAt < 0 ? task.steps.length : missAt + 1 };
  }
  if (!traceRef.current) buildTrace();

  function reset(rebuild = true) { if (rebuild) buildTrace(); setRevealed(0); setRunning(false); }
  // rebuild + reset whenever task or reliability changes
  _useEffect(() => { buildTrace(); setRevealed(0); setRunning(false); /* eslint-disable-next-line */ }, [taskId, reliability]);

  const trace = traceRef.current;
  const totalReveal = trace.nExec + 1;  // steps + final line

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 800) {
        lastRef.current = now;
        setRevealed(r => { if (r >= totalReveal) { setRunning(false); return r; } return r + 1; });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, totalReveal]);

  const succeeded = trace.missAt < 0;
  const finalShown = revealed >= totalReveal;

  const cards = [];
  for (let i = 0; i < trace.nExec && i < revealed; i++) {
    const s = task.steps[i];
    const missed = i === trace.missAt;
    cards.push(
      <div key={i} style={{ border: `1px solid ${missed ? "#f87171" : "var(--border)"}`, background: missed ? "rgba(248,113,113,0.08)" : "rgba(148,163,184,0.04)", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
        <div className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 6 }}>STEP {i + 1}</div>
        <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: "var(--violet-lt)" }}>Thought · </span><i>{s.thought}</i></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <span className="t-mono-s" style={{ color: missed ? "#f87171" : "var(--blue-lt)", border: `1px solid ${missed ? "#f87171" : "var(--blue-lt)"}`, borderRadius: 4, padding: "1px 6px" }}>{s.tool}</span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--white)" }}>{missed ? "(wrong call)" : s.arg}</span>
        </div>
        <div style={{ fontSize: 13 }}>
          <span style={{ color: missed ? "#f87171" : "#34d399" }}>Observation · </span>
          <span style={{ fontFamily: "var(--f-mono)" }}>{missed ? "irrelevant / junk result" : s.obs}</span>
        </div>
      </div>
    );
  }

  const stage = (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(168,85,247,0.06)" }}>
        <span className="t-mono-s" style={{ color: "var(--violet-lt)" }}>QUESTION</span>
        <div style={{ fontSize: 14, marginTop: 4 }}>{task.q}</div>
      </div>
      {cards}
      {revealed === 0 && <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>Press RUN to watch the agent reason and act, one step at a time.</div>}
      {finalShown && (
        <div style={{ marginTop: 4, padding: "10px 12px", borderRadius: 8, border: `1px solid ${succeeded ? "#34d399" : "#f87171"}`, background: `${succeeded ? "#34d399" : "#f87171"}14` }}>
          <div className="t-mono-s" style={{ color: succeeded ? "#34d399" : "#f87171" }}>{succeeded ? "✓ ANSWER" : "✗ DERAILED — a bad tool call poisoned the chain"}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{succeeded ? task.answer : "The agent acted on a junk observation and can't recover. In production this is where a verifier, a retry, or a guardrail catches it."}</div>
        </div>
      )}
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// TASK" tone="violet" value={taskId} onChange={setTaskId}
        options={TASKS.map(t => ({ value: t.value, label: t.label }))}
        help="Each task needs tools the model can't do reliably alone — a fact lookup or exact arithmetic — and takes more than one step, so the agent has to chain reasoning and actions." />
      <Slider label="// AGENT RELIABILITY" min={0.4} max={1} step={0.05} value={reliability} onChange={setReliability} tone="violet"
        help="Per-step probability the agent picks the RIGHT tool and query. Below 1, each step is a chance to misfire; since errors compound over a multi-step chain, even a small per-step slip makes long tasks fail often. Lower it and re-run a few times." />
      <DemoButton onClick={() => { if (finalShown) { buildTrace(); setRevealed(0); } setRunning(r => !r); }} primary>{running ? "PAUSE" : (finalShown ? "RUN AGAIN" : "RUN")}</DemoButton>
      <DemoButton onClick={() => setRevealed(r => Math.min(totalReveal, r + 1))}>STEP</DemoButton>
      <DemoButton onClick={() => reset(true)}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STEPS" value={Math.min(revealed, trace.nExec) + "/" + task.steps.length} />
        <StatReadout label="OUTCOME" value={!finalShown ? "…" : (succeeded ? "SOLVED" : "FAILED")} accent={!finalShown ? "#94a3b8" : (succeeded ? "#34d399" : "#f87171")} />
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A bare language model has to answer in one forward pass from memorized
        weights — fine for "what's the capital of France", hopeless for exact
        arithmetic or fresh facts. <b>ReAct</b> turns answering into a loop: the
        model writes a <i>Thought</i>, takes an <i>Action</i> (calls a tool like
        search or a calculator), reads the <i>Observation</i>, and repeats until it
        can answer. Each step here shows that cycle; tools supply the grounded
        facts and math the model shouldn't guess.
      </DemoP>
      <DemoP>
        Now lower AGENT RELIABILITY and re-run. Because the steps chain, errors
        compound: a single wrong tool call returns a junk observation, and every
        later step reasons over poison — the trace turns red and derails. A
        two-step task at 0.85 reliability already fails about a quarter of the
        time, and longer chains fall off a cliff. That compounding is the central
        problem of agent engineering, and the reason the loop gets wrapped in
        verification and retries.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        ReAct (Yao et al., 2022) is the backbone of tool-using agents — the pattern
        under function calling, tool routing, and frameworks like LangChain agents
        and the OpenAI/Anthropic tool-use loops. Interleaving reasoning with
        external actions is what lets a model browse, run code, query a database,
        or call an API instead of hallucinating the result. The same loop drives{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/rag-chunking/`} style={{ color: "#a855f7" }}>retrieval-augmented</a>{" "}
        answering, where the "tool" is a vector search.
      </DemoP>
      <DemoP>
        The reliability knob is the whole ballgame in practice. Compounding
        per-step error is why agents pair ReAct with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/reflection/`} style={{ color: "#a855f7" }}>self-correction</a>,{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/self-consistency/`} style={{ color: "#a855f7" }}>voting</a>,
        and <a href={`${window.__DM_BASE || "../../"}visualize/guardrails/`} style={{ color: "#a855f7" }}>guardrails</a>,
        keep chains short, and prefer constrained tool schemas over free-form
        calls. An agent is only as reliable as the product of its steps — so
        shrinking that product, step by step, is the job.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="ReAct — Reason + Act"
      subtitle="The tool-using agent loop: Thought → Action → Observation, repeat. Watch a worked trace — then drop the reliability and see errors compound."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ReactAgentDemo />);
