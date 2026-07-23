---
title: Arrows & circles
description: Draw arrows and circles on the board, programmatically or via right-click.
---

The board renders arrows and circles into a shared SVG overlay. Users can draw them interactively with the right mouse button — no configuration needed — or you can set them programmatically, e.g. to show engine suggestions or annotate a puzzle.

## Interactive drawing

- **Right-drag** from one square to another draws an arrow.
- **Right-click without dragging** (press and release on the same square) toggles a circle on that square.
- **Left-click** anywhere on the board clears all drawn arrows and circles.

```ts
import { ChessBoard } from '@pech/chess-board';

const board = new ChessBoard(container, {
  onArrowDrawn(from, to) {
    console.log(`arrow: ${from} -> ${to}`);
  },
  onCircleDrawn(square) {
    console.log(`circle: ${square}`);
  },
});
```

## Setting shapes programmatically

Use these to highlight engine lines, puzzle solutions, or anything else that doesn't come from the user's own right-click.

```ts
// Arrows
board.setArrows([
  { from: 'e2', to: 'e4', color: '#4a90d9' },
  { from: 'g1', to: 'f3' }, // color defaults to green
]);
board.addArrow('d2', 'd4', '#e67e22');
board.removeArrow('d2', 'd4');
board.clearArrows();

// Circles
board.setCircles([{ square: 'e4' }, { square: 'e5', color: 'red' }]);
board.addCircle('f7', '#e74c3c');
board.removeCircle('f7');
board.clearCircles();
```

`setArrows`/`setCircles` replace the full set; `add*`/`remove*` are additive and are exactly what the built-in right-click interaction calls under the hood.

## Example: highlighting an engine's top move

```ts
import type { ChessBoard, SquareKey } from '@pech/chess-board';

function showEngineSuggestion(board: ChessBoard, from: SquareKey, to: SquareKey) {
  board.clearArrows();
  board.addArrow(from, to, '#2ecc71');
}
```

Arrows and circles are purely visual — the board has no chess logic, so nothing stops a user from drawing an arrow through an illegal move. That's intentional: annotation is a UI concern, and pairs well with `viewOnly: true` for read-only diagram/puzzle displays where you still want the ability to draw on top of the position.
