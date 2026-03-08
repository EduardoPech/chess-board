import { describe, it, expect } from 'vitest';
import { squareToCoords, coordsToSquare, isLightSquare } from '../src/coords.ts';

describe('squareToCoords (white orientation)', () => {
  it('a8 → top-left (0, 0)', () => {
    expect(squareToCoords('a8', 'white')).toEqual([0, 0]);
  });

  it('h1 → bottom-right (7, 7)', () => {
    expect(squareToCoords('h1', 'white')).toEqual([7, 7]);
  });

  it('e4 → center area (4, 4)', () => {
    expect(squareToCoords('e4', 'white')).toEqual([4, 4]);
  });

  it('a1 → bottom-left (0, 7)', () => {
    expect(squareToCoords('a1', 'white')).toEqual([0, 7]);
  });
});

describe('squareToCoords (black orientation)', () => {
  it('a8 → bottom-right (7, 7)', () => {
    expect(squareToCoords('a8', 'black')).toEqual([7, 7]);
  });

  it('h1 → top-left (0, 0)', () => {
    expect(squareToCoords('h1', 'black')).toEqual([0, 0]);
  });

  it('e4 → (3, 3)', () => {
    expect(squareToCoords('e4', 'black')).toEqual([3, 3]);
  });
});

describe('coordsToSquare', () => {
  it('(0, 0) white → a8', () => {
    expect(coordsToSquare(0, 0, 'white')).toBe('a8');
  });

  it('(7, 7) white → h1', () => {
    expect(coordsToSquare(7, 7, 'white')).toBe('h1');
  });

  it('(4, 4) white → e4', () => {
    expect(coordsToSquare(4, 4, 'white')).toBe('e4');
  });

  it('(0, 0) black → h1', () => {
    expect(coordsToSquare(0, 0, 'black')).toBe('h1');
  });

  it('out of bounds → null', () => {
    expect(coordsToSquare(-1, 0, 'white')).toBe(null);
    expect(coordsToSquare(0, 8, 'white')).toBe(null);
  });

  it('round-trips white', () => {
    const sq = 'd5';
    const [c, r] = squareToCoords(sq, 'white');
    expect(coordsToSquare(c, r, 'white')).toBe(sq);
  });

  it('round-trips black', () => {
    const sq = 'f3';
    const [c, r] = squareToCoords(sq, 'black');
    expect(coordsToSquare(c, r, 'black')).toBe(sq);
  });
});

describe('isLightSquare', () => {
  it('a1 is dark', () => {
    expect(isLightSquare('a1')).toBe(false);
  });

  it('a2 is light', () => {
    expect(isLightSquare('a2')).toBe(true);
  });

  it('b1 is light', () => {
    expect(isLightSquare('b1')).toBe(true);
  });

  it('h1 is light', () => {
    expect(isLightSquare('h1')).toBe(true);
  });

  it('h8 is dark', () => {
    expect(isLightSquare('h8')).toBe(false);
  });

  it('e4 is light', () => {
    expect(isLightSquare('e4')).toBe(true);
  });

  it('d4 is dark', () => {
    expect(isLightSquare('d4')).toBe(false);
  });
});
