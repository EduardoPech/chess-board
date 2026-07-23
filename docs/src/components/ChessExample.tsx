import { useEffect, useRef } from 'react';
import { ChessBoard, STARTING_FEN, type PieceType } from '@pech/chess-board';
import {
  fromFen,
  toFen,
  getLegalMoves,
  makeMove,
  fromUci,
  toUci,
} from '@pech/chess-core';

// chess-board's promotion type is the full word ('queen'); UCI wants the
// single SAN letter chess-core's fromUci expects as a 5th character.
const PROMO_TO_UCI: Record<PieceType, string> = {
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  king: '',
  pawn: '',
};

export default function ChessExample() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let position = fromFen(STARTING_FEN);
    const board = new ChessBoard(container, {
      position: STARTING_FEN,
      orientation: 'white',
      draggable: true,
      coordinates: true,
      promotionPicker: true,
      onMove(from, to, promotion) {
        const uci = from + to + (promotion ? PROMO_TO_UCI[promotion] : '');
        const move = fromUci(position, uci);
        if (!move) return false;

        const newPos = makeMove(position, move);
        board.setPosition(toFen(newPos));
        board.setLastMove(from, to);
        board.clearLegalMoves();
        const nextLegal = getLegalMoves(newPos);
        if (nextLegal.length > 0) {
          const toSquares = nextLegal.map((m) => toUci(m).slice(2, 4));
          board.setLegalMoves(toSquares);
        }
        position = newPos;
        return true;
      },
    });

    const initialLegal = getLegalMoves(position);
    board.setLegalMoves(initialLegal.map((m) => toUci(m).slice(2, 4)));

    return () => board.destroy();
  }, []);

  return (
    <div className="not-content chess-example-wrapper" ref={containerRef} style={{ maxWidth: 'min(400px, 100%)', margin: '1rem 0' }} />
  );
}
