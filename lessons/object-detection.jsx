// lessons/object-detection.jsx — Module 09-02 - Object Detection Fundamentals.
// Full on-site flagship lesson. Loaded by /learn/cnn/object-detection/index.html (advanced-cv
// module) AFTER lesson-app.jsx. Sets __DM_LESSON_CONTENT. From classification to localization:
// boxes, anchors, IoU assignment, the multi-task loss, and NMS.

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
            Classification answers "what is in this image?" Detection answers the harder question:
            "what is in it, and where?" - drawing a box around every object and labeling each. That
            jump from one label to a variable number of located objects is what makes detection a
            different game, and the ideas that solve it - anchors, IoU matching, a multi-task loss,
            and non-max suppression - recur across every detector.
          </P>
          <P>
            We build the pieces of a single-stage detector conceptually: how a CNN predicts boxes,
            how predictions are matched to ground truth, what the model is trained to minimize, and
            how overlapping detections are cleaned up at the end.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="From Labels to Boxes" tag="// WHAT CHANGES">
        <P>
          A classifier outputs one class distribution. A detector must output, for an unknown number
          of objects, a class and four box coordinates each. The trick that makes this tractable is
          to predict at a dense grid of candidate locations and shapes, then filter.
        </P>
        <CodeBlock lang="python">{`# a detection is a box + a class + a confidence
# box = (cx, cy, w, h)   class in 0..C-1   score in [0,1]
detection = dict(box=(0.51, 0.43, 0.20, 0.35), cls=3, score=0.92)`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Anchors ── */}
      <LessonSection n="1" title="Anchors" tag="// DENSE CANDIDATE BOXES">
        <P>
          Rather than predict boxes from nothing, a detector tiles the image with thousands of
          preset anchor boxes - a few scales and aspect ratios at every feature-map cell. The network
          then only has to predict, for each anchor, whether an object is there and a small adjustment
          to the anchor's shape. Predicting offsets is far easier than predicting absolute boxes.
        </P>
        <CodeBlock lang="python">{`def make_anchors(grid=7, scales=(0.1, 0.2, 0.4), ratios=(0.5, 1.0, 2.0)):
    anchors = []
    for gy in range(grid):
        for gx in range(grid):
            cx, cy = (gx + 0.5) / grid, (gy + 0.5) / grid
            for s in scales:
                for r in ratios:
                    anchors.append((cx, cy, s * r ** 0.5, s / r ** 0.5))
    return anchors          # grid*grid*scales*ratios candidate boxes`}</CodeBlock>
      </LessonSection>

      {/* ── Part 2 — IoU assignment ── */}
      <LessonSection n="2" title="Matching with IoU" tag="// WHICH ANCHOR IS RESPONSIBLE">
        <P>
          Training needs a target for every anchor. We assign each ground-truth box to the anchors
          that overlap it well, measured by intersection-over-union. High-overlap anchors become
          positives (predict this class and refine to this box); low-overlap anchors become negatives
          (predict "background").
        </P>
        <MathBlock>{`\\mathrm{IoU}(A, B) = \\frac{|A \\cap B|}{|A \\cup B|}, \\qquad \\text{positive if } \\mathrm{IoU} > 0.5`}</MathBlock>
        <CodeBlock lang="python">{`def assign(anchors, gt_boxes, thr=0.5):
    labels = []
    for a in anchors:
        best = max(iou(a, g) for g in gt_boxes) if gt_boxes else 0
        labels.append("pos" if best > thr else "neg")   # ignore a middle band in practice
    return labels`}</CodeBlock>
        <KeyInsight title="Most anchors are background">
          The vast majority of anchors match nothing - detection is drowning in easy negatives. This
          imbalance is exactly why focal loss (down-weighting easy examples) was invented, and why
          two-stage detectors first propose a small set of likely regions.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — The loss ── */}
      <LessonSection n="3" title="The Multi-Task Loss" tag="// CLASSIFY + LOCALIZE">
        <P>
          A detector optimizes two things at once: classify each positive anchor correctly, and
          regress its box offsets to fit the ground truth. The total loss adds a classification term
          (cross-entropy or focal) and a box-regression term (smooth L1), the latter only on positives.
        </P>
        <MathBlock>{`\\mathcal{L} = \\mathcal{L}_{\\text{cls}} + \\lambda\\,\\mathbb{1}[\\text{pos}]\\,\\mathcal{L}_{\\text{box}}`}</MathBlock>
        <CodeBlock lang="python">{`import torch
def smooth_l1(pred, target, beta=1.0):
    d = (pred - target).abs()
    return torch.where(d < beta, 0.5 * d * d / beta, d - 0.5 * beta).sum()

# loss = focal(cls_logits, cls_targets) + lam * smooth_l1(box_offsets[pos], box_targets[pos])`}</CodeBlock>
        <Aside title="Why smooth L1 for boxes">
          Pure L2 box loss lets a single badly-placed box dominate; pure L1 has a constant gradient
          near zero that never settles. Smooth L1 is quadratic for small errors and linear for large
          ones - the same robust compromise as Huber loss, applied to coordinates.
        </Aside>
      </LessonSection>

      {/* ── Part 4 — NMS ── */}
      <LessonSection n="4" title="Non-Max Suppression" tag="// CLEAN UP DUPLICATES">
        <P>
          At inference the detector fires many overlapping boxes around each object. Non-max
          suppression keeps the highest-scoring box and removes any others that overlap it beyond a
          threshold, leaving one clean detection per object.
        </P>
        <CodeBlock lang="python">{`def nms(boxes, scores, thr=0.5):
    keep, order = [], scores.argsort()[::-1].tolist()
    while order:
        i = order.pop(0); keep.append(i)
        order = [j for j in order if iou(boxes[i], boxes[j]) < thr]
    return keep             # one box per object`}</CodeBlock>
        <P>
          NMS is the unglamorous but essential last step - without it, every object would be reported
          a dozen times. The same IoU that matched anchors during training now decides which
          predictions are duplicates.
        </P>
        <TryThis title="Sweep the NMS threshold">
          Lower the IoU threshold and crowded, overlapping objects get merged into one (missed
          detections); raise it and you keep near-duplicates. The right value depends on how often
          real objects legitimately overlap in your data.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You assembled the conceptual machinery of an object detector: dense anchors, IoU-based
          assignment, a classification-plus-box-regression loss, and non-max suppression to clean up.
        </P>
        <P>
          Detection turns classification into "what and where" by predicting at a dense grid of
          anchor boxes, matching them to ground truth with IoU, training a multi-task loss over class
          and box offsets, and suppressing overlapping duplicates with NMS. One-stage detectors (YOLO,
          SSD, RetinaNet) do this in a single pass; two-stage ones (Faster R-CNN) propose regions
          first - but every detector is built from these same four ideas.
        </P>
        <Warn title="The one thing to remember">
          Do not predict boxes from scratch - predict small corrections to a dense set of anchors,
          match them by IoU, and suppress the duplicates.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
