#!/usr/bin/env node
// check-page-assets.mjs — guards the one failure the other checks cannot see.
//
// validate-content.mjs checks the store, gen-lesson-pages.mjs checks collisions and
// `npm run build` checks that the bundle compiles. None of them check that a file a
// COMMITTED page points at is itself committed. That gap shipped for real: modules
// 23, 24, 25, 19 and 20 committed 62 learn/<module>/<slug>/index.html pages while
// their lesson-bodies/<module>.js bundles stayed untracked, so a fresh clone would
// have 404d the body script on 48 lessons and rendered them empty. Nothing errored
// locally, because locally the files were on disk.
//
// So: for every tracked .html page, resolve each local src=/href= asset and require
// that it (a) exists and (b) is tracked by git. Root-absolute URLs resolve against
// public/ first (Vite copies public/* to the dist root) and then the repo root.
//
// Usage: node scripts/check-page-assets.mjs
// Exits 1 on any broken or untracked reference.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ASSET_RE = /\.(js|mjs|jsx|css|json|png|jpg|jpeg|svg|webp|ico|woff2?|xml|txt|ipynb)$/i;
const SKIP_RE = /^(https?:|data:|mailto:|tel:|javascript:|#|\/\/)/;

const tracked = new Set(
  execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(Boolean)
    .map(s => s.split(path.win32.sep).join('/'))
);

const pages = [...tracked].filter(f => f.endsWith('.html'));
const broken = [];
const untracked = [];
let refs = 0;

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const dir = path.posix.dirname(page);

  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    let url = m[1];
    if (SKIP_RE.test(url)) continue;
    url = url.split('#')[0].split('?')[0];
    if (!url || !ASSET_RE.test(url)) continue;
    refs++;

    // public/ is the dist root, so /foo.svg ships as public/foo.svg.
    const candidates = url.startsWith('/')
      ? ['public' + url, url.slice(1)].map(p => path.posix.normalize(p))
      : [path.posix.normalize(path.posix.join(dir, url))];

    const found = candidates.find(c => fs.existsSync(c));
    if (!found) broken.push(`${page} -> ${url}`);
    else if (!tracked.has(found)) untracked.push(`${page} -> ${found}`);
  }
}

const distinct = list => [...new Set(list.map(s => s.split(' -> ')[1]))];

console.log(`pages scanned    : ${pages.length}`);
console.log(`local asset refs : ${refs}`);

for (const [label, list] of [['BROKEN (no such file)', broken], ['UNTRACKED (would 404 on a fresh clone)', untracked]]) {
  if (!list.length) continue;
  const d = distinct(list);
  console.log(`\n!! ${label}: ${list.length} refs, ${d.length} distinct`);
  for (const target of d.slice(0, 25)) {
    const from = list.filter(s => s.endsWith('-> ' + target));
    console.log(`   ${target}   <- ${from.length} page${from.length === 1 ? '' : 's'}, e.g. ${from[0].split(' -> ')[0]}`);
  }
  if (d.length > 25) console.log(`   ... and ${d.length - 25} more`);
}

if (broken.length || untracked.length) {
  console.log(`\nFAIL — ${broken.length} broken, ${untracked.length} untracked.`);
  console.log('If a target is generated output, it belongs in the commit: git add <path>.');
  process.exit(1);
}

console.log('\nOK — every referenced asset exists and is tracked.');
