// lessons/flows.jsx — Module 11-08 - Normalizing Flows and Flow Matching.
// Full on-site flagship lesson. Loaded by /learn/generative/flows/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Invertible transforms with a tractable density
// via change of variables; build a RealNVP affine coupling layer, train by max-likelihood,
// then sample by inverting and evaluate exact log-density.

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
            Most generative models can sample but cannot tell you the exact probability of a
            data point. Normalizing flows can do both. The idea: learn an invertible mapping
            between your complicated data distribution and a simple one - a standard Gaussian.
            Sample by drawing Gaussian noise and pushing it forward; evaluate density by
            mapping data back and applying the change-of-variables formula.
          </P>
          <P>
            The challenge is making the transform both expressive and cheaply invertible, with
            a tractable Jacobian determinant. RealNVP's affine coupling layer is the elegant
            answer, and we build it from scratch on a 2D distribution.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// TARGET + BASE">
        <P>
          Our target is the two-moons distribution; our base is a 2D standard Gaussian. The
          flow will learn to morph one into the other, invertibly.
        </P>
        <CodeBlock lang="python">{`import torch, torch.nn as nn
from sklearn.datasets import make_moons
torch.manual_seed(0)

X, _ = make_moons(4000, noise=0.05)
X = torch.tensor(X, dtype=torch.float32)
X = (X - X.mean(0)) / X.std(0)

base = torch.distributions.Normal(0.0, 1.0)   # the simple distribution`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Change of variables ── */}
      <LessonSection n="1" title="Change of Variables" tag="// THE DENSITY FORMULA">
        <P>
          If an invertible map <MathInline>{`f`}</MathInline> sends data
          <MathInline>{`x`}</MathInline> to latent <MathInline>{`z = f(x)`}</MathInline>, the
          change-of-variables formula gives the exact log-density of the data under the model:
        </P>
        <MathBlock>{`\\log p(x) = \\log p_Z\\big(f(x)\\big) + \\log\\Big|\\det \\frac{\\partial f}{\\partial x}\\Big|`}</MathBlock>
        <P>
          The first term scores how Gaussian the mapped point is; the second corrects for how
          much the transform locally stretches or squeezes space. The whole game is to make
          that Jacobian determinant cheap to compute - in general it costs
          <MathInline>{`O(d^3)`}</MathInline>, which is hopeless.
        </P>
        <KeyInsight title="The Jacobian is the catch">
          A naive invertible network has a dense Jacobian whose determinant is far too
          expensive. Flows are entirely about architectures whose Jacobian is triangular -
          so its determinant is just the product of the diagonal, computable in linear time.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 2 — Affine coupling ── */}
      <LessonSection n="2" title="Affine Coupling" tag="// REALNVP">
        <P>
          RealNVP's trick: split the input in two. Pass one half through unchanged, and use it
          to predict a scale and shift that transform the other half. Because the changed half
          depends only on the unchanged half, the Jacobian is triangular and its log-det is
          just the sum of the log-scales - trivial. And it inverts in closed form.
        </P>
        <MathBlock>{`y_1 = x_1, \\qquad y_2 = x_2 \\odot e^{s(x_1)} + t(x_1)`}</MathBlock>
        <CodeBlock lang="python">{`class Coupling(nn.Module):
    def __init__(self, dim=2, hidden=128, mask=torch.tensor([1., 0.])):
        super().__init__()
        self.mask = mask
        self.net = nn.Sequential(nn.Linear(dim, hidden), nn.ReLU(),
                                 nn.Linear(hidden, hidden), nn.ReLU(),
                                 nn.Linear(hidden, dim * 2))   # -> s, t

    def forward(self, x):                  # data -> latent
        xa = x * self.mask
        s, t = (self.net(xa) * (1 - self.mask).repeat(1, 1)).chunk(2, dim=1)
        s = s * (1 - self.mask)            # only transform the masked-out half
        t = t * (1 - self.mask)
        z = xa + (1 - self.mask) * (x * torch.exp(s) + t)
        log_det = s.sum(1)                 # triangular Jacobian -> sum of log-scales
        return z, log_det`}</CodeBlock>
        <Aside title="Alternate the mask">
          One coupling layer leaves half the dimensions untouched. Stack several and flip the
          mask each time, so every dimension gets transformed by the others. A handful of
          alternating coupling layers makes a very expressive, exactly-invertible flow.
        </Aside>
      </LessonSection>

      {/* ── Part 3 — Training ── */}
      <LessonSection n="3" title="Training" tag="// MAXIMUM LIKELIHOOD">
        <P>
          Flows train by directly maximizing the exact log-likelihood of the data - no lower
          bound, no adversary. Map data to latent, score it under the Gaussian, add the
          log-determinant, and minimize the negative of that sum.
        </P>
        <CodeBlock lang="python">{`def log_prob(flow, x):
    z, ld = x, 0
    for layer in flow:
        z, d = layer(z); ld = ld + d
    return base.log_prob(z).sum(1) + ld         # change of variables

opt = torch.optim.Adam(flow.parameters(), lr=1e-3)
for step in range(3000):
    nll = -log_prob(flow, X).mean()             # exact negative log-likelihood
    opt.zero_grad(); nll.backward(); opt.step()`}</CodeBlock>
        <P>
          Because the likelihood is exact, training is stable and the loss is directly
          interpretable as bits-per-dimension. This is the flow's signature advantage over
          VAEs (which bound the likelihood) and GANs (which never compute it).
        </P>
      </LessonSection>

      {/* ── Part 4 — Sampling and density ── */}
      <LessonSection n="4" title="Sample and Score" tag="// INVERT THE FLOW">
        <P>
          To generate, draw Gaussian noise and run the flow backward - each coupling layer
          inverts in closed form by solving its affine map for <MathInline>{`x_2`}</MathInline>.
          And because we can evaluate exact density, the flow doubles as an anomaly detector:
          out-of-distribution points get low log-probability.
        </P>
        <CodeBlock lang="python">{`@torch.no_grad()
def sample(flow, n=4000):
    z = torch.randn(n, 2)
    for layer in reversed(flow):
        z = layer.inverse(z)          # closed-form inverse of each coupling
    return z                          # reconstructed two-moons

# exact density evaluation, for free
ll = log_prob(flow, X)               # high on data, low off-manifold`}</CodeBlock>
        <P>
          Run the sampler and Gaussian noise reshapes into the two crescents; feed in points
          off the manifold and the log-likelihood drops. One model, two capabilities sampling
          and exact density that no other generative family gives you together.
        </P>
        <TryThis title="Flow matching, the modern cousin">
          Continuous normalizing flows replace the discrete coupling stack with an ODE, and
          flow matching trains them by regressing a velocity field - the same exact-likelihood
          spirit, now competitive with diffusion. Once you have this lesson, that idea is a
          short hop away.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built a normalizing flow from the change-of-variables formula up: a RealNVP
          affine coupling layer with a triangular Jacobian, trained by exact maximum
          likelihood, then used it to both sample and score density.
        </P>
        <P>
          A flow is an invertible map between data and a simple base distribution; the
          change-of-variables formula turns it into an exact density model. The engineering
          is all about a cheap Jacobian determinant, which affine coupling delivers by
          transforming half the dimensions as a function of the other half. Flows uniquely
          give exact likelihood and sampling at once - and flow matching carries the idea into
          the continuous, diffusion-competitive regime.
        </P>
        <Warn title="The one thing to remember">
          Make the transform invertible with a triangular Jacobian, and an intractable density
          becomes a sum of log-scales - that constraint is what makes flows possible.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
