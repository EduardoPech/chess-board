---
title: Options
description: ChessBoard constructor options reference.
---

| Option | Type | Description |
|--------|------|-------------|
| `position` | `string` | Initial FEN (default: starting position). |
| `orientation` | `'white' \| 'black'` | Board orientation. |
| `draggable` | `boolean` | Allow dragging pieces. |
| `clickable` | `boolean` | Allow square selection/clicks. |
| `viewOnly` | `boolean` | No drag or selection. |
| `coordinates` | `boolean` | Show file/rank labels. |
| `keyboard` | `boolean` | Arrow-key navigation + Enter/Space select-or-move (default: `true`, unless `viewOnly`). |
| `animationDuration` | `number` | Move animation ms. |
| `pieceTheme` | `PieceTheme` | Function (piece) => SVG string. |
| `boardTheme` | `BoardTheme` | `{ lightSquare, darkSquare }` colors. |
| `promotionPicker` | `boolean` | Show a built-in picker for the promotion piece instead of leaving it to the consumer (default: `false`). |
| `onMove` | `(from, to, promotion?) => boolean \| void` | Called on drop; return `false` to cancel. `promotion` is set when `promotionPicker` resolved a choice. |
| `onSelect` | `(square \| null) => void` | Called when selection changes. |
| `onArrowDrawn` | `(from, to) => void` | Called when user draws arrow (right-drag). |
| `onCircleDrawn` | `(square) => void` | Called when user toggles a circle on (right-click, no drag). |
