import { describe, it, expect } from 'vitest';
import { parseFen, positionToFen, STARTING_FEN } from '../src/fen.ts';

describe('parseFen', () => {
  it('parses the starting position (32 pieces)', () => {
    const pieces = parseFen(STARTING_FEN);
    expect(pieces.size).toBe(32);
  });

  it('places white king on e1', () => {
    const pieces = parseFen(STARTING_FEN);
    expect(pieces.get('e1')).toEqual({ color: 'white', type: 'king' });
  });

  it('places black queen on d8', () => {
    const pieces = parseFen(STARTING_FEN);
    expect(pieces.get('d8')).toEqual({ color: 'black', type: 'queen' });
  });

  it('places pawns on rank 2 and 7', () => {
    const pieces = parseFen(STARTING_FEN);
    expect(pieces.get('a2')).toEqual({ color: 'white', type: 'pawn' });
    expect(pieces.get('h7')).toEqual({ color: 'black', type: 'pawn' });
  });

  it('handles an empty board', () => {
    const pieces = parseFen('8/8/8/8/8/8/8/8');
    expect(pieces.size).toBe(0);
  });

  it('handles a FEN without extra fields', () => {
    const pieces = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(pieces.size).toBe(32);
  });

  it('parses a mid-game position', () => {
    const fen = 'r1bqkb1r/pppppppp/2n2n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
    const pieces = parseFen(fen);
    expect(pieces.get('e4')).toEqual({ color: 'white', type: 'pawn' });
    expect(pieces.get('c6')).toEqual({ color: 'black', type: 'knight' });
    expect(pieces.get('f6')).toEqual({ color: 'black', type: 'knight' });
    expect(pieces.has('e2')).toBe(false);
  });
});

describe('positionToFen', () => {
  it('round-trips the starting position', () => {
    const pieces = parseFen(STARTING_FEN);
    const fen = positionToFen(pieces);
    expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  });

  it('round-trips an empty board', () => {
    const pieces = parseFen('8/8/8/8/8/8/8/8');
    expect(positionToFen(pieces)).toBe('8/8/8/8/8/8/8/8');
  });

  it('round-trips a mid-game position', () => {
    const placement = 'r1bqkb1r/pppppppp/2n2n2/8/4P3/8/PPPP1PPP/RNBQKBNR';
    const pieces = parseFen(placement);
    expect(positionToFen(pieces)).toBe(placement);
  });
});
