import { describe, expect, it } from 'vitest';
import { directionFromKey, moveFocus } from '../src/keyboard.ts';

describe('directionFromKey', () => {
  it('maps arrow key names to directions', () => {
    expect(directionFromKey('ArrowUp')).toBe('up');
    expect(directionFromKey('ArrowDown')).toBe('down');
    expect(directionFromKey('ArrowLeft')).toBe('left');
    expect(directionFromKey('ArrowRight')).toBe('right');
  });

  it('returns null for non-arrow keys', () => {
    expect(directionFromKey('Enter')).toBeNull();
    expect(directionFromKey(' ')).toBeNull();
    expect(directionFromKey('a')).toBeNull();
  });
});

describe('moveFocus', () => {
  describe('white orientation', () => {
    it('up moves toward higher ranks', () => {
      expect(moveFocus('e4', 'up', 'white')).toBe('e5');
    });

    it('down moves toward lower ranks', () => {
      expect(moveFocus('e4', 'down', 'white')).toBe('e3');
    });

    it('left moves toward the a-file', () => {
      expect(moveFocus('e4', 'left', 'white')).toBe('d4');
    });

    it('right moves toward the h-file', () => {
      expect(moveFocus('e4', 'right', 'white')).toBe('f4');
    });

    it('returns null moving up off the top edge', () => {
      expect(moveFocus('e8', 'up', 'white')).toBeNull();
    });

    it('returns null moving left off the a-file', () => {
      expect(moveFocus('a4', 'left', 'white')).toBeNull();
    });
  });

  describe('black orientation (board flipped)', () => {
    it('up still means toward the top of the screen, so toward lower ranks', () => {
      expect(moveFocus('e4', 'up', 'black')).toBe('e3');
    });

    it('down still means toward the bottom of the screen, so toward higher ranks', () => {
      expect(moveFocus('e4', 'down', 'black')).toBe('e5');
    });

    it('left still means toward the visual left, which is the h-file when flipped', () => {
      expect(moveFocus('e4', 'left', 'black')).toBe('f4');
    });

    it('right still means toward the visual right, which is the a-file when flipped', () => {
      expect(moveFocus('e4', 'right', 'black')).toBe('d4');
    });

    it('returns null moving up off the top edge (rank 1 in black orientation)', () => {
      expect(moveFocus('e1', 'up', 'black')).toBeNull();
    });
  });
});
