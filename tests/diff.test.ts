import { describe, it, expect } from 'vitest';
import { diffPieces } from '../src/diff.ts';
import { parseFen } from '../src/fen.ts';
import type { Piece, SquareKey } from '../src/types.ts';

function cloneMap(m: Map<SquareKey, Piece>): Map<SquareKey, Piece> {
  return new Map(m);
}

describe('diffPieces', () => {
  it('returns empty diff for identical positions', () => {
    const pos = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    const diff = diffPieces(pos, pos);
    expect(diff.moved).toHaveLength(0);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('detects a simple pawn move (e2 → e4)', () => {
    const old = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    const next = cloneMap(old);
    const pawn = next.get('e2')!;
    next.delete('e2');
    next.set('e4', pawn);

    const diff = diffPieces(old, next);
    expect(diff.moved).toHaveLength(1);
    expect(diff.moved[0]!.from).toBe('e2');
    expect(diff.moved[0]!.to).toBe('e4');
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('detects castling (2 pieces move)', () => {
    const old = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const next = cloneMap(old);

    const king = next.get('e1')!;
    const rook = next.get('h1')!;
    next.delete('e1');
    next.delete('h1');
    next.set('g1', king);
    next.set('f1', rook);

    const diff = diffPieces(old, next);
    expect(diff.moved).toHaveLength(2);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('detects capture (one removed, one moved)', () => {
    const old = parseFen('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    const next = cloneMap(old);

    const pawn = next.get('e4')!;
    next.delete('e4');
    next.delete('d5');
    next.set('d5', pawn);

    const diff = diffPieces(old, next);
    expect(diff.moved).toHaveLength(1);
    expect(diff.moved[0]!.from).toBe('e4');
    expect(diff.moved[0]!.to).toBe('d5');
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]).toBe('d5');
    expect(diff.added).toHaveLength(0);
  });

  it('detects promotion (pawn removed, queen added)', () => {
    const old = parseFen('8/4P3/8/8/8/8/8/4K3 w - - 0 1');
    const next = cloneMap(old);
    next.delete('e7');
    next.set('e8', { color: 'white', type: 'queen' });

    const diff = diffPieces(old, next);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]!.piece.type).toBe('queen');
  });

  it('detects a piece added from empty', () => {
    const old = new Map<SquareKey, Piece>();
    const next = new Map<SquareKey, Piece>();
    next.set('e4', { color: 'white', type: 'pawn' });

    const diff = diffPieces(old, next);
    expect(diff.added).toHaveLength(1);
    expect(diff.moved).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('detects a piece removed to empty', () => {
    const old = new Map<SquareKey, Piece>();
    old.set('e4', { color: 'white', type: 'pawn' });
    const next = new Map<SquareKey, Piece>();

    const diff = diffPieces(old, next);
    expect(diff.removed).toHaveLength(1);
    expect(diff.moved).toHaveLength(0);
    expect(diff.added).toHaveLength(0);
  });
});
