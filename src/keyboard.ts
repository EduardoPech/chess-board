import type { Color, SquareKey } from './types.ts';
import { squareToCoords, coordsToSquare } from './coords.ts';

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

const KEY_TO_DIRECTION: Readonly<Record<string, ArrowDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export function directionFromKey(key: string): ArrowDirection | null {
  return KEY_TO_DIRECTION[key] ?? null;
}

/**
 * Computes the square reached by moving one step from `from` in an
 * arrow-key direction. "Up" always means toward the top of the screen
 * regardless of orientation — the caller shouldn't have to know which
 * side is flipped, so this reads/writes through `squareToCoords` and
 * `coordsToSquare`, which already encode the orientation flip.
 * Returns null if the step would leave the board.
 */
export function moveFocus(
  from: SquareKey,
  direction: ArrowDirection,
  orientation: Color,
): SquareKey | null {
  const [col, row] = squareToCoords(from, orientation);
  let nextCol = col;
  let nextRow = row;
  switch (direction) {
    case 'up':
      nextRow -= 1;
      break;
    case 'down':
      nextRow += 1;
      break;
    case 'left':
      nextCol -= 1;
      break;
    case 'right':
      nextCol += 1;
      break;
  }
  return coordsToSquare(nextCol, nextRow, orientation);
}
