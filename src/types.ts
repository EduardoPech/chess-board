export type FileChar = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type RankChar = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type SquareKey = `${FileChar}${RankChar}`;

export type Color = 'white' | 'black';
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

export interface Arrow {
  readonly from: SquareKey;
  readonly to: SquareKey;
  readonly color?: string | undefined;
}

export interface BoardTheme {
  readonly lightSquare: string;
  readonly darkSquare: string;
}

export type PieceTheme = (piece: Piece) => string;

export interface ChessBoardOptions {
  readonly position?: string | undefined;
  readonly orientation?: Color | undefined;
  readonly draggable?: boolean | undefined;
  readonly clickable?: boolean | undefined;
  readonly viewOnly?: boolean | undefined;
  readonly coordinates?: boolean | undefined;
  readonly animationDuration?: number | undefined;
  readonly pieceTheme?: PieceTheme | undefined;
  readonly boardTheme?: BoardTheme | undefined;
  readonly onMove?: ((from: SquareKey, to: SquareKey) => boolean | void) | undefined;
  readonly onSelect?: ((square: SquareKey | null) => void) | undefined;
  readonly onArrowDrawn?: ((from: SquareKey, to: SquareKey) => void) | undefined;
}
