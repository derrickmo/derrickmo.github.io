// lessons/ddpm.jsx — Module 11-05 - DDPM Diffusion from Scratch.
// Full on-site flagship lesson. Loaded by /learn/generative/ddpm/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Build a denoising diffusion model on a 2D
// toy distribution: the forward noising process in closed form, an MLP noise predictor,
// the simple noise-prediction loss, and ancestral sampling back from pure noise.

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
            A diffusion model learns to create data by learning to remove noise. The recipe
            is almost suspiciously simple: take real data, add Gaussian noise in many small
            steps until it is indistinguishable from static, and train a network to undo one
            step of that corruption. To generate, start from pure noise and run the learned
            denoiser backward. It is the engine behind every modern image generator.
          </P>
          <P>
            We will build the whole thing on a 2D toy distribution - the two-moons shape -
            so every piece is small enough to read and fast enough to run. The forward
            noising process has a closed form, the training objective is one line of
            mean-squared error, and sampling is a short loop. No framework magic.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// IMPORTS + DATA">
        <P>
          We use PyTorch for the network and a tiny two-moons dataset as our target
          distribution. Each data point is just a 2D coordinate; learning to generate them
          means learning the shape they trace out.
        </P>
        <CodeBlock lang="python">{`import torch, torch.nn as nn
from sklearn.datasets import make_moons
torch.manual_seed(0)

X, _ = make_moons(2000, noise=0.05)
X = torch.tensor(X, dtype=torch.float32)
X = (X - X.mean(0)) / X.std(0)        # normalize to ~unit scale`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — From Scratch ── */}
      <LessonSection n="1" title="From Scratch" tag="// THE FORWARD PROCESS">
        <P>
          The forward process gradually adds noise over <MathInline>{`T`}</MathInline> steps
          with a variance schedule <MathInline>{`\\beta_t`}</MathInline>. The beautiful part:
          you never have to simulate it step by step. Writing
          <MathInline>{`\\alpha_t = 1-\\beta_t`}</MathInline> and
          <MathInline>{`\\bar\\alpha_t = \\prod_{s\\le t}\\alpha_s`}</MathInline>, the noisy
          sample at any step has a closed form in terms of the clean data and a single
          Gaussian draw:
        </P>
        <MathBlock>{`x_t = \\sqrt{\\bar\\alpha_t}\\,x_0 + \\sqrt{1-\\bar\\alpha_t}\\,\\epsilon, \\qquad \\epsilon \\sim \\mathcal{N}(0, I)`}</MathBlock>
        <P>
          So to make a training example at a random timestep, we pick a clean point, pick a
          random <MathInline>{`t`}</MathInline>, draw noise, and mix them by the schedule.
        </P>
        <CodeBlock lang="python">{`T = 200
betas = torch.linspace(1e-4, 0.02, T)          # linear noise schedule
alphas = 1.0 - betas
acp = torch.cumprod(alphas, dim=0)             # alpha-bar_t

def q_sample(x0, t, eps):
    a = acp[t].sqrt().unsqueeze(1)
    b = (1 - acp[t]).sqrt().unsqueeze(1)
    return a * x0 + b * eps                    # closed-form x_t`}</CodeBlock>
        <KeyInsight title="Why closed form matters">
          Because <MathInline>{`x_t`}</MathInline> is a known linear function of
          <MathInline>{`x_0`}</MathInline> and one noise sample, training needs no slow
          forward simulation and the target - the noise that was added - is known exactly.
          That is what turns generative modeling into plain regression.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 2 — Assembly ── */}
      <LessonSection n="2" title="Assembly" tag="// THE NOISE PREDICTOR">
        <P>
          The model's only job is to look at a noisy point and its timestep and predict the
          noise that was added. A small MLP suffices for 2D data; we feed the timestep in as
          an extra input so the network knows how corrupted the point is.
        </P>
        <CodeBlock lang="python">{`class Denoiser(nn.Module):
    def __init__(self, d=2, h=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d + 1, h), nn.SiLU(),
            nn.Linear(h, h), nn.SiLU(),
            nn.Linear(h, d),                   # predicts epsilon
        )
    def forward(self, x, t):
        t = (t.float() / T).unsqueeze(1)       # normalized timestep
        return self.net(torch.cat([x, t], dim=1))`}</CodeBlock>
        <Aside title="In images this is a U-Net">
          For pictures the denoiser is a U-Net with attention, and the timestep enters
          through sinusoidal embeddings. The principle is identical - predict the noise -
          only the architecture grows to match the data.
        </Aside>
      </LessonSection>

      {/* ── Part 3 — Training ── */}
      <LessonSection n="3" title="Training" tag="// NOISE-PREDICTION LOSS">
        <P>
          The training objective is just the mean-squared error between the true noise and
          the network's prediction, averaged over random timesteps:
        </P>
        <MathBlock>{`\\mathcal{L} = \\mathbb{E}_{x_0,\\,t,\\,\\epsilon}\\big[\\,\\|\\epsilon - \\epsilon_\\theta(x_t, t)\\|^2\\,\\big]`}</MathBlock>
        <CodeBlock lang="python">{`model = Denoiser()
opt = torch.optim.Adam(model.parameters(), lr=2e-3)

for step in range(5000):
    idx = torch.randint(0, len(X), (256,))
    x0 = X[idx]
    t = torch.randint(0, T, (256,))
    eps = torch.randn_like(x0)
    xt = q_sample(x0, t, eps)
    loss = ((eps - model(xt, t)) ** 2).mean()  # predict the noise
    opt.zero_grad(); loss.backward(); opt.step()`}</CodeBlock>
        <P>
          That is the entire training loop. No adversarial game, no delicate balance - one
          stable regression loss. This robustness is a big part of why diffusion overtook
          GANs.
        </P>
      </LessonSection>

      {/* ── Part 4 — Sampling ── */}
      <LessonSection n="4" title="Sampling" tag="// THE REVERSE PROCESS">
        <P>
          Generation reverses the chain. Start from pure Gaussian noise and, step by step,
          subtract the model's predicted noise and add back a little fresh noise. The
          ancestral sampling update is:
        </P>
        <MathBlock>{`x_{t-1} = \\frac{1}{\\sqrt{\\alpha_t}}\\Big(x_t - \\frac{1-\\alpha_t}{\\sqrt{1-\\bar\\alpha_t}}\\,\\epsilon_\\theta(x_t, t)\\Big) + \\sigma_t z`}</MathBlock>
        <CodeBlock lang="python">{`@torch.no_grad()
def sample(n=2000):
    x = torch.randn(n, 2)                      # start from noise
    for t in reversed(range(T)):
        tt = torch.full((n,), t)
        eps = model(x, tt)
        a, ac = alphas[t], acp[t]
        mean = (x - (1 - a) / (1 - ac).sqrt() * eps) / a.sqrt()
        x = mean + (betas[t].sqrt() * torch.randn_like(x) if t > 0 else 0)
    return x                                   # reconstructed two-moons`}</CodeBlock>
        <P>
          Run it and the cloud of random points migrates, over 200 steps, into the familiar
          two crescents. The network never saw the shape directly - it only ever learned to
          remove a little noise, and that local skill, iterated, reconstructs the whole
          distribution.
        </P>
        <TryThis title="Fewer steps, faster sampling">
          Try sampling with only every 10th timestep. Quality degrades gracefully - the
          observation that you can skip steps is exactly what fast samplers like DDIM
          exploit to turn hundreds of steps into a handful.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built a denoising diffusion model end to end: a closed-form forward noising
          process, a small noise-predicting network, a one-line training loss, and an
          ancestral sampler that walks pure noise back to data.
        </P>
        <P>
          Diffusion learns to reverse a gradual corruption. The forward process is fixed and
          analytic; all the learning is a stable regression that predicts the added noise;
          sampling iterates the learned one-step denoiser from random noise. Scale the
          denoiser to a U-Net and the data to images, and this same recipe is what powers
          modern image and video generators.
        </P>
        <Warn title="The one thing to remember">
          The model never learns the data distribution directly - it learns the much easier
          task of denoising, and iterating that easy task is what reconstructs the hard one.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
