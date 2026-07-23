# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@pech/chess-board` — a zero-runtime-dependency TypeScript library that renders an interactive chess board in the DOM (FEN positions, drag-and-drop, highlights, arrows/circles, promotion picker, keyboard navigation). Game logic (legal moves, validation, check/checkmate) is deliberately **out of scope** — it belongs in the companion package `@pech/chess-core`, which consumers wire up via callbacks (e.g. return `false` from `onMove` to cancel a move).

## Commands

Bun is the package manager.

```bash
bun install                        # install dependencies
bun run test                       # run all tests (vitest run)
bun run test:watch                 # tests in watch mode
bunx vitest run tests/board.test.ts # run a single test file
bun run typecheck                  # tsc --noEmit (no ESLint; this is the lint step)
bun run build                      # tsup → dist/ (ESM + CJS + .d.ts, minified)
bun run size                       # build + assert dist/index.js gzip stays under budget
bun run docs:dev                   # Astro docs site dev server
bun run docs:build                 # build docs site
bun scripts/optimize-pieces.ts     # re-run SVGO over src/pieces-svg.ts (only after changing piece art)
```

## Architecture

- `src/board.ts` — the `ChessBoard` class, the DOM adapter. It owns all rendering state (pieces map, orientation, drag/promotion state) and translates raw PointerEvents/KeyboardEvents into calls against the pure decision modules below, then executes whatever intent comes back against the DOM. It does **not** contain interaction *decision logic* itself — see `input.ts`.
- `src/input.ts` — pure, DOM-free decision layer for pointer interaction: given a snapshot of selection/legal-squares state and a press/release event, `decidePress`/`decideClickRelease`/`decideDragRelease`/`decideShapeRelease` return an intent (attempt a move, start a drag, select, toggle a circle, …). `board.ts` is a thin adapter around these — this is where the click/drag/arrow precedence rules actually live and where they're unit-tested (`tests/input.test.ts`), without a browser.
- `src/highlights.ts` — `HighlightTracker` bookkeeps which squares carry which CSS class (`cb-hl-selected`, `cb-legal`, `cb-has-piece`, `cb-drag-over`, …) so updates touch only the squares that changed instead of scanning all 64. One instance covers every per-square class the board toggles, not just "highlights" in the visual sense.
- `src/dom.ts` — square/piece DOM construction. `reassignSquares` re-labels the *existing* 64 square divs for a new orientation instead of destroying and recreating them (divs stay at a fixed CSS-grid position; only `data-square`/class/coord-labels change) — callers must clear tracked highlight classes first via `HighlightTracker.clearAll()`, since a reused div would otherwise keep a class from the square it used to represent.
- `src/shapes.ts` — renders arrows and circles into the shared SVG overlay (right-drag = arrow, right-press-and-release-on-the-same-square = circle, decided in `input.ts`'s `decideShapeRelease`).
- `src/promotion.ts` — the promotion-piece picker overlay (opt-in via `promotionPicker`). Pure UI: it has no chess logic, just presents 4 choices and calls back with the pick or a cancellation.
- `src/keyboard.ts` — pure arrow-key → next-square logic (`moveFocus`), orientation-aware. `board.ts` owns the DOM side: roving `tabindex`, `role="grid"`/`"gridcell"`, and an `aria-live` announcer.
- `src/coords.ts` is the single source of truth for square ↔ grid-coordinate mapping, including white/black orientation flipping. Don't do coordinate math elsewhere.
- `src/fen.ts` parses/serializes only the piece-placement field of a FEN string, to/from `Map<SquareKey, Piece>`.
- `setPosition(fen)` never rebuilds the board wholesale for small changes. `src/diff.ts` computes moved/added/removed pieces between the old and new maps (matching disappeared/appeared pieces of the same type) so moves animate; a diff over 8 changes falls back to a full re-render.
- The public API surface is exactly what `src/index.ts` re-exports; keep it in sync when adding exports.

## Conventions

- tsconfig is maximally strict: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax`. Imports use explicit `.ts` extensions (`allowImportingTsExtensions` + bundler resolution).
- Tests live in `tests/`, one file per `src/` module, using per-file `// @vitest-environment happy-dom` (see `tests/board.test.ts`) for DOM-dependent modules and the default node environment for pure ones (`input.ts`, `highlights.ts`, `keyboard.ts`, `diff.ts`, `coords.ts`, `fen.ts`). Pointer-drag interaction (anything depending on `getBoundingClientRect()`-based square detection) isn't exercised in tests — happy-dom has no real layout engine — and is verified manually via `bun run docs:dev` instead. Keyboard interaction *is* fully testable (no layout dependency) and has full coverage.
- `dist/index.js` has a gzip size budget enforced by `bun run size` / `scripts/check-size.ts` (see `adr/0001-default-pieces-bundled.md` for the bundle-weight tradeoffs behind it).
- `docs/` is a separate Astro Starlight workspace with its own `package.json`, deployed to GitHub Pages by `.github/workflows/deploy-docs.yml` on push to `main`. It is unrelated to `adr/` (architecture decision records), which lives at the repo root.
