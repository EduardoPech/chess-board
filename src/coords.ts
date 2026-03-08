import type { Color, SquareKey } from './types.ts';

export const FILES = 'abcdefgh';

export function squareToCoords(
  sq: SquareKey,
  orientation: Color,
): [col: number, row: number] {
  const fileIdx = FILES.indexOf(sq.charAt(0));
  const rank = Number(sq.charAt(1));
  if (orientation === 'white') {
    return [fileIdx, 8 - rank];
  }
  return [7 - fileIdx, rank - 1];
}

export function coordsToSquare(
  col: number,
  row: number,
  orientation: Color,
): SquareKey | null {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  let fileIdx: number;
  let rank: number;
  if (orientation === 'white') {
    fileIdx = col;
    rank = 8 - row;
  } else {
    fileIdx = 7 - col;
    rank = row + 1;
  }
  const file = FILES.charAt(fileIdx);
  if (!file) return null;
  return `${file}${rank}` as SquareKey;
}

export function isLightSquare(sq: SquareKey): boolean {
  const fileIdx = FILES.indexOf(sq.charAt(0));
  const rankIdx = Number(sq.charAt(1)) - 1;
  return (fileIdx + rankIdx) % 2 !== 0;
}
