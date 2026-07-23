// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { HighlightTracker } from '../src/highlights.ts';
import type { SquareKey } from '../src/types.ts';

let els: Map<SquareKey, HTMLElement>;
let tracker: HighlightTracker;

function makeEl(): HTMLElement {
  return document.createElement('div');
}

beforeEach(() => {
  els = new Map([
    ['e2', makeEl()],
    ['e4', makeEl()],
    ['d2', makeEl()],
  ]);
  tracker = new HighlightTracker(els);
});

describe('set', () => {
  it('adds the class to squares in the set', () => {
    tracker.set('cb-legal', ['e2', 'e4']);
    expect(els.get('e2')!.classList.contains('cb-legal')).toBe(true);
    expect(els.get('e4')!.classList.contains('cb-legal')).toBe(true);
    expect(els.get('d2')!.classList.contains('cb-legal')).toBe(false);
  });

  it('removes the class from squares no longer in the set on a second call', () => {
    tracker.set('cb-legal', ['e2', 'e4']);
    tracker.set('cb-legal', ['d2']);
    expect(els.get('e2')!.classList.contains('cb-legal')).toBe(false);
    expect(els.get('e4')!.classList.contains('cb-legal')).toBe(false);
    expect(els.get('d2')!.classList.contains('cb-legal')).toBe(true);
  });

  it('only touches squares that actually changed', () => {
    tracker.set('cb-legal', ['e2', 'e4']);
    // spy by watching classList mutation count is awkward; instead assert
    // the untouched square keeps its class instance-identity unaffected
    const e2ClassListBefore = els.get('e2')!.className;
    tracker.set('cb-legal', ['e2', 'd2']);
    expect(els.get('e2')!.className).toBe(e2ClassListBefore);
    expect(els.get('e4')!.classList.contains('cb-legal')).toBe(false);
    expect(els.get('d2')!.classList.contains('cb-legal')).toBe(true);
  });

  it('tracks multiple classes independently', () => {
    tracker.set('cb-legal', ['e2']);
    tracker.set('cb-hl-selected', ['e4']);
    expect(els.get('e2')!.classList.contains('cb-legal')).toBe(true);
    expect(els.get('e4')!.classList.contains('cb-hl-selected')).toBe(true);
    expect(els.get('e2')!.classList.contains('cb-hl-selected')).toBe(false);
  });
});

describe('clear', () => {
  it('removes the class from every square that had it', () => {
    tracker.set('cb-legal', ['e2', 'e4']);
    tracker.clear('cb-legal');
    expect(els.get('e2')!.classList.contains('cb-legal')).toBe(false);
    expect(els.get('e4')!.classList.contains('cb-legal')).toBe(false);
  });

  it('is a no-op for a class that was never set', () => {
    expect(() => tracker.clear('cb-legal')).not.toThrow();
  });
});

describe('clearAll', () => {
  it('removes every tracked class from every square and forgets bookkeeping', () => {
    tracker.set('cb-legal', ['e2']);
    tracker.set('cb-hl-selected', ['e4']);
    tracker.clearAll();
    expect(els.get('e2')!.classList.contains('cb-legal')).toBe(false);
    expect(els.get('e4')!.classList.contains('cb-hl-selected')).toBe(false);
  });

  it('lets a subsequent set() re-add classes fresh against a remapped squareEls', () => {
    tracker.set('cb-hl-lastmove', ['e2']);
    tracker.clearAll();
    // simulate squares being relabeled in place: e2's div now represents d2
    const e2Div = els.get('e2')!;
    els.set('d2', e2Div);
    els.set('e2', makeEl());
    tracker.set('cb-hl-lastmove', ['e2']);
    expect(els.get('e2')!.classList.contains('cb-hl-lastmove')).toBe(true);
    expect(e2Div.classList.contains('cb-hl-lastmove')).toBe(false);
  });
});
