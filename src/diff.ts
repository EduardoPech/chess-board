import type { Piece, SquareKey } from './types.ts';

export interface PieceDiff {
  readonly moved: ReadonlyArray<{
    from: SquareKey;
    to: SquareKey;
    piece: Piece;
  }>;
  readonly added: ReadonlyArray<{ square: SquareKey; piece: Piece }>;
  readonly removed: readonly SquareKey[];
}

function samePiece(a: Piece, b: Piece): boolean {
  return a.color === b.color && a.type === b.type;
}

export function diffPieces(
  oldPieces: ReadonlyMap<SquareKey, Piece>,
  newPieces: ReadonlyMap<SquareKey, Piece>,
): PieceDiff {
  const disappeared: Array<{ square: SquareKey; piece: Piece }> = [];
  const appeared: Array<{ square: SquareKey; piece: Piece }> = [];

  for (const [sq, piece] of oldPieces) {
    const np = newPieces.get(sq);
    if (!np || !samePiece(piece, np)) {
      disappeared.push({ square: sq, piece });
    }
  }

  for (const [sq, piece] of newPieces) {
    const op = oldPieces.get(sq);
    if (!op || !samePiece(op, piece)) {
      appeared.push({ square: sq, piece });
    }
  }

  const moved: Array<{ from: SquareKey; to: SquareKey; piece: Piece }> = [];
  const usedD = new Set<number>();
  const usedA = new Set<number>();

  for (let a = 0; a < appeared.length; a++) {
    if (usedA.has(a)) continue;
    const ap = appeared[a]!;
    for (let d = 0; d < disappeared.length; d++) {
      if (usedD.has(d)) continue;
      const dp = disappeared[d]!;
      if (samePiece(dp.piece, ap.piece)) {
        moved.push({ from: dp.square, to: ap.square, piece: ap.piece });
        usedD.add(d);
        usedA.add(a);
        break;
      }
    }
  }

  const removed = disappeared
    .filter((_, i) => !usedD.has(i))
    .map((d) => d.square);
  const added = appeared.filter((_, i) => !usedA.has(i));

  return { moved, added, removed };
}
