// gen-lesson-pages.mjs — Phase C: generate store-authored lesson pages + per-module
// body data files from the canonical content store.
//
// For every lesson in content/lessons/ that has an authored `body` and is NOT a
// legacy flagship (bodySource "jsx"), this script:
//   1. accumulates its {level, body, interview, flashcards, refs} into
//      lesson-bodies/<module-slug>.js  (window.DM_LESSON_BODIES — loaded by the
//      page BEFORE lesson-app.jsx, which renders it via StoreLessonBody)
//   2. writes learn/<module-slug>/<lesson-slug>/index.html (template = the
//      linear-algebra flagship page, with metas/slugs/scripts swapped)
//   3. patches vite.config.mjs rollupOptions.input and public/search-index.js
//      (the palette index; it moved out of chrome.jsx in PF-0021)
//      between  // >>> generated:storelessons  ...  // <<< generated:storelessons
//      markers (inserted after the sublessons blocks on first run)
//
//   node scripts/gen-lesson-pages.mjs
//
// Idempotent. Run npm run build + gen-sitemap.mjs afterward.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Meta descriptions are what a searcher sees in Google and what a colleague sees when
// the link is pasted into Slack, so a half-word ending reads as broken (MT-0001).
// Cut on a word boundary near the ~155 chars Google renders, and end with an ellipsis.
function metaDescription(text, max = 155) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  // Only fall back to a hard cut if there is no space in the last third.
  const base = sp > max * 0.6 ? cut.slice(0, sp) : cut;
  // ASCII "..." not U+2026: esc()/htmlEscape() ASCII-fold these metas (the site keeps
  // HTML head content ASCII-only), so a real ellipsis is silently stripped and the
  // description ends mid-word again - which is the bug this function exists to fix.
  return base.replace(/[\s,;:.\-]+$/, "") + "...";
}

const STORE = join(ROOT, "content");

