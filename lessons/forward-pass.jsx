// lessons/forward-pass.jsx — Module 05-05 - Forward Pass and Computational Graphs.
// Full on-site flagship lesson. Loaded by /learn/neural-nets/forward-pass/index.html
// AFTER lesson-app.jsx, so all helpers are on window. Sets __DM_LESSON_CONTENT.
// The forward pass builds a computational graph; backprop is just the chain rule
// walked backward over it. We build an MLP forward pass, derive and code the backward
// pass by hand in NumPy, train it, and verify the gradients against PyTorch autograd.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn, Diagram, NeuralNet,
} = window;

function LessonContent() {
  return (
    <>
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            Every neural network is a chain of simple operations - multiply by a weight
            matrix, add a bias, apply a nonlinearity, repeat - ending in a single scalar
            loss. Running the network forward to compute that loss is the <em>forward
            pass</em>. The sequence of operations it performs, with the intermediate
            values it produces, forms a <em>computational graph</em>.
          </P>
          <P>
            That graph is the whole trick behind training. Once you have it, getting the
            gradient of the loss with respect to every weight is just the chain rule
            walked backward through it - backpropagation. In this lesson we build the
            forward pass of a two-layer network by hand in NumPy, derive the backward
            pass node by node, train it on a toy problem, and check our gradients against
            PyTorch's autograd. No magic, no framework - just the graph.
          </P>
          <Diagram caption="A two-layer MLP: each arrow is an operation recorded on the forward pass and differentiated on the backward pass.">
            <NeuralNet layers={[2, 5, 5, 2]} width={480} height={260} mode="dark" glow={0.8} />
          </Diagram>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// IMPORTS + DATA">
        <P>
          We import NumPy for the from-scratch implementation and PyTorch only to check
          our gradients at the end. We fix seeds for reproducibility and build a tiny
          two-class dataset that is not linearly separable - the classic XOR pattern -
          so the network actually needs its hidden layer.
        </P>
        <CodeBlock lang="python">{`import numpy as np
import torch

np.random.seed(0)
torch.manual_seed(0)

# XOR-style data: 4 clusters, two classes on the diagonals
N = 200
X = np.random.randn(N, 2) * 0.5
y = ((X[:, 0] > 0) ^ (X[:, 1] > 0)).astype(int)   # 0/1 labels
X[y == 1] += 0.0                                   # already separated by quadrant`}</CodeBlock>
        <P>
          Two input features, two classes, and a pattern that no single straight line can
          separate. A model with one hidden layer and a nonlinearity can carve it; a bare
          linear model cannot. That gap is exactly what makes the hidden layer - and its
          gradients - worth deriving carefully.
        </P>
      </LessonSection>

      {/* ── Part 1 — From Scratch ── */}
      <LessonSection n="1" title="From Scratch" tag="// MATH + NUMPY">
        <H3>The forward pass</H3>
        <P>
          Our network is two linear layers with a ReLU in between and a softmax at the
          end. Writing <MathInline>{`x`}</MathInline> for an input row, the forward pass is:
        </P>
        <MathBlock>{`\\begin{aligned}
z_1 &= x W_1 + b_1 \\\\
h &= \\mathrm{ReLU}(z_1) = \\max(0, z_1) \\\\
z_2 &= h W_2 + b_2 \\\\
p &= \\mathrm{softmax}(z_2)
\\end{aligned}`}</MathBlock>
        <P>
          The loss is the cross-entropy between the predicted distribution
          <MathInline>{`p`}</MathInline> and the true class. Each line above is a node in
          the computational graph, and each produces an intermediate value
          (<MathInline>{`z_1, h, z_2, p`}</MathInline>) that we must keep around - the
          backward pass will need them.
        </P>
        <CodeBlock lang="python">{`def relu(z):
    return np.maximum(0, z)

def softmax(z):
    z = z - z.max(axis=1, keepdims=True)        # numerical stability
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)

def forward(X, params):
    W1, b1, W2, b2 = params
    z1 = X @ W1 + b1
    h  = relu(z1)
    z2 = h @ W2 + b2
    p  = softmax(z2)
    cache = (X, z1, h, z2, p)                    # keep for the backward pass
    return p, cache

def cross_entropy(p, y):
    return -np.log(p[np.arange(len(y)), y] + 1e-12).mean()`}</CodeBlock>
        <KeyInsight title="The cache is the graph">
          The tuple we stash in <code>cache</code> is the computational graph made
          concrete: the inputs and outputs of every node, saved on the way forward so the
          backward pass can reuse them instead of recomputing. This is exactly what
          frameworks like PyTorch store when a tensor has <code>requires_grad=True</code>.
        </KeyInsight>

        <H3>Deriving the backward pass</H3>
        <P>
          Backprop applies the chain rule from the loss back to each parameter. We need
          one local gradient per node. The beautiful starting point: the gradient of
          softmax-plus-cross-entropy collapses to a single clean expression.
        </P>
        <MathBlock>{`\\frac{\\partial \\mathcal{L}}{\\partial z_2} = p - y_{\\text{onehot}}`}</MathBlock>
        <P>
          From that error signal at <MathInline>{`z_2`}</MathInline>, every other gradient
          follows by the chain rule. A linear layer <MathInline>{`z = hW + b`}</MathInline>
          sends its incoming gradient to its inputs and parameters like this:
        </P>
        <MathBlock>{`\\frac{\\partial \\mathcal{L}}{\\partial W} = h^\\top \\frac{\\partial \\mathcal{L}}{\\partial z}, \\quad
\\frac{\\partial \\mathcal{L}}{\\partial b} = \\sum \\frac{\\partial \\mathcal{L}}{\\partial z}, \\quad
\\frac{\\partial \\mathcal{L}}{\\partial h} = \\frac{\\partial \\mathcal{L}}{\\partial z} W^\\top`}</MathBlock>
        <P>
          And ReLU just passes the gradient through wherever its input was positive and
          blocks it elsewhere: <MathInline>{`\\partial \\mathcal{L}/\\partial z_1 = (\\partial \\mathcal{L}/\\partial h) \\odot \\mathbb{1}[z_1 > 0]`}</MathInline>.
          Put together, the backward pass is a mirror image of the forward one:
        </P>
        <CodeBlock lang="python">{`def backward(cache, y, params):
    X, z1, h, z2, p = cache
    W1, b1, W2, b2 = params
    n = len(y)

    # softmax + cross-entropy gradient
    dz2 = p.copy()
    dz2[np.arange(n), y] -= 1
    dz2 /= n

    # layer 2 (linear)
    dW2 = h.T @ dz2
    db2 = dz2.sum(0)
    dh  = dz2 @ W2.T

    # ReLU
    dz1 = dh * (z1 > 0)

    # layer 1 (linear)
    dW1 = X.T @ dz1
    db1 = dz1.sum(0)
    return [dW1, db1, dW2, db2]`}</CodeBlock>
        <Aside title="Why the shapes line up">
          Notice each gradient has the same shape as the thing it differentiates:
          <code>dW2</code> matches <code>W2</code>, <code>dh</code> matches <code>h</code>.
          That is not a coincidence - a gradient lives in the same space as its variable.
          It is also the cheapest sanity check you have when debugging backprop: print the
          shapes.
        </Aside>
      </LessonSection>

      {/* ── Part 2 — Assembly ── */}
      <LessonSection n="2" title="Assembly" tag="// A TINY MODULE">
        <P>
          Let us wrap the forward and backward passes into one object with initialized
          parameters. He initialization keeps the activation scale sensible through the
          ReLU. This little class is, in miniature, exactly what an
          <code>nn.Module</code> is: parameters plus a forward, with the backward handled
          for you (here, by us).
        </P>
        <CodeBlock lang="python">{`class MLP:
    def __init__(self, d_in, d_hid, d_out):
        self.params = [
            np.random.randn(d_in, d_hid) * np.sqrt(2 / d_in), np.zeros(d_hid),  # W1, b1
            np.random.randn(d_hid, d_out) * np.sqrt(2 / d_hid), np.zeros(d_out) # W2, b2
        ]

    def loss_and_grads(self, X, y):
        p, cache = forward(X, self.params)
        loss = cross_entropy(p, y)
        grads = backward(cache, y, self.params)
        return loss, grads`}</CodeBlock>
        <P>
          The PyTorch version of this whole class is four lines - two
          <code>nn.Linear</code> layers and an <code>F.relu</code> - and you never write
          <code>backward</code> at all. But you now know precisely what those four lines
          hide.
        </P>
      </LessonSection>

      {/* ── Part 3 — Training ── */}
      <LessonSection n="3" title="Training" tag="// GRADIENT DESCENT">
        <P>
          Training is the forward pass, the backward pass, and a gradient-descent step,
          looped. We use plain SGD: subtract a small multiple of each gradient from each
          parameter.
        </P>
        <CodeBlock lang="python">{`net = MLP(2, 16, 2)
lr = 0.5

for epoch in range(2000):
    loss, grads = net.loss_and_grads(X, y)
    for p, g in zip(net.params, grads):
        p -= lr * g                       # SGD step (in place)
    if epoch % 400 == 0:
        print(f"epoch {epoch:4d}  loss {loss:.4f}")

# final accuracy
p, _ = forward(X, net.params)
acc = (p.argmax(1) == y).mean()
print("train accuracy:", acc)`}</CodeBlock>
        <P>
          The loss falls steadily and the network reaches near-perfect accuracy on the
          XOR pattern - something the same model without the ReLU (or without the hidden
          layer) cannot do. The hidden layer bends the decision boundary; backprop is what
          taught it how.
        </P>
        <TryThis title="Break it on purpose">
          Set the hidden width to 1, or delete the ReLU (return <code>z1</code> directly).
          Watch the loss plateau well above zero - the network collapses to a linear model
          and XOR becomes unsolvable. The nonlinearity is not decoration.
        </TryThis>
      </LessonSection>

      {/* ── Part 4 — Evaluation ── */}
      <LessonSection n="4" title="Evaluation" tag="// GRADIENT CHECK">
        <P>
          How do we know our hand-derived gradients are correct? Two independent checks.
          First, a numerical gradient: nudge each parameter by a tiny
          <MathInline>{`\\varepsilon`}</MathInline> and measure how the loss changes. It
          should match our analytic gradient to many decimal places.
        </P>
        <MathBlock>{`\\frac{\\partial \\mathcal{L}}{\\partial \\theta_i} \\approx \\frac{\\mathcal{L}(\\theta_i + \\varepsilon) - \\mathcal{L}(\\theta_i - \\varepsilon)}{2\\varepsilon}`}</MathBlock>
        <CodeBlock lang="python">{`def numeric_grad(net, X, y, eps=1e-5):
    loss, grads = net.loss_and_grads(X, y)
    for pi, p in enumerate(net.params):
        flat = p.ravel()
        for i in range(min(5, flat.size)):      # spot-check a few entries
            orig = flat[i]
            flat[i] = orig + eps; lp, _ = net.loss_and_grads(X, y)
            flat[i] = orig - eps; lm, _ = net.loss_and_grads(X, y)
            flat[i] = orig
            num = (lp - lm) / (2 * eps)
            ana = grads[pi].ravel()[i]
            assert abs(num - ana) < 1e-6, (num, ana)
    print("numeric gradient check passed")`}</CodeBlock>
        <P>
          Second, the real arbiter: rebuild the identical network in PyTorch, call
          <code>.backward()</code>, and confirm autograd produces the same gradients our
          NumPy code did.
        </P>
        <CodeBlock lang="python">{`Xt = torch.tensor(X, dtype=torch.float64)
yt = torch.tensor(y)
W1 = torch.tensor(net.params[0], requires_grad=True)
b1 = torch.tensor(net.params[1], requires_grad=True)
W2 = torch.tensor(net.params[2], requires_grad=True)
b2 = torch.tensor(net.params[3], requires_grad=True)

p = torch.softmax(torch.relu(Xt @ W1 + b1) @ W2 + b2, dim=1)
loss = torch.nn.functional.nll_loss(torch.log(p), yt)
loss.backward()

_, grads = net.loss_and_grads(X, y)
print("W1 grads match:", np.allclose(W1.grad.numpy(), grads[0], atol=1e-6))`}</CodeBlock>
        <KeyInsight title="This is the whole framework">
          When PyTorch's autograd agrees with the gradients you derived by hand, you have
          seen behind the curtain. Autograd is not doing anything you did not just do - it
          records the same graph and applies the same chain rule, only automatically and
          for arbitrary architectures.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built a neural network forward pass, recognized it as a computational graph,
          derived the backward pass node by node, trained the network with your own
          gradients, and proved them correct two different ways.
        </P>
        <P>
          The forward pass records a graph of operations and their intermediate values.
          Backpropagation walks that graph in reverse, multiplying local gradients by the
          chain rule, to get the gradient of the loss with respect to every parameter in a
          single sweep. Softmax-with-cross-entropy gives the clean starting signal
          <MathInline>{`p - y`}</MathInline>; linear layers and ReLU each have a one-line
          local rule. Everything a deep-learning framework does to train a model - any
          architecture, any depth - is this same idea, automated.
        </P>
        <Warn title="The one thing to remember">
          You never differentiate the whole network at once. You differentiate each tiny
          operation locally, and the chain rule stitches them together. That decomposition
          is what makes training networks of any size tractable.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
