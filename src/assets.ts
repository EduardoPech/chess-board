import type { Piece, PieceTheme, BoardTheme } from './types.ts';
import { PIECE_SVGS } from './pieces-svg.ts';

export const defaultPieceTheme: PieceTheme = (piece: Piece): string => {
  return PIECE_SVGS[`${piece.color}-${piece.type}`] ?? '';
};

export const defaultBoardTheme: BoardTheme = {
  lightSquare: '#f0d9b5',
  darkSquare: '#b58863',
};
