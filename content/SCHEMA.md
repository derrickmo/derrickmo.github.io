# Canonical Content Store — Schema v1 (FROZEN 2026-06-10)

This directory is the **single source of truth** for the ML curriculum content.
The website's window-global `.js` data files are *generated* from it; the
notebooks repo and the mobile app consume the compiled `content.json`.

**Schema v1 is FROZEN.** Additive changes (new optional fields) bump
`contentVersion`. Breaking changes (renames, removals, type changes) require a
`schemaVersion` bump and a migration note here — avoid until after app launch.

## Layout

```
content/
  SCHEMA.md                                  this file (normative)
  meta.json                                  { schemaVersion, contentVersion, updatedAt }
  modules/<module-slug>.json                 25 files - one per module
  lessons/<module-slug>/<lesson-slug>.json   250 files - one per curriculum lesson
  concepts/<module-slug>/<concept-id>.json   one per taught sub-lesson (104 at seed)
```

A build step compiles the tree into one versioned `content.json`
(modules + lessons + concepts arrays, plus `meta`). The app pins a
`contentVersion` and refreshes from the hosted JSON — no backend.

## Common rules

- All files are UTF-8 JSON, 2-space indent.
- Every file carries `"kind"` and `"schemaVersion": 1`.
- Every file carries `"updatedAt": "YYYY-MM-DD"` (set when content changes, not on re-generation).
- `status` enum everywhere: `"PENDING"` | `"DRAFT"` | `"LIVE"`.
- Math is KaTeX strings (no surrounding `$`). Code is Python unless a
  `lang` field says otherwise.
- IDs:
  - module slug: kebab-case, matches `curriculum.js` (`agentic-ai`).
  - lesson id: `"NN-MM"` (`"21-01"`); lesson slug: kebab-case unique within module.
  - lesson ref (cross-file): `"<module-slug>/<lesson-slug>"` (`"agentic-ai/agent-loop"`).
  - concept id: kebab-case, matches `concepts-index.js` / `sub-lessons.js` keys.

## kind: "module"  (modules/<slug>.json)

Mirror of one `curriculum.js` module head + its `lectures.js` entry +
`LECTURE_CODE` snippet + the `SUB_LESSONS` wrapper.

| field | type | req | notes |
|---|---|---|---|
| kind | "module" | yes | |
| schemaVersion | 1 | yes | |
| n | string "NN" | yes | zero-padded, equals position |
| slug | string | yes | |
| title | string | yes | |
| category | string | yes | one of the 12 tracks (see curriculum.js) |
| blurb | string | yes | hub card copy |
| status | enum | yes | module-level status |
| lecture | object | yes | `{ summary, prereqs, takeaways[3+], flagships[]?, notebooks[10] }` — notebooks rows are `{ n, t, d, m }`; `flagships` entries are `{ n, label, href }` |
| snippet | object | yes | `{ caption, code }` → LECTURE_CODE |
| subLessons | object | no | `{ title, intro, order[] }` — wrapper for sub-lessons.js; `order` lists concept ids in display order |
| updatedAt | string | yes | |

## kind: "lesson"  (lessons/<module-slug>/<lesson-slug>.json)

One of the 250 curriculum lessons. A **stub** (status PENDING) needs only the
identity block. `body`, `interview`, `flashcards` become **required at LIVE**.

| field | type | req | notes |
|---|---|---|---|
| kind | "lesson" | yes | |
| schemaVersion | 1 | yes | |
| id | "NN-MM" | yes | matches curriculum.js `n` |
| slug | string | yes | |
| module | string | yes | parent module slug |
| title | string | yes | |
| status | enum | yes | |
| level | enum | LIVE | "intro" \| "core" \| "advanced" |
| bodySource | enum | no | `"store"` (default) \| `"jsx"` — transitional: the authored content still lives in a legacy flagship `.jsx` page. At LIVE, `"jsx"` waives the `body`/`interview`/`flashcards`/`refs`/`level` minimums **iff** `surfaces.flagship` resolves. Phase C flips each to `"store"`. |
| prereqs | string[] | no | lesson refs (`"module/lesson"`) |
| leadsTo | string[] | no | lesson refs |
| surfaces | object | yes | see below |
| body | object | LIVE | see below |
| interview | object | LIVE | see below |
| flashcards | array | LIVE | see below |
| refs | array | LIVE | `{ title, url }[]` — papers/docs |
| updatedAt | string | yes | |

### lesson.surfaces
```json
{
  "notebook": true,            // a notebook exists (URL derives from CURRICULUM.notebookUrl)
  "flagship": "learn/agentic-ai/agent-loop/" ,  // on-site full lesson page, or null
  "demos": ["pathfinding"],    // play-demos.js slugs
  "concepts": ["agent-loop"]   // concepts-index.js ids this lesson teaches/uses
}
```

### lesson.body (the walk-through; section order is the render order)
```json
{
  "intuition":   ["para", "para"],
  "math":        [{ "h": "heading", "paras": ["..."], "tex": "...", "texNote": "plain-words read of the formula" }],
  "code":        [{ "h": "heading", "paras": ["..."], "code": "python...", "caption": "..." }],
  "useCases":    ["where this is used, one per line"],
  "pitfalls":    ["failure mode, one per line"],
  "connections": [{ "ref": "transformers/self-attention", "text": "why it relates" }]
}
```
All six keys required at LIVE; `math[].tex`, `code[].code` required inside
their entries; `connections[].ref` optional (free-text links allowed).

### lesson.interview (3 tiers; minimums enforced at LIVE)
```json
{
  "quickGrind": [{ "q": "...", "a": "one-liner" }],                  // >= 10
  "standard":   [{ "q": "...", "a": "complete answer",
                   "deepDive": { "q": "follow-up", "a": "derivation" } }]  // >= 6
}
```

### lesson.flashcards (>= 8 at LIVE)
```json
[{ "type": "definition" | "formula" | "intuition" | "pitfall",
   "front": "...", "back": "..." }]
```

## kind: "concept"  (concepts/<module-slug>/<concept-id>.json)

Exact migration of one `SUB_LESSONS[<module>].lessons[<id>]` entry — the taught
concept pages at `learn/<module>/<concept-id>/`.

| field | type | req | notes |
|---|---|---|---|
| kind | "concept" | yes | |
| schemaVersion | 1 | yes | |
| id | string | yes | concept id (page dir name) |
| module | string | yes | parent module slug |
| title | string | yes | |
| oneLine | string | yes | |
| sections | array | yes | `{ h, paras?, tex?, texNote?, code?, caption? }[]` |
| takeaways | string[] | yes | |
| demo | string\|null | no | play-demos slug |
| updatedAt | string | yes | |

## Validation

`node _private/scripts/validate-content.mjs` — must be **green before any
generation or release**. It checks: JSON validity, required fields per kind,
enum values, id formats and uniqueness, module/lesson agreement with
`curriculum.js`, concept-id resolution against `concepts-index.js` (warn) and
`sub-lessons.js`, demo slugs against `play-demos.js`, flagship hrefs against
files on disk, prereq/leadsTo resolution, and the LIVE-status minimums
(interview 10/6, flashcards 8, all body sections).

## Worked examples

See `modules/agentic-ai.json` (module) and `lessons/agentic-ai/agent-loop.json`
(lesson stub) in this directory — they are real seed files, kept valid.
