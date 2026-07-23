# ADR-0001: Keep default piece SVGs bundled, optimized in place

**Status:** Accepted
**Date:** 2026-07-22

## Context

A bundle-size audit found the library shipped at 63 KB raw / 14.3 KB gzip, with ~30 KB of that being `src/pieces-svg.ts` — inline SVG markup for the 12 default pieces at `viewBox 4096`, unoptimized (4-decimal path precision, stray attributes). Compared against chessground (10 KB gzip, no bundled default piece art at all — consumers supply their own), this was the single largest lever on package weight.

## Decision

Keep the default piece SVGs bundled in `src/pieces-svg.ts`, but run them through SVGO once (`scripts/optimize-pieces.ts`, precision-0 path data) and commit the optimized output. Do **not** split them into a separate `@pech/chess-board/pieces` subpath export.

## Options Considered

### Option A: Optimize in place (chosen)
| Dimension | Assessment |
|-----------|------------|
| Size impact | 30 KB → ~15 KB raw for the piece data (~50% smaller) |
| API impact | None — `defaultPieceTheme` behaves identically |
| Consumer impact | Zero-config `new ChessBoard(el)` keeps working out of the box |

**Pros:** No breaking change, no new build step for consumers, board still renders a full set with zero configuration.
**Cons:** Consumers who bring their own `pieceTheme` still pay for the bundled default set in their bundle (tree-shaking only removes it if `defaultPieceTheme` is never imported/referenced — which it always is, since `index.ts` re-exports it unconditionally).

### Option B: Subpath export (`@pech/chess-board/pieces`)
| Dimension | Assessment |
|-----------|------------|
| Size impact | Core drops to ~4 KB gzip when a custom theme is used |
| API impact | Breaking — `defaultPieceTheme` moves, or the board renders nothing without an explicit theme |
| Consumer impact | Every existing zero-config consumer breaks or silently gets a blank board |

**Pros:** Best possible size for consumers who supply their own theme.
**Cons:** Breaking change for a library whose whole value proposition is "renders a board with sensible defaults out of the box." Rejected — not worth the breakage for a library still early in its API stability window.

### Option C: Redraw a minimal piece set
Smaller theoretical floor (~4 KB), but means redrawing all 12 pieces and changing the library's visual identity. Rejected as disproportionate effort/risk for the size win; SVGO optimization alone gets most of the benefit for free.

## Consequences

- Default rendering stays zero-config; `defaultPieceTheme` is always in the bundle.
- Future default-piece-set changes must re-run `scripts/optimize-pieces.ts` and re-verify visually — see [`scripts/optimize-pieces.ts`](../scripts/optimize-pieces.ts).
- `scripts/check-size.ts` (run via `bun run size`) guards against silent regressions with a 15 KB gzip budget on `dist/index.js`.
- If a future major version wants a true minimal core, Option B (subpath export) is the documented path — this ADR is the record of why it wasn't chosen now, so it doesn't need re-litigating from scratch.