const readJ = (p) => JSON.parse(readFileSync(p, "utf8"));
const ascii = (s) => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x00-\x7F]/g, "");
const esc = (s) => ascii(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── collect authored store lessons ──────────────────────────────────────────
const modules = readdirSync(join(STORE, "modules")).filter(f => f.endsWith(".json"))
  .map(f => readJ(join(STORE, "modules", f)));
const modBySlug = Object.fromEntries(modules.map(m => [m.slug, m]));

// A legacy flagship lesson (bodySource "jsx") owns its own body, but the store can
// still supply its DRILL LAYER — interview + flashcards + refs. That data rides in the
// same per-module bundle, and the flagship page is patched to load it; lesson-app.jsx
// then renders <Content/> followed by the Interview + Flashcards sections.
const hasDrill = (l) => !!(
  (l.interview && ((l.interview.quickGrind || []).length || (l.interview.standard || []).length)) ||
  (l.flashcards || []).length
);

const authored = {};   // moduleSlug -> [lesson, ...]   (store body owns the page)
const drill = {};      // moduleSlug -> [lesson, ...]   (flagship body + store drill layer)
for (const m of modules) {
  const dir = join(STORE, "lessons", m.slug);
  if (!existsSync(dir)) continue;
  const order = m.subLessons?.order || [];       // taught sub-lesson concept ids
  for (const f of readdirSync(dir).filter(f => f.endsWith(".json"))) {
    const l = readJ(join(dir, f));
    if (l.bodySource === "jsx") {                // legacy flagship page owns the body
      if (hasDrill(l)) (drill[m.slug] ||= []).push(l);
      continue;
    }
    if (!l.body) continue;                       // not authored yet
    if (order.includes(l.slug)) {                // COLLISION: a sub-lesson concept squats this URL
      console.error(`!! COLLISION ${m.slug}/${l.slug}: this slug is still a taught sub-lesson (in the module's subLessons.order), which owns learn/${m.slug}/${l.slug}/. Remove it from subLessons.order so the full store lesson supersedes it (Phase C policy). SKIPPING this page to avoid clobbering the sub-lesson.`);
      continue;
    }
    (authored[m.slug] ||= []).push(l);
  }
}
const total = Object.values(authored).flat().length;
const drillTotal = Object.values(drill).flat().length;
console.log(`authored store lessons: ${total} across ${Object.keys(authored).length} module(s)`);
if (drillTotal) console.log(`flagship drill layers:  ${drillTotal} across ${Object.keys(drill).length} module(s)`);

// ── 1. per-module body data files ───────────────────────────────────────────
mkdirSync(join(ROOT, "lesson-bodies"), { recursive: true });
for (const slug of [...new Set([...Object.keys(authored), ...Object.keys(drill)])].sort()) {
  const lessons = authored[slug] || [];
  const data = {};
  for (const l of lessons.sort((a, b) => a.id.localeCompare(b.id))) {
    data[l.slug] = { level: l.level, body: l.body, interview: l.interview, flashcards: l.flashcards, refs: l.refs, demos: l.surfaces?.demos || [] };
  }
  // drill-only entries: NO body and NO level, so lesson-app's hasStoreBody() stays
  // false and the flagship keeps its own outline + body.
  for (const l of (drill[slug] || []).sort((a, b) => a.id.localeCompare(b.id))) {
    data[l.slug] = { interview: l.interview, flashcards: l.flashcards, refs: l.refs, demos: l.surfaces?.demos || [] };
  }
  const js = `// GENERATED from content/lessons/${slug}/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "${slug}". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = ${JSON.stringify(data, null, 2)};
`;
  writeFileSync(join(ROOT, "lesson-bodies", `${slug}.js`), js, "utf8");
  const nd = (drill[slug] || []).length;
  console.log(`  lesson-bodies/${slug}.js (${lessons.length} lesson(s)${nd ? ` + ${nd} drill layer(s)` : ""})`);
}

// ── 1b. patch FLAGSHIP pages to load their module bundle ────────────────────
// These pages are hand-maintained, not generated, so patch in place and idempotently:
// add the bundle <script> before lesson-app.jsx and leave the flagship's own
// lessons/<slug>.jsx alone (it must still load, and it loads AFTER lesson-app).
for (const [mslug, lessons] of Object.entries(drill)) {
  for (const l of lessons) {
    const page = join(ROOT, "learn", mslug, l.slug, "index.html");
    if (!existsSync(page)) { console.error(`!! flagship page missing: learn/${mslug}/${l.slug}/index.html`); continue; }
    let html = readFileSync(page, "utf8");
    if (html.includes(`lesson-bodies/${mslug}.js`)) continue;      // already wired
    const before = html;
    html = html.replace(
      /(<script type="module" src="\.\.\/\.\.\/\.\.\/lesson-app\.jsx"><\/script>)/,
      `<script type="module" src="../../../lesson-bodies/${mslug}.js"></script>\n  $1`
    );
    if (html === before) { console.error(`!! could not wire drill layer into learn/${mslug}/${l.slug}/ (no lesson-app.jsx script tag)`); continue; }
    writeFileSync(page, html, "utf8");
    console.log(`  wired drill layer -> learn/${mslug}/${l.slug}/index.html`);
  }
}

// ── 2. pages ────────────────────────────────────────────────────────────────
const template = readFileSync(join(ROOT, "learn", "foundations", "linear-algebra", "index.html"), "utf8");
const pages = [];   // { module, lesson, title }
for (const [mslug, lessons] of Object.entries(authored)) {
  const m = modBySlug[mslug];
  for (const l of lessons) {
    const dir = join(ROOT, "learn", mslug, l.slug);
    const title = `${l.id} ${ascii(l.title)} | ML from Scratch | Derrick Mo`;
    const desc = esc(metaDescription(l.body.intuition?.[0] || l.title));
    const url = `https://derrickmo.github.io/learn/${mslug}/${l.slug}/`;
    let html = template;
    // The template is learn/foundations/linear-algebra/index.html, which is itself a
    // FLAGSHIP page — and if that lesson has a drill layer, step 1b has already wired
    // lesson-bodies/foundations.js into it. Inheriting that tag would make every
    // generated page load foundations' bundle on top of its own (harmless only
    // because the correct one is assigned last). Strip any inherited bundle tag
    // before inserting the right one below.
    html = html.replace(/\s*<script type="module" src="\.\.\/\.\.\/\.\.\/lesson-bodies\/[^"]+\.js"><\/script>/g, "");
    // metas
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
    html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`);
    html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
    html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`);
    html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
    html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`);
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
    html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
    // page globals
    html = html.replace(/__DM_MODULE_SLUG = "[^"]*"/, `__DM_MODULE_SLUG = "${mslug}"`);
    html = html.replace(/__DM_LESSON_SLUG = "[^"]*"/, `__DM_LESSON_SLUG = "${l.slug}"`);
    // scripts: body data BEFORE lesson-app; drop the flagship content jsx
    html = html.replace(
      /(<script type="module" src="\.\.\/\.\.\/\.\.\/lesson-app\.jsx"><\/script>)/,
      `<script type="module" src="../../../lesson-bodies/${mslug}.js"></script>\n  $1`
    );
    html = html.replace(/\s*<script type="module" src="\.\.\/\.\.\/\.\.\/lessons\/[^"]+\.jsx"><\/script>/, "");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html, "utf8");
    pages.push({ module: mslug, moduleTitle: m.title, lesson: l });
    console.log(`  learn/${mslug}/${l.slug}/index.html`);
  }
}

// ── 3. patch vite + chrome between storelessons markers ─────────────────────
function patchBetween(file, open, close, lines, insertAfter) {
  let txt = readFileSync(join(ROOT, file), "utf8");
  if (!txt.includes(open)) {
    // first run: insert the marker pair right after `insertAfter`
    const idx = txt.indexOf(insertAfter);
    if (idx < 0) throw new Error(`${file}: anchor not found`);
    const at = idx + insertAfter.length;
    txt = txt.slice(0, at) + `\n${open}\n${close}` + txt.slice(at);
  }
  const start = txt.indexOf(open) + open.length;
  const end = txt.indexOf(close);
  txt = txt.slice(0, start) + "\n" + lines.join("\n") + "\n" + txt.slice(end);
  writeFileSync(join(ROOT, file), txt, "utf8");
}

const viteLines = pages.map(p => `        'lesson-${p.module}-${p.lesson.slug}': 'learn/${p.module}/${p.lesson.slug}/index.html',`);
patchBetween("vite.config.mjs", "        // >>> generated:storelessons", "        // <<< generated:storelessons",
  viteLines, "        // <<< generated:sublessons");

const navLines = pages.map(p => {
  const kw = ascii(`${p.lesson.title} ${p.moduleTitle} lesson ${p.lesson.id} ${(p.lesson.body.intuition?.[0] || "").split(" ").slice(0, 14).join(" ")}`).toLowerCase().replace(/[^a-z0-9 ]/g, "");
  return `  { label: "${ascii(p.lesson.title)} - ${ascii(p.moduleTitle)}", group: "Lesson", href: "/learn/${p.module}/${p.lesson.slug}/", kw: "${kw}" },`;
});
patchBetween("public/search-index.js", "  // >>> generated:storelessons", "  // <<< generated:storelessons",
  navLines, "  // <<< generated:sublessons");

console.log(`patched vite.config.mjs (+${viteLines.length}) and public/search-index.js (+${navLines.length})`);
console.log("done — run npm run build, then node scripts/gen-sitemap.mjs");
