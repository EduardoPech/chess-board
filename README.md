# chess-board

Chess board UI library — render and interact with chess positions. Supports FEN, drag-and-drop, custom piece/board themes, arrows and circles, last-move/check/legal-move highlights, an optional promotion picker, and keyboard navigation out of the box. **Use [@pech/chess-core](https://eduardopech.github.io/chess-core/) to implement game logic** (rules, legal moves, validation).

**See:** [Documentation and examples](https://eduardopech.github.io/chess-board)

## Install

```bash
npm install @pech/chess-board
# or
bun add @pech/chess-board
```

## Usage

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
board.setCircles([{ square: 'e4' }]);
board.destroy();
```

The board is keyboard-accessible by default (Tab in, arrow keys, Enter/Space, Escape) unless `viewOnly` is set. Right-drag draws an arrow; a plain right-click toggles a circle. Pass `promotionPicker: true` for a built-in promotion-piece picker — `onMove` then receives the chosen piece as a third argument.

### Promotion picker

Set `promotionPicker: true` to show a built-in overlay (queen/rook/bishop/knight) whenever a pawn reaches the last rank. `onMove`'s third argument is the chosen piece:

```ts
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

If the user clicks away from the picker instead of choosing, `onMove` is never called — the move is cancelled and the piece returns to its origin square. See [Promotion picker](https://eduardopech.github.io/chess-board/guides/promotion/) for a full example wired to `@pech/chess-core`.

## Options

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
| `promotionPicker` | `boolean` | Show a built-in piece picker on promotion instead of leaving it to the consumer (default: `false`). |
| `onMove` | `(from, to, promotion?) => boolean \| void` | Called on drop; return `false` to cancel. `promotion` is set when `promotionPicker` resolved a choice. |
| `onSelect` | `(square \| null) => void` | Called when selection changes. |
| `onArrowDrawn` | `(from, to) => void` | Called when user draws arrow (right-drag). |
| `onCircleDrawn` | `(square) => void` | Called when user toggles a circle on (right-click, no drag). |

## API

### Class

- **`ChessBoard`** — Main class. `new ChessBoard(container: HTMLElement, options?: ChessBoardOptions)`.

### FEN

- **`STARTING_FEN`** — Standard starting position FEN string.
- **`parseFen(fen: string)`** — Parse FEN into `Map<SquareKey, Piece>`.
- **`positionToFen(pieces: Map<SquareKey, Piece>)`** — Build FEN from piece map.

### Themes

- **`defaultPieceTheme`** — `PieceTheme` using bundled piece SVGs.
- **`defaultBoardTheme`** — `BoardTheme` (green/brown squares).

### Types

- `SquareKey`, `FileChar`, `RankChar`, `Color`, `PieceType`, `Piece`, `Arrow`, `Circle`, `BoardTheme`, `PieceTheme`, `ChessBoardOptions`.

### Board methods

- **Position:** `setPosition(fen)`, `getPosition()`.
- **Orientation:** `setOrientation(color)`, `getOrientation()`, `flip()`.
- **Selection:** `select(square | null)`.
- **Highlights:** `setLastMove(from, to)`, `clearLastMove()`, `setCheck(square | null)`, `setLegalMoves(squares)`, `clearLegalMoves()`.
- **Arrows:** `setArrows(arrows)`, `addArrow(from, to, color?)`, `removeArrow(from, to)`, `clearArrows()`.
- **Circles:** `setCircles(circles)`, `addCircle(square, color?)`, `removeCircle(square)`, `clearCircles()`.
- **Lifecycle:** `destroy()`.

### Accessibility

With `keyboard: true` (the default unless `viewOnly`), the board is a roving-tabindex grid: Tab into it, use arrow keys to move focus one square at a time (orientation-aware), Enter/Space to select or move like a click, and Escape to deselect. Selections and moves are announced through a visually-hidden `aria-live="polite"` region.

## Implementing the logic with chess-core

We recommend using **[@pech/chess-core](https://eduardopech.github.io/chess-core/)** for all game logic: legal moves, move validation, FEN handling, and check/checkmate. Install it and wire it to the board:

```bash
npm install @pech/chess-core
# or
bun add @pech/chess-core
```

```ts
import { ChessBoard, STARTING_FEN, type PieceType } from '@pech/chess-board';
import { fromFen, toFen, getLegalMoves, makeMove, fromUci, toUci } from '@pech/chess-core';

// chess-board's promotion type is the full word ('queen'); UCI wants a
// single letter as the 5th character (e.g. "e7e8q").
const PROMO_TO_UCI: Record<PieceType, string> = {
  queen: 'q', rook: 'r', bishop: 'b', knight: 'n', king: '', pawn: '',
};

const container = document.getElementById('board')!;
let position = fromFen(STARTING_FEN);

const board = new ChessBoard(container, {
  position: STARTING_FEN,
  orientation: 'white',
  draggable: true,
  promotionPicker: true,
  onMove(from, to, promotion) {
    const uci = from + to + (promotion ? PROMO_TO_UCI[promotion] : '');
    const move = fromUci(position, uci);
    if (!move) return false;

    const newPos = makeMove(position, move);
    board.setPosition(toFen(newPos));
    board.setLastMove(from, to);
    board.setLegalMoves(getLegalMoves(newPos).map((m) => toUci(m).slice(2, 4)));
    position = newPos;
    return true;
  },
});
board.setLegalMoves(getLegalMoves(position).map((m) => toUci(m).slice(2, 4)));
```

**Docs:** [chess-core — Getting started & API](https://eduardopech.github.io/chess-core/)

## Development

```bash
bun install          # install dependencies
bun run test         # run tests
bun run test:watch   # run tests in watch mode
bun run build        # build with tsup
bun run typecheck    # type-check without emitting
```

## License

MIT
