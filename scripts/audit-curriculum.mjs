#!/usr/bin/env node
// audit-curriculum.mjs — every store lesson in every module, all invariants at once.
//
// Why this exists in addition to validate-content.mjs and the per-module sweep: the
// per-module sweep only ever checked the module being authored, and two checks (the
// notebookFile existence check and the curriculum.js title byte-match) were added
// MID-Phase-C, so modules 01-18 were never re-checked against them. Running this
// across all 250 lessons at once on 2026-08-15 found 11 notebookFile values pointing
// at notebooks that do not exist — all 10 of agentic-ai plus pytorch-internals/
// custom-loss — which had been sitting in the validator's warning channel, unnoticed,
// inside a 42-warning noise floor made almost entirely of one benign category.
//
// So: run this after any batch of content work, and TRIAGE THE WARNING COUNT, not
// just the error count. A homogeneous warning channel is what makes the next real
// warning visible.
//
// Note on `refs<5`: informational only. 4 refs is module 01's exemplar and the C2
// floor; refs>=5 was the authoring template for modules 09-25, not a requirement.
//
// Usage: node scripts/audit-curriculum.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Best-effort: absent on CI/a fresh clone. Override with DM_NOTEBOOKS_REPO.
const NB = (process.env.DM_NOTEBOOKS_REPO || 'C:/Users/Derrick/Desktop/Github/Machine Learning Tutorial') + '/modules';
process.chdir(ROOT);

const OK_TYPE = new Set(['definition', 'formula', 'intuition', 'pitfall']);
const OK_LEVEL = new Set(['intro', 'core', 'advanced']);
const SECTIONS = ['intuition', 'math', 'code', 'useCases', 'pitfalls', 'connections'];

// curriculum.js titles, loaded the way the site loads them
const win = {};
new Function('window', fs.readFileSync('curriculum.js', 'utf8'))(win);
const curTitle = new Map();
const curSlugs = new Map();
for (const m of win.CURRICULUM.modules) {
  curSlugs.set(m.slug, new Set((m.lessons || []).map(l => l.slug)));
  for (const l of m.lessons || []) curTitle.set(`${m.slug}/${l.slug}`, l.title);
}

// notebook filenames actually on disk, by module number
const nbByNum = new Map();
if (fs.existsSync(NB)) {
  for (const d of fs.readdirSync(NB)) {
    const n = d.match(/module_(\d+)/);
    if (n) nbByNum.set(String(Number(n[1])).padStart(2, '0'),
      new Set(fs.readdirSync(path.join(NB, d)).filter(f => f.endsWith('.ipynb'))));
  }
}

// every lesson id referenced anywhere, to resolve prereqs/leadsTo
const allIds = new Set();
for (const mod of fs.readdirSync('content/lessons'))
  for (const f of fs.readdirSync(`content/lessons/${mod}`))
    allIds.add(`${mod}/${f.replace(/\.json$/, '')}`);

const slug0 = f => f.replace(/\.json$/, '');
const problems = [];
let live = 0, jsx = 0, other = 0, mods = 0;
const perMod = [];

