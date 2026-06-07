// lessons/custom-autograd.jsx — Module 15-01 - Custom Autograd (Build the Engine).
// Full on-site flagship lesson. Loaded by /learn/pytorch-internals/custom-autograd/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Build a minimal reverse-mode autodiff engine (micrograd-
// style): a Value node that records operations, per-op local backward, and a topological backward pass.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn,
} = window;

function LessonContent() {
  return (
    <>
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            When you call <code>loss.backward()</code> in PyTorch, gradients appear on every parameter as if
            by magic. There is no magic - just a small, elegant engine that records each operation as you run
            it and then replays the chain rule in reverse. The best way to truly understand a framework is to
            build that engine yourself, and it fits in about forty lines.
          </P>
          <P>
            We build a scalar autograd engine in the spirit of micrograd: a value that remembers how it was
            computed, a local backward rule per operation, and a topological backward pass that wires them
            together. Then we train a tiny neural network with nothing but what we wrote.
          </P>
        </div>
      </section>

      {/* ── Part 0 — What autograd does ── */}
      <LessonSection n="0" title="Record, Then Replay" tag="// REVERSE-MODE AD">
        <P>
          Reverse-mode autodiff works in two phases. The forward pass computes the output and, as a side
          effect, builds a graph: every value remembers which values produced it and how. The backward pass
          walks that graph from the output back to the inputs, multiplying local derivatives by the chain rule
          and accumulating a gradient on each node.
        </P>
      </LessonSection>

      {/* ── Part 1 — The Value node ── */}
      <LessonSection n="1" title="A Value That Remembers" tag="// THE NODE">
        <P>
          The core object holds its number, a slot for its gradient, the set of values it came from, and a
          closure that knows how to push gradient to those parents. That closure - <code>_backward</code> - is
          the whole trick: each operation, when it runs, installs the rule for sending gradient backward
          through itself.
        </P>
        <CodeBlock lang="python">{`class Value:
    def __init__(self, data, _children=()):
        self.data = data
        self.grad = 0.0
        self._prev = set(_children)
        self._backward = lambda: None    # how to send grad to _prev`}</CodeBlock>
      </LessonSection>

      {/* ── Part 2 — Operations carry their derivative ── */}
      <LessonSection n="2" title="Each Op Knows Its Local Rule" tag="// ADD, MUL, TANH">
        <P>
          Define each operation to do two things: compute the forward result, and set the new value's
          <code>_backward</code> to distribute incoming gradient to its inputs by that op's local derivative.
          Addition passes gradient through unchanged; multiplication scales each input's gradient by the other
          input; tanh scales by <MathInline>{`1 - \\tanh^2`}</MathInline>.
        </P>
        <MathBlock>{`\\frac{\\partial (a b)}{\\partial a} = b, \\qquad \\frac{\\partial \\tanh(x)}{\\partial x} = 1 - \\tanh^2(x)`}</MathBlock>
        <CodeBlock lang="python">{`def __mul__(self, other):
    out = Value(self.data * other.data, (self, other))
    def _backward():
        self.grad  += other.data * out.grad     # chain rule
        other.grad += self.data  * out.grad
    out._backward = _backward
    return out

def tanh(self):
    t = math.tanh(self.data)
    out = Value(t, (self,))
    def _backward():
        self.grad += (1 - t*t) * out.grad
    out._backward = _backward
    return out`}</CodeBlock>
        <KeyInsight title="Note the += accumulation">
          Gradients are added, not assigned, because a value used in several places receives gradient from
          each. That single <code>+=</code> is how the engine handles a node feeding multiple consumers - and
          forgetting it is the classic autograd bug.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — The backward pass ── */}
      <LessonSection n="3" title="Backward in Topological Order" tag="// CHAIN IT ALL">
        <P>
          To run backward correctly, a node's gradient must be complete before it pushes to its parents - so we
          process nodes in reverse topological order. Seed the output's gradient at 1 (the derivative of the
          loss with respect to itself), then call each node's <code>_backward</code> from the output back to the
          leaves.
        </P>
        <CodeBlock lang="python">{`def backward(self):
    topo, seen = [], set()
    def build(v):
        if v not in seen:
            seen.add(v)
            for p in v._prev: build(p)
            topo.append(v)
    build(self)
    self.grad = 1.0                       # d(self)/d(self)
    for v in reversed(topo):
        v._backward()                     # push grad to parents`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — Train with it ── */}
      <LessonSection n="4" title="Train a Tiny Net" tag="// IT ACTUALLY LEARNS">
        <P>
          That is a complete autograd engine. Build a neuron as a sum of <code>weight * input</code> values
          through a tanh, define a squared-error loss as more <code>Value</code> operations, call
          <code>backward()</code>, and step the parameters down their gradients. The same loop you use in
          PyTorch, running on code you wrote.
        </P>
        <CodeBlock lang="python">{`for _ in range(100):
    loss = sum((model(x) - y)**2 for x, y in data)
    for p in params: p.grad = 0.0
    loss.backward()
    for p in params: p.data -= 0.05 * p.grad   # gradient descent`}</CodeBlock>
        <TryThis title="Print the graph">
          After one forward pass, walk <code>_prev</code> from the loss and print the operations. You are
          looking at the computational graph PyTorch builds for you - the same structure, just visible. Once
          you have seen it, autograd stops being magic for good.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built a reverse-mode autodiff engine: a Value node that records its parents and a backward
          closure, per-operation local derivative rules, a topologically-ordered backward pass, and a training
          loop that uses nothing but your own code.
        </P>
        <P>
          Autograd records a graph on the forward pass and replays the chain rule on the backward pass. Each
          operation installs a local rule that accumulates gradient into its inputs; a reverse topological sweep
          chains them from output to leaves. PyTorch does exactly this, generalized to tensors and accelerated
          on hardware - but the engine you wrote is the whole idea, and now there is nothing mysterious about
          <code>.backward()</code>.
        </P>
        <Warn title="The one thing to remember">
          A framework's autograd is just operations that each remember how to send gradient backward, replayed
          in reverse order - record on the way forward, chain-rule on the way back.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
