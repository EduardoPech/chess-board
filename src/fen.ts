import type { Piece, PieceType, SquareKey } from './types.ts';
import { FILES } from './coords.ts';

export const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FEN_PIECES: Readonly<Record<string, Piece>> = {
  K: { color: 'white', type: 'king' },
  Q: { color: 'white', type: 'queen' },
  R: { color: 'white', type: 'rook' },
  B: { color: 'white', type: 'bishop' },
  N: { color: 'white', type: 'knight' },
  P: { color: 'white', type: 'pawn' },
  k: { color: 'black', type: 'king' },
  q: { color: 'black', type: 'queen' },
  r: { color: 'black', type: 'rook' },
  b: { color: 'black', type: 'bishop' },
  n: { color: 'black', type: 'knight' },
  p: { color: 'black', type: 'pawn' },
};

const PIECE_TO_CHAR: Record<PieceType, string> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  pawn: 'p',
};

export function parseFen(fen: string): Map<SquareKey, Piece> {
  const pieces = new Map<SquareKey, Piece>();
  const placement = fen.split(' ')[0] ?? '';
  const rows = placement.split('/');

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const rank = 8 - r;
    let fileIdx = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        fileIdx += Number(ch);
      } else {
        const piece = FEN_PIECES[ch];
        if (piece && fileIdx < 8) {
          const file = FILES.charAt(fileIdx);
          pieces.set(`${file}${rank}` as SquareKey, piece);
        }
        fileIdx++;
      }
    }
  }

  return pieces;
}

export function positionToFen(
  pieces: ReadonlyMap<SquareKey, Piece>,
): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const file = FILES.charAt(f);
      const key = `${file}${rank}` as SquareKey;
      const piece = pieces.get(key);
      if (piece) {
        if (empty > 0) {
          row += String(empty);
          empty = 0;
        }
        const ch = PIECE_TO_CHAR[piece.type];
        row += piece.color === 'white' ? ch.toUpperCase() : ch;
      } else {
        empty++;
      }
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }
  return rows.join('/');
}
