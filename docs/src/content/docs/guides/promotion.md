---
title: Promotion picker
description: Show a built-in piece picker when a pawn reaches the last rank.
---

By default, chess-board doesn't do anything special when a pawn reaches the last rank — it just moves the piece, and it's up to your `onMove` handler (typically backed by [@pech/chess-core](/chess-board/guides/integration-chess-core/) or a similar library) to decide what happens. Set `promotionPicker: true` to have the board show a 4-choice overlay (queen, rook, bishop, knight) and pass the choice back to you.

## Basic usage

```ts
import { ChessBoard } from '@pech/chess-board';

const board = new ChessBoard(container, {
  promotionPicker: true,
  onMove(from, to, promotion) {
    // `promotion` is set (e.g. 'queen') only when the picker resolved a
    // choice for this move — undefined for every other move.
    console.log(from, to, promotion);
    return true;
  },
});
```

The board detects a promotion move on its own — any pawn moving to rank 8 (white) or rank 1 (black) — so you don't need to tell it anything about the position. When the user picks a piece, `onMove` is called once with that choice as the third argument. If the user clicks away from the picker instead of choosing, `onMove` is never called and the move is treated as cancelled — the piece returns to its origin square, exactly like a rejected move.

## Applying the promotion in your own state

If you're driving game logic yourself, use the `promotion` argument to build whatever move representation your engine expects. For UCI-style engines (like `@pech/chess-core`), that's usually a 5th character on the move string:

```ts
import type { PieceType } from '@pech/chess-board';

const PROMO_TO_UCI: Record<PieceType, string> = {
  queen: 'q', rook: 'r', bishop: 'b', knight: 'n', king: '', pawn: '',
};

onMove(from, to, promotion) {
  const uci = from + to + (promotion ? PROMO_TO_UCI[promotion] : '');
  // ...resolve `uci` against your engine, apply the result, return true/false
}
```

See the [interactive example](/chess-board/guides/example/) for the full, working version of this pattern against chess-core.

## Without the picker

If you'd rather build your own promotion UI — or your game logic always promotes to queen — just leave `promotionPicker` unset (the default, `false`). `onMove` is called the same way it always was, with only `from` and `to`; you decide what piece to promote to.
