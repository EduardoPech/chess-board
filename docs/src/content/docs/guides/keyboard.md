---
title: Keyboard accessibility
description: Navigate and move pieces on the board without a mouse.
---

The board is keyboard-accessible by default — no configuration needed. It's a [roving-tabindex](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) grid (`role="grid"` / `role="gridcell"` on each square), so it plays well with screen readers and doesn't trap Tab focus.

## Controls

| Key | Action |
|-----|--------|
| Tab | Move focus into (or out of) the board, landing on the last-focused square |
| Arrow keys | Move focus one square at a time, in the visual direction — orientation-aware, so "up" is always toward the top of the screen even when the board is flipped |
| Enter / Space | Select the focused square, or — if a piece is already selected — attempt a move to the focused square, exactly like a mouse click |
| Escape | Deselect |

Selections and completed moves are announced through a visually-hidden `aria-live="polite"` region (e.g. "white knight on g1 selected", "white knight g1 to f3"), so screen reader users get the same feedback sighted users get from the highlight classes.

## Basic usage

Keyboard navigation is on by default (unless `viewOnly` is set), so most consumers don't need to touch this option at all:

```ts
import { ChessBoard } from '@pech/chess-board';

const board = new ChessBoard(container, {
  onMove(from, to) {
    return true;
  },
});
// Tab into `container`, then use arrow keys + Enter + Escape.
```

## Disabling it

For a purely mouse/touch-driven board — or a read-only diagram where Tab-stopping on 64 squares would be more annoying than useful — turn it off explicitly:

```ts
const board = new ChessBoard(container, {
  keyboard: false,
});
```

`viewOnly: true` disables keyboard navigation by default too, since there's nothing to select or move. Pass `keyboard: true` alongside `viewOnly` if you still want arrow-key focus movement without selection (e.g. to let a screen reader user explore the position square by square).

## How selection and legal moves interact

Enter/Space on the focused square follows the same rules as clicking: pressing it on a square with a piece selects that piece (if `clickable` is enabled), and pressing it again on a different square attempts a move there — accepted or rejected by your `onMove` handler exactly as with the mouse. Pair it with [`setLegalMoves`](/chess-board/reference/api/) so keyboard users get the same visual (and audible) feedback about which moves are available.
