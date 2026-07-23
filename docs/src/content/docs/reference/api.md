---
title: API
description: chess-board public API reference.
---

## Class

- **`ChessBoard`** — Main class. `new ChessBoard(container: HTMLElement, options?: ChessBoardOptions)`.

## FEN

- **`STARTING_FEN`** — Standard starting position FEN string.
- **`parseFen(fen: string)`** — Parse FEN into `Map<SquareKey, Piece>`.
- **`positionToFen(pieces: Map<SquareKey, Piece>)`** — Build FEN from piece map.

## Themes

- **`defaultPieceTheme`** — `PieceTheme` using bundled piece SVGs.
- **`defaultBoardTheme`** — `BoardTheme` (green/brown squares).

## Types

`SquareKey`, `FileChar`, `RankChar`, `Color`, `PieceType`, `Piece`, `Arrow`, `Circle`, `BoardTheme`, `PieceTheme`, `ChessBoardOptions`.

## Board methods

- **Position:** `setPosition(fen)`, `getPosition()`.
- **Orientation:** `setOrientation(color)`, `getOrientation()`, `flip()`.
- **Selection:** `select(square | null)`.
- **Highlights:** `setLastMove(from, to)`, `clearLastMove()`, `setCheck(square | null)`, `setLegalMoves(squares)`, `clearLegalMoves()`.
- **Arrows:** `setArrows(arrows)`, `addArrow(from, to, color?)`, `removeArrow(from, to)`, `clearArrows()`.
- **Circles:** `setCircles(circles)`, `addCircle(square, color?)`, `removeCircle(square)`, `clearCircles()`.
- **Lifecycle:** `destroy()`.

## Accessibility

With `keyboard: true` (the default unless `viewOnly`), the board exposes a roving-tabindex grid (`role="grid"` / `role="gridcell"`): Tab into the board, arrow keys move focus one square at a time (orientation-aware), Enter/Space selects or moves like a click, and Escape deselects. Selection and move events are announced through a visually-hidden `aria-live="polite"` region.
