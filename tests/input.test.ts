import { describe, expect, it } from 'vitest';
import {
  decideClickRelease,
  decideDragRelease,
  decidePress,
  decideShapeRelease,
} from '../src/input.ts';
import type { SquareKey } from '../src/types.ts';

const legal = (...sqs: SquareKey[]): ReadonlySet<SquareKey> => new Set(sqs);

describe('decidePress', () => {
  it('attempts a move when pressing a legal target while a piece is selected', () => {
    const result = decidePress(
      { selected: 'e2', legalSqs: legal('e3', 'e4') },
      'e4',
      false,
      { draggable: true },
    );
    expect(result).toEqual({ kind: 'attemptMove', from: 'e2', to: 'e4' });
  });

  it('does not treat pressing the already-selected square as a move', () => {
    const result = decidePress(
      { selected: 'e2', legalSqs: legal('e2') },
      'e2',
      true,
      { draggable: true },
    );
    expect(result).toEqual({ kind: 'startDrag', square: 'e2' });
  });

  it('starts a drag when pressing an occupied square and draggable is true', () => {
    const result = decidePress(
      { selected: null, legalSqs: legal() },
      'd2',
      true,
      { draggable: true },
    );
    expect(result).toEqual({ kind: 'startDrag', square: 'd2' });
  });

  it('arms a pending click when pressing an occupied square and draggable is false', () => {
    const result = decidePress(
      { selected: null, legalSqs: legal() },
      'd2',
      true,
      { draggable: false },
    );
    expect(result).toEqual({ kind: 'startPendingClick', square: 'd2' });
  });

  it('does nothing when pressing an empty, non-legal square', () => {
    const result = decidePress(
      { selected: null, legalSqs: legal() },
      'd4',
      false,
      { draggable: true },
    );
    expect(result).toEqual({ kind: 'none' });
  });

  it('prefers the legal-move branch over occupied-square branch (capture)', () => {
    const result = decidePress(
      { selected: 'e4', legalSqs: legal('d5') },
      'd5',
      true,
      { draggable: true },
    );
    expect(result).toEqual({ kind: 'attemptMove', from: 'e4', to: 'd5' });
  });
});

describe('decideClickRelease', () => {
  it('attempts a move to a second pressed piece when one is already selected', () => {
    const result = decideClickRelease(
      { selected: 'e2', legalSqs: legal() },
      'd7',
      true,
    );
    expect(result).toEqual({ kind: 'attemptMove', from: 'e2', to: 'd7' });
  });

  it('deselects when the pressed square is the currently selected one', () => {
    const result = decideClickRelease(
      { selected: 'e2', legalSqs: legal() },
      'e2',
      true,
    );
    expect(result).toEqual({ kind: 'deselect' });
  });

  it('selects when nothing was previously selected', () => {
    const result = decideClickRelease(
      { selected: null, legalSqs: legal() },
      'd2',
      true,
    );
    expect(result).toEqual({ kind: 'select', square: 'd2' });
  });

  it('does nothing when the board is not clickable and nothing was selected', () => {
    const result = decideClickRelease(
      { selected: null, legalSqs: legal() },
      'd2',
      false,
    );
    expect(result).toEqual({ kind: 'none' });
  });
});

describe('decideDragRelease', () => {
  it('attempts a move when the drag ends on a different square', () => {
    expect(decideDragRelease('e2', 'e4')).toEqual({
      kind: 'attemptMove',
      from: 'e2',
      to: 'e4',
    });
  });

  it('reselects the origin when the drag ends on the same square', () => {
    expect(decideDragRelease('e2', 'e2')).toEqual({ kind: 'reselectOrigin' });
  });

  it('reselects the origin when the drag ends off the board', () => {
    expect(decideDragRelease('e2', null)).toEqual({ kind: 'reselectOrigin' });
  });
});

describe('decideShapeRelease', () => {
  it('adds an arrow when the drag ends on a different square', () => {
    expect(decideShapeRelease('e2', 'e4')).toEqual({
      kind: 'addArrow',
      from: 'e2',
      to: 'e4',
    });
  });

  it('toggles a circle when released on the origin square (no drag)', () => {
    expect(decideShapeRelease('e2', 'e2')).toEqual({
      kind: 'toggleCircle',
      square: 'e2',
    });
  });

  it('does nothing when released off the board', () => {
    expect(decideShapeRelease('e2', null)).toEqual({ kind: 'none' });
  });
});
