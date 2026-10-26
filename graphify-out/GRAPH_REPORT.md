# Graph Report - site  (2026-10-26)

## Corpus Check
- 2 files · ~40,969 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .woff2 1, .css 1)

## Summary
- 44 nodes · 82 edges · 6 communities (4 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `026de4a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- site.js
- setWheel
- run
- render
- scene

## God Nodes (most connected - your core abstractions)
1. `render()` - 10 edges
2. `run()` - 10 edges
3. `setWheel()` - 7 edges
4. `setHint()` - 6 edges
5. `endDrag()` - 6 edges
6. `extOf()` - 5 edges
7. `startPick()` - 5 edges
8. `wedge()` - 4 edges
9. `esc()` - 4 edges
10. `finish()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `kindOf()` --calls--> `extOf()`  [EXTRACTED]
  site.js → site.js  _Bridges community 2 → community 1_
- `showFolder()` --calls--> `esc()`  [EXTRACTED]
  site.js → site.js  _Bridges community 3 → community 2_
- `setWheel()` --calls--> `render()`  [EXTRACTED]
  site.js → site.js  _Bridges community 3 → community 1_
- `scene()` --calls--> `setHint()`  [EXTRACTED]
  site.js → site.js  _Bridges community 1 → community 4_

## Import Cycles
- None detected.

## Communities (6 total, 2 thin omitted)

### Community 0 - "site.js"
Cohesion: 0.13
Nodes (14): ACTION_DONE, bars, desk, hint, HINTS, KEYMODE, revealIO, S (+6 more)

### Community 1 - "setWheel"
Cohesion: 0.29
Nodes (10): endDrag(), finish(), hit(), kindOf(), openFromDrag(), setHint(), setWheel(), startPick() (+2 more)

### Community 2 - "run"
Cohesion: 0.29
Nodes (8): addFile(), extOf(), fmt(), freeName(), kbOf(), run(), showFolder(), toast()

### Community 3 - "render"
Cohesion: 0.36
Nodes (8): annulus(), esc(), label(), pill(), pt(), rad(), render(), wedge()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `run()` connect `run` to `site.js`, `setWheel`, `render`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `site.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `render()` connect `render` to `site.js`, `setWheel`, `run`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `setWheel()` connect `setWheel` to `site.js`, `render`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._