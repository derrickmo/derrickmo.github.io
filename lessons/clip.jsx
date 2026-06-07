// lessons/clip.jsx — Module 12-01 - CLIP (Contrastive Image-Text Pretraining).
// Full on-site flagship lesson. Loaded by /learn/multimodal/clip/index.html AFTER lesson-app.jsx.
// Sets __DM_LESSON_CONTENT. Align images and text in one embedding space with a symmetric contrastive
// loss over a batch, then classify zero-shot by writing the labels as text.

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
            Before CLIP, an image classifier could only recognize the fixed list of categories it was
            trained on. CLIP broke that open with a deceptively simple idea: train an image encoder and a
            text encoder together so that a photo and its caption land at the same place in a shared embedding
            space. Once images and words live in one space, you can classify, search, and caption across the
            two modalities - and recognize categories the model was never explicitly trained on.
          </P>
          <P>
            We build the two-tower architecture, the symmetric contrastive loss that aligns them, and the
            zero-shot trick that turns any classification task into a text-matching problem.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Two towers ── */}
      <LessonSection n="0" title="Two Encoders, One Space" tag="// IMAGE + TEXT">
        <P>
          CLIP has two separate encoders - a vision model for images, a transformer for text - each projecting
          its input into the same <MathInline>{`d`}</MathInline>-dimensional space. The image of a dog and the
          text "a photo of a dog" should map to nearby vectors; the image of a dog and "a photo of a cat"
          should map far apart. The training signal is entirely about which pairs belong together.
        </P>
        <CodeBlock lang="python">{`img_emb = normalize(image_encoder(images))    # (B, d)
txt_emb = normalize(text_encoder(texts))      # (B, d)
# cosine similarity because both are unit-normalized`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Contrastive loss ── */}
      <LessonSection n="1" title="The Contrastive Loss" tag="// MATCH THE DIAGONAL">
        <P>
          Take a batch of <MathInline>{`B`}</MathInline> image-text pairs and compute the full
          <MathInline>{`B \\times B`}</MathInline> matrix of image-to-text similarities. The correct
          matches sit on the diagonal; every off-diagonal entry is a mismatched pair to push apart. CLIP
          applies a symmetric cross-entropy - once treating each row as a classification over texts, once each
          column over images - so the diagonal wins both ways.
        </P>
        <MathBlock>{`\\mathcal{L} = \\tfrac12\\big(\\mathrm{CE}(\\text{logits}, \\text{diag}) + \\mathrm{CE}(\\text{logits}^\\top, \\text{diag})\\big)`}</MathBlock>
        <CodeBlock lang="python">{`logits = (img_emb @ txt_emb.T) / temperature   # (B, B)
labels = torch.arange(B)                        # i-th image matches i-th text
loss = 0.5 * (cross_entropy(logits, labels) +
              cross_entropy(logits.T, labels))`}</CodeBlock>
        <KeyInsight title="The batch supplies the negatives">
          There is no separate set of negative examples - every other caption in the batch is a negative for a
          given image. Bigger batches mean harder, more numerous negatives, which is why CLIP was trained with
          enormous batch sizes. The contrast is what carves out a meaningful geometry.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 2 — Scale ── */}
      <LessonSection n="2" title="Why It Needed the Internet" tag="// WEB-SCALE PAIRS">
        <P>
          CLIP's other ingredient is data: hundreds of millions of image-caption pairs scraped from the web.
          Natural-language captions are a far richer supervision signal than a fixed label set - "a golden
          retriever puppy on a beach" teaches object, breed, age, and scene at once. Scale plus the
          contrastive objective is what produced representations general enough to transfer everywhere.
        </P>
        <Aside title="The same loss as SimCLR">
          The contrastive objective here is the same InfoNCE that self-supervised vision (SimCLR) uses on two
          augmentations of one image. CLIP's twist is to make the two views different modalities - image and
          text - so the shared space bridges them. One loss, two big ideas.
        </Aside>
      </LessonSection>

      {/* ── Part 3 — Zero-shot ── */}
      <LessonSection n="3" title="Zero-Shot Classification" tag="// LABELS AS TEXT">
        <P>
          Here is the payoff. To classify an image into categories you never trained on, write each category
          as a text prompt, encode them, and pick the one whose embedding is closest to the image's. The
          classifier is built on the fly from words - no labeled examples, no fine-tuning.
        </P>
        <CodeBlock lang="python">{`classes = ["a photo of a cat", "a photo of a dog", "a photo of a car"]
text_emb = normalize(text_encoder(classes))        # (C, d)
img_emb  = normalize(image_encoder(image))         # (1, d)
pred = (img_emb @ text_emb.T).argmax()             # nearest text = label`}</CodeBlock>
        <TryThis title="Engineer the prompt">
          Swap "a photo of a {label}" for "a blurry photo of a {label}" or a list of templates averaged
          together. Zero-shot accuracy moves noticeably - the text encoder is sensitive to phrasing, so prompt
          design is a real lever, the same way it is for language models.
        </TryThis>
      </LessonSection>

      {/* ── Part 4 — Beyond classification ── */}
      <LessonSection n="4" title="One Space, Many Tasks" tag="// SEARCH + CAPTION">
        <P>
          A shared image-text space is a Swiss-army knife. Text-to-image search ranks images by similarity to
          a query phrase; image-to-text retrieval finds captions; the embeddings seed captioning and
          generation models. CLIP's encoders became a default building block precisely because that one
          aligned space serves so many tasks.
        </P>
        <CodeBlock lang="python">{`# text-to-image search over a gallery
q = normalize(text_encoder(["a red bicycle"]))
hits = (gallery_emb @ q.T).squeeze().argsort(descending=True)[:5]`}</CodeBlock>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built CLIP: two encoders projecting images and text into one space, a symmetric contrastive loss
          that aligns matched pairs against in-batch negatives, and zero-shot classification by writing labels
          as text.
        </P>
        <P>
          CLIP aligns vision and language in a shared embedding space with a contrastive loss whose negatives
          come free from the batch, trained on web-scale image-caption pairs. The aligned space makes
          classification a text-matching problem - zero-shot, no fine-tuning - and powers retrieval and
          captioning besides. It is the canonical example of how a simple contrastive objective at scale yields
          broadly transferable multimodal representations.
        </P>
        <Warn title="The one thing to remember">
          Put images and text in the same space and classification becomes "which caption is closest" - so a
          model trained only to match photos and captions can recognize categories it never saw.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