for (const mod of fs.readdirSync('content/lessons').sort()) {
  mods++;
  let mLive = 0, mJsx = 0, mBad = 0;
  for (const f of fs.readdirSync(`content/lessons/${mod}`).sort()) {
    const rel = `content/lessons/${mod}/${f}`;
    let j;
    try { j = JSON.parse(fs.readFileSync(rel, 'utf8')); }
    catch (e) { problems.push(`${rel}: PARSE FAIL — ${e.message}`); mBad++; continue; }

    if (j.bodySource === 'jsx') {
      jsx++; mJsx++;
      // Flagship-jsx lessons are exempt from the BODY minimums (level/body/interview
      // are waived by validate-content.mjs:194 for legacy-jsx until they are converted)
      // — but everything that is not the body still applies, and nothing else checks
      // it. Audit exactly that much.
      const sayJ = m => { problems.push(`${rel}: [jsx] ${m}`); mBad++; };
      if (j.status !== 'LIVE') sayJ(`status=${j.status}`);
      if (!j.surfaces?.flagship) sayJ('bodySource "jsx" but no surfaces.flagship');
      const page = `learn/${mod}/${slug0(f)}/index.html`;
      if (!fs.existsSync(page)) sayJ(`page ${page} missing`);
      else {
        const src = fs.readFileSync(page, 'utf8').match(/src="([^"]*\.jsx)"/);
        if (!src) sayJ('page loads no .jsx source');
        else {
          const p = path.posix.normalize(path.posix.join(`learn/${mod}/${slug0(f)}`, src[1]));
          if (!fs.existsSync(p)) sayJ(`flagship source ${p} does not exist`);
        }
      }
      const wantJ = curTitle.get(`${mod}/${slug0(f)}`);
      if (wantJ === undefined) sayJ(`no curriculum.js entry`);
      else if (wantJ !== j.title) sayJ(`title mismatch\n      store:  ${JSON.stringify(j.title)}\n      curric: ${JSON.stringify(wantJ)}`);
      const nbJ = j.surfaces?.notebookFile, numJ = (j.id || '').slice(0, 2);
      if (nbJ && nbByNum.has(numJ) && !nbByNum.get(numJ).has(nbJ)) sayJ(`notebookFile "${nbJ}" not in module_${numJ}`);
      for (const k of ['prereqs', 'leadsTo'])
        for (const r of j[k] || []) if (!allIds.has(r)) sayJ(`${k} "${r}" does not resolve to a lesson`);
      continue;
    }
    if (j.status !== 'LIVE') { other++; problems.push(`${rel}: status=${j.status}`); mBad++; continue; }
    live++; mLive++;

    const slug = f.replace(/\.json$/, '');
    const say = m => { problems.push(`${rel}: ${m}`); mBad++; };

    const i = j.interview || {};
    if (!i.quickGrind || i.quickGrind.length < 10) say(`quickGrind=${i.quickGrind?.length ?? 0} (<10)`);
    if (!i.standard || i.standard.length < 6) say(`standard=${i.standard?.length ?? 0} (<6)`);
    if (!j.flashcards || j.flashcards.length < 8) say(`flashcards=${j.flashcards?.length ?? 0} (<8)`);
    if (!j.refs || j.refs.length < 5) say(`refs=${j.refs?.length ?? 0} (<5)`);
    if (!OK_LEVEL.has(j.level)) say(`level="${j.level}" invalid`);

    const badType = (j.flashcards || []).filter(c => !OK_TYPE.has(c.type)).map(c => c.type);
    if (badType.length) say(`flashcard type(s) ${[...new Set(badType)].join(',')} invalid`);

    for (const s of SECTIONS) if (!j.body?.[s]?.length) say(`body.${s} empty/missing`);

    // title must byte-match curriculum.js
    const want = curTitle.get(`${mod}/${slug}`);
    if (want === undefined) say(`no curriculum.js entry for ${mod}/${slug}`);
    else if (want !== j.title) say(`title mismatch\n      store: ${JSON.stringify(j.title)}\n      curric: ${JSON.stringify(want)}`);

    // notebookFile must exist in the notebooks repo
    const nbFile = j.surfaces?.notebookFile;
    const num = (j.id || '').slice(0, 2);
    if (nbFile && nbByNum.has(num) && !nbByNum.get(num).has(nbFile)) say(`notebookFile "${nbFile}" not in module_${num}`);

    // prereqs / leadsTo must resolve to lessons
    for (const k of ['prereqs', 'leadsTo'])
      for (const r of j[k] || []) if (!allIds.has(r)) say(`${k} "${r}" does not resolve to a lesson`);

    // the SERVED page must be this store lesson — the check that matters at a retired
    // collision, where a store lesson supersedes a sub-lesson at a shared URL, but which
    // applies to every store lesson. __DM_LESSON_SLUG = store lesson page,
    // __DM_CONCEPT_SLUG = sub-lesson page; they must never both appear.
    const page = `learn/${mod}/${slug}/index.html`;
    if (!fs.existsSync(page)) say(`page ${page} missing`);
    else {
      const html = fs.readFileSync(page, 'utf8');
      if (!html.includes(`__DM_LESSON_SLUG = "${slug}"`)) say(`page does not carry __DM_LESSON_SLUG="${slug}"`);
      if (html.includes('__DM_CONCEPT_SLUG')) say(`page still carries __DM_CONCEPT_SLUG (sub-lesson not superseded)`);
      if (!html.includes(`lesson-bodies/${mod}.js`)) say(`page does not load lesson-bodies/${mod}.js`);
      // Exactly ONE bundle, and it must be this module's. The generator builds every
      // store page from learn/foundations/linear-algebra/index.html, which is itself a
      // flagship page — once that lesson gained a drill layer, its bundle tag leaked
      // into all ~220 generated pages (2026-08-16). It rendered correctly only because
      // the correct bundle is assigned last, i.e. it was a load-order accident.
      const bundles = [...html.matchAll(/lesson-bodies\/([^"]+)\.js/g)].map(m => m[1]);
      if (bundles.length !== 1 || bundles[0] !== mod) say(`page loads bundles [${bundles.join(', ')}] — expected exactly ["${mod}"]`);
      // generator folds to ASCII then HTML-escapes (gen-lesson-pages.mjs:26-27)
      const asc = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x00-\x7F]/g, '');
      const esc = s => asc(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const got = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
      const wantT = esc(`${j.id} ${j.title} | ML from Scratch | Derrick Mo`);
      if (got !== wantT) say(`page <title> mismatch\n      page: ${JSON.stringify(got)}\n      want: ${JSON.stringify(wantT)}`);
    }
  }
  perMod.push({ mod, live: mLive, jsx: mJsx, bad: mBad });
}

// collisions: no lesson slug may remain in its module's subLessons.order
let collisions = 0;
for (const f of fs.readdirSync('content/modules')) {
  const m = JSON.parse(fs.readFileSync(`content/modules/${f}`, 'utf8'));
  const slug = f.replace(/\.json$/, '');
  const order = m.subLessons?.order || [];
  const lessons = fs.existsSync(`content/lessons/${slug}`)
    ? fs.readdirSync(`content/lessons/${slug}`).map(x => x.replace(/\.json$/, '')) : [];
  for (const s of order) if (lessons.includes(s)) { problems.push(`content/modules/${f}: COLLISION "${s}" still in subLessons.order`); collisions++; }
  if (m.status !== 'LIVE') problems.push(`content/modules/${f}: module status=${m.status}`);
}

console.log('modules scanned     :', mods);
console.log('store lessons LIVE  :', live);
console.log('flagship-jsx lessons:', jsx, '(exempt)');
console.log('non-LIVE store      :', other);
console.log('unretired collisions:', collisions);
console.log('total               :', live + jsx + other);
const short = perMod.filter(p => p.live + p.jsx !== 10);
console.log('modules not at 10   :', short.length ? short.map(p => `${p.mod}=${p.live}+${p.jsx}`).join(' ') : 'none — all 25 at 10');
console.log('\nPROBLEMS:', problems.length);
const cat = p => p.includes('refs=') ? 'refs<5 (softer than C2 — informational)'
  : p.includes('notebookFile') ? '★ notebookFile does not exist in notebooks repo'
  : p.includes('title mismatch') ? '★ title mismatch vs curriculum.js'
  : p.includes('does not resolve') ? '★ unresolved prereq/leadsTo'
  : p.includes('COLLISION') ? '★ unretired collision'
  : p.includes('[jsx]') ? '★ flagship-jsx metadata' : '★ other';
const byCat = {};
for (const p of problems) (byCat[cat(p)] ||= []).push(p);
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${v.length}] ${k}`);
  const show = k.startsWith('refs') ? v.slice(0, 3) : v;
  show.forEach(p => console.log('   ', p));
  if (show.length < v.length) console.log(`    ... and ${v.length - show.length} more of the same`);
}
if (!problems.length) console.log('  none — every LIVE store lesson passes every invariant.');

// exit non-zero only on real defects; refs<5 is informational
const real = problems.filter(p => !p.includes('refs='));
if (real.length) { console.log(`\nFAIL — ${real.length} real defect(s) (refs<5 excluded as informational).`); process.exit(1); }
console.log('\nOK — no real defects.');
