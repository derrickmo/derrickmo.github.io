// lessons/cnn-architectures.jsx — Module 06-03 - CNN Architectures: LeNet to ResNet.
// Full on-site flagship lesson. Loaded by /learn/cnn/cnn-architectures/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. The ideas that scaled CNNs: the conv-norm-act
// block, depth (VGG), the degradation problem, and the residual connection that fixed it.

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
            The convolution is the primitive; an architecture is how you stack it. The history
            of computer vision from 1998 to 2015 is essentially a sequence of better answers to
            one question: how do you go deeper without the network falling apart? This lesson
            walks that arc - LeNet's basic block, VGG's uniform depth, the degradation problem
            that stalled progress, and the residual connection that broke it open.
          </P>
          <P>
            We build each idea as a small PyTorch module so the design decisions are concrete,
            not historical trivia. By the end you will know why every modern backbone, including
            the vision transformer, keeps the one trick ResNet introduced.
          </P>
          <Diagram caption="A CNN stacks blocks that shrink spatial size while growing channel depth - from pixels to abstract features.">
            <NeuralNet layers={[3, 6, 5, 4]} width={460} height={240} mode="dark" glow={0.8} />
          </Diagram>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// THE BUILDING BLOCK">
        <P>
          Every modern CNN is built from one repeating unit: a convolution, a normalization,
          and a nonlinearity - often followed by downsampling. This conv-norm-act block is the
          LEGO brick; the architectures differ mainly in how they connect bricks.
        </P>
        <CodeBlock lang="python">{`import torch, torch.nn as nn

def block(cin, cout, stride=1):
    return nn.Sequential(
        nn.Conv2d(cin, cout, 3, stride, padding=1, bias=False),
        nn.BatchNorm2d(cout),
        nn.ReLU(inplace=True),
    )`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — LeNet ── */}
      <LessonSection n="1" title="LeNet and the Pattern" tag="// SHRINK SPACE, GROW DEPTH">
        <P>
          LeNet-5 (1998) set the template that still holds: alternate convolutions with pooling
          to shrink the spatial dimensions while increasing the number of channels, then flatten
          into a small classifier. Early layers see small receptive fields (edges); later layers,
          having pooled several times, see large ones (shapes, objects).
        </P>
        <CodeBlock lang="python">{`class LeNet(nn.Module):
    def __init__(self, n_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            block(3, 16), nn.MaxPool2d(2),      # 32 -> 16
            block(16, 32), nn.MaxPool2d(2),     # 16 -> 8
        )
        self.head = nn.Sequential(nn.Flatten(), nn.Linear(32*8*8, n_classes))
    def forward(self, x):
        return self.head(self.features(x))`}</CodeBlock>
        <KeyInsight title="Receptive field is everything">
          Each pooling step roughly doubles how much of the original image a single later-layer
          neuron can see. Depth is not just capacity - it is how a network earns a wide enough
          view to recognize whole objects from local filters.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 2 — VGG and depth ── */}
      <LessonSection n="2" title="VGG and the Depth Wall" tag="// DEEPER, UNIFORMLY">
        <P>
          VGG (2014) showed that stacking many small 3x3 convolutions - cheap, uniform, deep -
          beats a few large ones. Two stacked 3x3 convolutions see the same region as one 5x5 but
          with fewer parameters and an extra nonlinearity. Depth pushed accuracy up... until it
          did not.
        </P>
        <P>
          Counterintuitively, beyond a point, adding layers made <em>training</em> error go up,
          not down. A 56-layer plain network underperformed a 20-layer one. This is the
          degradation problem - and it is not overfitting, since even the training loss is worse.
        </P>
        <Warn title="Deeper should never be worse">
          A deep network can always represent a shallow one by setting the extra layers to the
          identity. So if training error rises with depth, the issue is optimization: gradients
          are not making it cleanly through a long stack. That diagnosis points straight at the
          fix.
        </Warn>
      </LessonSection>

      {/* ── Part 3 — ResNet ── */}
      <LessonSection n="3" title="ResNet and the Skip Connection" tag="// LEARN THE RESIDUAL">
        <P>
          ResNet (2015) made the identity easy to learn by adding it back explicitly. A residual
          block computes a small change to its input and adds it to the input, so each block only
          has to learn the <em>residual</em> - the difference from doing nothing.
        </P>
        <MathBlock>{`y = \\mathcal{F}(x, W) + x`}</MathBlock>
        <CodeBlock lang="python">{`class ResBlock(nn.Module):
    def __init__(self, c, stride=1):
        super().__init__()
        self.f = nn.Sequential(block(c, c, stride),
                               nn.Conv2d(c, c, 3, 1, 1, bias=False),
                               nn.BatchNorm2d(c))
        self.act = nn.ReLU(inplace=True)
    def forward(self, x):
        return self.act(self.f(x) + x)          # the skip connection`}</CodeBlock>
        <P>
          The skip connection gives gradients a clean path straight through the network - the
          add passes the upstream gradient backward untouched, so even very deep stacks train.
          Suddenly 50, 101, 152 layers not only worked but kept improving.
        </P>
        <KeyInsight title="Why the gradient flows">
          Differentiate <MathInline>{`y = \\mathcal{F}(x) + x`}</MathInline>: the gradient to
          <MathInline>{`x`}</MathInline> is <MathInline>{`\\partial\\mathcal{F}/\\partial x + 1`}</MathInline>.
          That <MathInline>{`+1`}</MathInline> guarantees the signal never fully vanishes, no
          matter how many blocks it traverses. One term, and the depth wall falls.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 4 — Evaluation ── */}
      <LessonSection n="4" title="Plain vs Residual" tag="// THE DECISIVE TEST">
        <P>
          The clean experiment: build a plain deep stack and an identical one with skip
          connections, train both, and compare. The plain network's training loss stalls high;
          the residual one keeps descending. Same depth, same parameters - only the skip differs.
        </P>
        <CodeBlock lang="python">{`def make_stack(n_blocks, residual):
    blocks = []
    for _ in range(n_blocks):
        blocks.append(ResBlock(32) if residual else block(32, 32))
    return nn.Sequential(block(3, 32), *blocks,
                         nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(32, 10))

plain = make_stack(20, residual=False)   # training loss plateaus high
res   = make_stack(20, residual=True)    # training loss keeps falling`}</CodeBlock>
        <Aside title="The idea outlived CNNs">
          Residual connections are now everywhere: every transformer block wraps its attention
          and MLP in a skip. The architecture changed; the one fix for training deep stacks did
          not.
        </Aside>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You traced the CNN from LeNet's conv-pool template through VGG's uniform depth to the
          degradation problem and ResNet's residual fix, building each as a small module.
        </P>
        <P>
          A CNN shrinks space while growing channel depth to widen its receptive field. Depth
          helps until gradients can no longer traverse the stack - the degradation problem.
          Residual connections add the identity back, giving gradients a clean path and letting
          networks go arbitrarily deep. That single idea, the skip connection, is the load-bearing
          trick behind both modern CNNs and transformers.
        </P>
        <Warn title="The one thing to remember">
          When a deeper network trains worse, suspect optimization, not capacity - and reach for
          a skip connection.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
