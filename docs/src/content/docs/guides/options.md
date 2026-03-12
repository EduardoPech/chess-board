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
| `animationDuration` | `number` | Move animation ms. |
| `pieceTheme` | `PieceTheme` | Function (piece) => SVG string. |
| `boardTheme` | `BoardTheme` | `{ lightSquare, darkSquare }` colors. |
| `onMove` | `(from, to) => boolean \| void` | Called on drop; return `false` to cancel. |
| `onSelect` | `(square \| null) => void` | Called when selection changes. |
| `onArrowDrawn` | `(from, to) => void` | Called when user draws arrow (right-drag). |
