# Design → Engineering HANDOFF (Phase 2.5)

**From:** Claude Design (CMO seat)
**To:** Claude Code
**Repo:** `derrickmo.github.io`
**Session date:** 2026-05-23 (Phase 2.5 — animated upgrade)

---

## TL;DR (what to do this drop)

1. **`public/og-default.png`** — unchanged. The v2 static card from the previous drop is still the canonical social-share image (LinkedIn, Slack, X all cache OG as static, so animated GIFs don't actually animate there).
2. **`og-card-animated.html`** — animated OG card source. Cycles through 5 mini-visualizations on an 18-second loop. Use as a hero element, in talks, on Twitter/Discord.
3. **`visualizations.html`** — **Foundations** gallery, 9 animations (FNN, CNN, RNN, Transformer, Self-vs-Cross, Language Model, Gradient Descent, Backprop, Embeddings).
4. **NEW: `visualizations-agentic.html`** — **Agentic & LLM** gallery, 6 animations (Chain-of-Thought, In-Context Learning, RAG, MCP, LoRA/QLoRA, ReAct Loop). Sister file to the foundations gallery; same styling and HUD vocabulary, violet-led accent to distinguish.
5. **No code wiring changes** beyond #2–4.

---

## What changed since Phase 2

### `visualizations.html` (overwrite)
**Now 9 animations** instead of 5. Reordered into a 3-column grid:

| Row | Cards |
|---|---|
| 1 (basics) | FNN · CNN · RNN |
| 2 (attention/generation) | Transformer · Self vs Cross · Language Model |
| 3 (training/representation) | Gradient Descent · Backprop · Embeddings |

**Per-card changes:**
- Numbers (`// 01 · …`) dropped from all labels.
- **Transformer reworked.** Was: an opaque 4×4 attention matrix where it wasn't clear what was lighting up. Now: clear vertical bar chart, one bar per key token. Query marker sweeps across the 5 tokens; bar heights animate to show that query's actual attention weights to each key. Realistic pattern (e.g. when query = "cat", "the" and "cat" get most of the attention).
- **NEW: Self vs Cross Attention.** Side-by-side comparison in one card. Self: Q=K=V from one sequence (curved arcs above a single row of nodes). Cross: Q from a target sequence, K/V from a source sequence (lines crossing between two rows).
- **NEW: Language Model.** Bar chart of top-5 next-token candidates. A violet "★ WIN" highlight cycles to whichever candidate is currently the tallest. Conveys autoregressive next-token sampling.
- **NEW: Gradient Descent.** Concentric contour rings on a 2D loss surface; a glowing ball descends a dashed path from outer ring to the minimum, then loops.
- **NEW: Embeddings.** 2D scatter with 3 labeled clusters (royalty / animals / ML tech), each glowing in turn. An analogy arrow `king → queen (− man + woman)` flashes periodically.

### `og-card-animated.html` (Phase 2.5)
**Animated OG card.** Same composition as the static v2 — Derrick Mo, role, pillars, URL — but the right-hand side is now a "LAB_PREVIEW" window that cycles through 5 mini-visualizations on an 18-second loop:

1. Feedforward (FNN) — 3.6s
2. Convolution (CNN) — 3.6s
3. Recurrent (RNN) — 3.6s
4. Self-Attention (Transformer) — 3.6s
5. Backpropagation (Backprop) — 3.6s

With status header (`// SYS::ONLINE · LAB_PREVIEW` + `REC ●`), label footer that updates to show the current viz name, and a 5-pip progress indicator that lights the active step.

**Where to use it:**
- ✅ Embedded as a hero/feature element on the homepage (replace the static `NeuralNet` in `landing-app.jsx Hero()`)
- ✅ Linked from talks / Twitter / Discord / Notion (these animate)
- ⚠️ NOT as `<meta property="og:image">` — LinkedIn, Slack, X cache OG as a static frame. The static `public/og-default.png` remains canonical.

If you DO want a true GIF file (e.g. for a Twitter post embed where you control the upload), see the export options below.

### `visualizations-agentic.html` (Phase 2.6 — new)

**6 agentic/LLM concepts** in a sister gallery. Same card styling as the foundations gallery, violet-led accents to distinguish.

| Card | What it shows |
|---|---|
| **Chain-of-Thought** | Question → 3 reasoning steps cascade in → final answer highlights. Conveys CoT prompting. |
| **In-Context Learning** | Side-by-side ZERO / ONE / FEW-SHOT columns with confidence bars that scale to the spectrum. Shows the prompt-engineering ladder. |
| **RAG** | Pipeline: query → encoder → vector DB (top-K vectors light up) → LLM (with chunks) → grounded answer. Pulse travels through each stage in sequence. |
| **MCP** | Central agent box, 4 MCP servers around it (`MCP_FS`, `MCP_WEB`, `MCP_DB`, `MCP_CODE`). Each connection lights in turn, showing the protocol's hub-and-spoke. |
| **LoRA / QLoRA** | Big frozen `W` matrix (locked icon, dim gray) + small glowing `A` and `B` low-rank matrices. Gradients pulse only through A/B. Formula `h = Wx + BAx` at bottom. |
| **ReAct Loop** | 4-station cycle — THINK · ACT · OBSERVE · REFLECT — around a central LLM/agent. A glowing halo traces the loop continuously. |
| **Foundation Model** | Multi-modal data (text/code/images/audio) → one big pretrained `FM` (100B+ params) → many downstream tasks (chat / codegen / vision QA / reasoning) lighting up in turn. Pretrain-once, adapt-everywhere story in one frame. |
| **Mixture of Experts** | Router (top-2 gating) selects a sparse pair of experts per token. 4 experts shown; pairs activate per cycle phase (E₁+E₂, E₂+E₃, E₃+E₄, E₄+E₁), then a combiner Σ produces the output. |

**Where to use them:** the Lab page (`/play/` or `/learn/`), the Consulting page (RAG + MCP + Agentic Loop are direct credibility signals for AI-engineering work), and individual lecture/module pages.

---

## Files delivered in `output/`

| File | Purpose |
|---|---|
| `og-default.png` | 1200×630 static OG card (Phase 2 v2). **This is the canonical social-share image — don't replace.** |
| `og-card-animated.html` | Animated card source. 18s loop. Drop into the repo as a standalone page or inline into React. |
| `og-card-frames/01-fnn.png` … `05-bp.png` | 5 static frame captures of the animated card, one per slide. Use these if you want a frame-flipbook GIF or APNG. |
| `visualizations.html` | **Foundations** gallery — 9 animations (FNN, CNN, RNN, Transformer, Self/Cross, LM, Gradient Descent, Backprop, Embeddings). |
| `visualizations-agentic.html` | **Agentic & LLM** gallery — 8 animations (CoT, ICL, RAG, MCP, LoRA/QLoRA, ReAct Loop, Foundation Model, MoE). |
| `visualizations-applications.html` | **Applications** gallery — 8 animations (Classification, Regression, Segmentation, Computer Vision, NLP, Robotics, GAN, Diffusion). |
| `HANDOFF.md` | This file. |

### `visualizations-applications.html` (Phase 2.7 — new)

**8 application/task cards** in a third sister gallery. Emerald-led accent palette to distinguish from foundations (blue-led) and agentic (violet-led).

| Card | What it shows |
|---|---|
| **Classification** | Input image → MODEL → 3 probability bars cycling between distributions; a `★ TOP` halo migrates to the tallest bar at each step. |
| **Regression** | 2D scatter of points with vertical residuals; a regression line draws across, ending with `R² = 0.94` indicator. |
| **Segmentation** | Side-by-side INPUT image and MASK with 3-class color labels (sky / object / ground). Cells pulse subtly to feel "live." |
| **Computer Vision** | Object detection: a scene with person/car/dog shapes overlaid with bounding boxes and confidence labels (PERSON 0.94, CAR 0.87, DOG 0.82). |
| **Natural Language** | Sentence → tokenization → embeddings → transformer block → SENTIMENT: POSITIVE 0.96. Stage-by-stage pulse highlights each layer. |
| **Robotics** | Robot arm joints sweep; sensor blocks (joint θ, camera, IMU) pulse → policy net π → action outputs (τ₁, τ₂, grip). |
| **GAN** | Two-network adversarial layout: z → G → generated image (noise ⇄ face) → D → REAL/FAKE decision. Feedback arrow with "G learns to fool D." |
| **Diffusion** | 5-stage chain from pure noise (t=T) to clean face (t=0). A traveling marker indicates the current timestep walking right-to-left. |

**Where to use them:** the Lab page (anchors each Play category), the Consulting page (especially Segmentation, CV, NLP, Robotics — these are concrete deliverables), and per-module lecture pages.



(Sources kept in the design project root for future revision: `og-card-final.html`, `og-card-final-v1.html`, `og-card-explore.html`, `visualizations-v1.html`.)

---

## Exporting the animated OG card as a real GIF

The animated card is HTML. To get an actual `.gif` file:

**Easiest (no install):**
1. Open `og-card-animated.html` in Chrome (full-screen, dev tools off).
2. Screen-record one 18-second loop with QuickTime (Mac) or Xbox Game Bar (Win) at 1200×630.
3. Upload the MP4 to **ezgif.com** → "Video to GIF" → set output 1200×630, frame rate ~10–15 fps, file size ~3–5 MB.

**Cleanest (CLI):** with Puppeteer + `puppeteer-screen-recorder` + `gifski`. Drop me a note if you want me to spec the exact pipeline.

**Why not auto-generate the GIF here:** the design sandbox can't reach a GIF-encoder library cross-origin, and a server-side encoder isn't available in this session. Screen-recording on the user's machine is the reliable path.

---

## Phase 3 plan — home/work card graphs (unchanged from previous handoff)

Audit + concrete fixes for every home-page diagram in `landing-app.jsx` are documented in the previous HANDOFF (still applies). Hero gets the FNN animation, Teaching gets a math-build-up, Consulting gets a system map, etc. Carried forward to the next session.

---

## How to restart this design session

`PROGRESS.md` at the design-project root tracks state. Read it first if resuming. The full design-side file list:

- `PROGRESS.md` — session-level state
- `og-card-explore.html` — 3-variant Phase 1 exploration
- `og-card-final-v1.html` — Phase 1 OG card (archived)
- `og-card-final.html` — Phase 2 static OG card (current canonical)
- `og-card-animated.html` — Phase 2.5 animated OG card (new)
- `visualizations.html` — current 9-animation gallery
- `visualizations-v1.html` — Phase 2's 5-animation gallery (archived)
- `output/` — the deliverable package (everything in here goes to Derrick → repo)
- `_review/` — intermediate screenshots, safe to delete
