# chess-board

Chess board UI library — render and interact with chess positions. Supports FEN, drag-and-drop, custom piece/board themes, arrows, last-move and legal-move highlights. Built to work with [@pech/chess-core](https://github.com/EduardoPech/chess-core) for rules and move validation.

**Documentation:** [https://eduardopech.github.io/chess-board](https://eduardopech.github.io/chess-board)

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
board.destroy();
```

## Options

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

- `SquareKey`, `FileChar`, `RankChar`, `Color`, `PieceType`, `Piece`, `Arrow`, `BoardTheme`, `PieceTheme`, `ChessBoardOptions`.

### Board methods

- **Position:** `setPosition(fen)`, `getPosition()`.
- **Orientation:** `setOrientation(color)`, `getOrientation()`, `flip()`.
- **Selection:** `select(square | null)`.
- **Highlights:** `setLastMove(from, to)`, `clearLastMove()`, `setCheck(square | null)`, `setLegalMoves(squares)`, `clearLegalMoves()`.
- **Arrows:** `setArrows(arrows)`, `addArrow(from, to, color?)`, `removeArrow(from, to)`, `clearArrows()`.
- **Lifecycle:** `destroy()`.

## Integration with @pech/chess-core

Use [@pech/chess-core](https://github.com/EduardoPech/chess-core) for legal move generation and game state. In `onMove`, validate the move with the core and call `board.setPosition(game.fen())` (or similar) after applying it; return `false` to reject the move.

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
