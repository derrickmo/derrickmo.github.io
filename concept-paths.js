// concept-paths.js — prerequisite closure over the concept graph, plus the store of
// what the reader says they already know.
//
// The 11 curated learning paths were hand-written. The concept graph has 188 nodes
// with prerequisite edges and no cycles, which means "what do I need to learn before
// X?" is a topological sort over the prerequisite closure — computable for every one
// of the 188, in under a millisecond, with nothing authored.
//
// The curated paths stay. They are editorially better: grouped into named stages with
// copy explaining WHY each step is there. Generated paths are the long tail.
//
// Loaded after concepts-index.js, before any app that uses it.

(function () {
  const CI = (typeof window !== "undefined" && window.CONCEPTS_INDEX) || {};
  const REV = (typeof window !== "undefined" && window.CONCEPT_REVERSE) || {};

  // Filter to ids that actually exist. Dangling prereqs were fixed (GR-0001..0005),
  // but a path that silently drops a step is a worse failure than one that is short,
  // so the guard stays.
  const prereqsOf = (id) => ((CI[id] && CI[id].prereqs) || []).filter((p) => CI[p]);

  // Depth-first post-order = valid teaching order: nothing appears before something
  // it depends on. `known` prunes whole subtrees, which is what makes a personalised
  // path collapse from ten steps to three rather than just hiding rows.
  function pathTo(target, known) {
    known = known || new Set();
    if (!CI[target]) return { target: target, steps: [], truncated: false, missing: true };
    const order = [], visiting = new Set(), done = new Set();
    let truncated = false;
    (function visit(id, depth) {
      if (done.has(id) || known.has(id)) return;
      // The graph has no cycles today and a validator would catch one, but a cycle
      // here would hang the page rather than fail a build, so it is guarded.
      if (visiting.has(id)) { truncated = true; return; }
      if (depth > 40) { truncated = true; return; }
      visiting.add(id);
      for (const p of prereqsOf(id)) visit(p, depth + 1);
      visiting.delete(id);
      done.add(id);
      order.push(id);
    })(target, 0);
    return { target: target, steps: order, truncated: truncated, missing: false };
  }

  // What a reader can actually click for a step. CONCEPT_REVERSE[id] is a flat array
  // of {kind, slug} — not an object of lists, which is easy to get wrong.
  function surfacesFor(id) {
    const all = REV[id] || [];
    return {
      demos: all.filter((x) => x.kind === "demo").map((x) => x.slug),
      games: all.filter((x) => x.kind === "game").map((x) => x.slug),
      modules: all.filter((x) => x.kind === "module").map((x) => x.slug),
    };
  }

  window.DM_CONCEPT_PATH = {
    pathTo: pathTo,
    prereqsOf: prereqsOf,
    surfacesFor: surfacesFor,
    has: (id) => !!CI[id],
    get: (id) => CI[id] || null,
    all: () => Object.keys(CI),
  };

  // ── what the reader has marked as understood ────────────────────────────────
  // Same shape and the same defensive reads as DM_PATHS in paths.js: one namespaced
  // key, try/catch everywhere, private mode degrades to in-memory.
  const KEY = "dm_known_v1";
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode */ } }

  window.DM_KNOWN = {
    has: (id) => !!read()[id],
    set: (id, on) => { const o = read(); if (on) o[id] = 1; else delete o[id]; write(o); },
    toggle: (id) => { const o = read(); if (o[id]) delete o[id]; else o[id] = 1; write(o); return !!o[id]; },
    ids: () => Object.keys(read()),
    setObj: () => new Set(Object.keys(read())),
    count: () => Object.keys(read()).length,
    clear: () => write({}),
  };
})();
