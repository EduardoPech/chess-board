export type {
  SquareKey,
  FileChar,
  RankChar,
  Color,
  PieceType,
  Piece,
  Arrow,
  Circle,
  BoardTheme,
  PieceTheme,
  ChessBoardOptions,
} from './types.ts';

export { ChessBoard } from './board.ts';

export { STARTING_FEN, parseFen, positionToFen } from './fen.ts';

export { defaultPieceTheme, defaultBoardTheme } from './assets.ts';
