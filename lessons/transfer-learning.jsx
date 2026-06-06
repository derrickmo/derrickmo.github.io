// lessons/transfer-learning.jsx — Module 06-04 - Transfer Learning and Fine-Tuning.
// Full on-site flagship lesson. Loaded by /learn/cnn/transfer-learning/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Reuse a pretrained backbone: why features
// transfer, feature extraction vs fine-tuning, and why it wins on small datasets.

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
            Training a deep vision model from scratch needs a lot of data and a lot of
            compute. Most of the time you have neither - and you do not need them. A network
            trained on millions of images has already learned a reusable visual vocabulary:
            edges, textures, parts. Transfer learning takes that pretrained backbone and
            adapts it to your task with a fraction of the data.
          </P>
          <P>
            We will see why early features are generic and late features are task-specific,
            do the two standard recipes - feature extraction and fine-tuning - and run the
            experiment that makes the case: on a small dataset, transfer crushes training
            from scratch.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// A PRETRAINED BACKBONE">
        <P>
          We load a ResNet-18 pretrained on ImageNet from torchvision. Its convolutional
          stack is the backbone we will reuse; the final classification layer is the part
          we will replace for our own classes.
        </P>
        <CodeBlock lang="python">{`import torch, torch.nn as nn
import torchvision.models as models

backbone = models.resnet18(weights="IMAGENET1K_V1")
print(backbone.fc)        # Linear(in_features=512, out_features=1000)
# we'll swap that 1000-class head for our own`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Why features transfer ── */}
      <LessonSection n="1" title="Why Features Transfer" tag="// GENERIC TO SPECIFIC">
        <P>
          A CNN learns a hierarchy. The first layers respond to oriented edges and color
          blobs - features so universal they look almost identical across wildly different
          training sets. Middle layers compose those into textures and motifs; only the last
          layers become specific to the original task's classes.
        </P>
        <KeyInsight title="The transferability gradient">
          Early layers are general and worth keeping verbatim; late layers are specialized
          and worth replacing or adapting. How much of the backbone you freeze versus retrain
          is the single most important decision in transfer learning, and it is governed by
          how similar your task is to the original and how much data you have.
        </KeyInsight>
        <P>
          So the plan writes itself: keep the backbone's general features, attach a fresh head
          for your classes, and decide how much of the rest to nudge.
        </P>
      </LessonSection>

      {/* ── Part 2 — Feature extraction ── */}
      <LessonSection n="2" title="Feature Extraction" tag="// FREEZE, SWAP THE HEAD">
        <P>
          The simplest recipe: freeze the entire backbone so its weights never change, and
          train only a new final layer on your classes. The backbone becomes a fixed feature
          extractor; you are just fitting a linear classifier on top of excellent features.
        </P>
        <CodeBlock lang="python">{`for p in backbone.parameters():
    p.requires_grad = False              # freeze the backbone

n_classes = 5
backbone.fc = nn.Linear(512, n_classes)  # fresh, trainable head

# only the new head's parameters will get gradients
opt = torch.optim.Adam(backbone.fc.parameters(), lr=1e-3)`}</CodeBlock>
        <P>
          This trains in seconds, needs little data, and cannot overfit the backbone because
          the backbone is not learning. It is the right first move whenever your task is close
          to the pretraining domain.
        </P>
      </LessonSection>

      {/* ── Part 3 — Fine-tuning ── */}
      <LessonSection n="3" title="Fine-Tuning" tag="// UNFREEZE, GO GENTLE">
        <P>
          When you have more data, or your domain differs from ImageNet, you unfreeze some of
          the backbone and continue training - but at a much smaller learning rate, so you
          adapt the pretrained weights rather than destroy them. Often you use a lower rate
          for the backbone and a higher one for the new head.
        </P>
        <CodeBlock lang="python">{`for p in backbone.parameters():
    p.requires_grad = True               # unfreeze

opt = torch.optim.Adam([
    {"params": backbone.fc.parameters(),    "lr": 1e-3},   # new head: faster
    {"params": [p for n, p in backbone.named_parameters()
                if not n.startswith("fc")], "lr": 1e-5},   # backbone: gentle
])`}</CodeBlock>
        <Warn title="Do not blast the backbone">
          Fine-tuning with a large learning rate erases the very features you came for - the
          pretrained weights get overwritten by noisy gradients from your small dataset. The
          whole art is small steps. Warm up the head first while frozen, then unfreeze.
        </Warn>
      </LessonSection>

      {/* ── Part 4 — Evaluation ── */}
      <LessonSection n="4" title="The Decisive Test" tag="// SMALL DATA, BIG GAP">
        <P>
          The experiment that justifies all of this: take a small dataset - a few hundred
          images - and train two models, one from random initialization and one from the
          pretrained backbone. The gap is dramatic.
        </P>
        <CodeBlock lang="python">{`# pseudo-results on a 500-image, 5-class dataset
scratch_acc  = train_from_scratch(epochs=30)   # ~ 0.55, and overfits
transfer_acc = train_transfer(epochs=10)        # ~ 0.92, in fewer epochs
print(scratch_acc, transfer_acc)`}</CodeBlock>
        <P>
          From scratch, the network has to learn edges and textures all over again from your
          few hundred images - and overfits before it can. With transfer, those features come
          for free, so the model reaches far higher accuracy in fewer epochs. Less data, less
          compute, better result.
        </P>
        <TryThis title="Find the freezing sweet spot">
          Sweep how many backbone blocks you unfreeze, from zero (pure feature extraction) to
          all (full fine-tuning). With little data, freezing more usually wins; with more data
          and a distant domain, unfreezing more pays off. There is a sweet spot - find it.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You reused a pretrained backbone, replaced its head, trained it two ways - frozen
          feature extraction and gentle fine-tuning - and saw transfer learning dominate
          training from scratch on a small dataset.
        </P>
        <P>
          CNN features run from general (early layers: edges, textures) to specific (late
          layers: classes), and the general ones transfer almost for free. Feature extraction
          freezes the backbone and trains a new head; fine-tuning unfreezes it at a tiny
          learning rate to adapt. With limited data this is not a shortcut - it is the
          correct approach, and the same freeze-then-adapt idea underlies fine-tuning large
          language models too.
        </P>
        <Warn title="The one thing to remember">
          Do not train from scratch unless you must. Start from pretrained weights, freeze
          what transfers, and adapt the rest gently.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
