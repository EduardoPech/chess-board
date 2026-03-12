---
title: Usage
description: Basic usage of ChessBoard with FEN and options.
---

```ts
import { ChessBoard, STARTING_FEN } from '@pech/chess-board';

const container = document.getElementById('board')!;
const board = new ChessBoard(container, {
  position: STARTING_FEN,
  orientation: 'white',
  draggable: true,
  onMove(from, to) {
    // Validate with @pech/chess-core and return false to cancel
    return true;
  },
});

// Update position from FEN
board.setPosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
board.setLastMove('e2', 'e4');
board.setLegalMoves(['e5', 'e6']);
board.setArrows([{ from: 'e2', to: 'e4', color: '#888' }]);
board.destroy();
```
