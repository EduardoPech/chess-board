import type { SquareKey } from './types.ts';

/**
 * Tracks which squares currently carry which CSS class, so updates touch
 * only the squares that actually changed instead of scanning all 64 on
 * every move/selection/highlight change. One instance covers every class
 * toggled per-square on the board (highlights, occupancy, drag hover…).
 *
 * Takes the live `squareEls` map by reference — lookups always resolve
 * against whatever elements are currently assigned, so it stays correct
 * even if square divs get reused/reassigned (e.g. orientation flip).
 */
export class HighlightTracker {
  private readonly applied = new Map<string, Set<SquareKey>>();

  constructor(private readonly squareEls: ReadonlyMap<SquareKey, HTMLElement>) {}

  /** Replace the set of squares carrying `cls` with exactly `squares`. */
  set(cls: string, squares: Iterable<SquareKey>): void {
    const next = new Set(squares);
    const prev = this.applied.get(cls);

    if (prev) {
      for (const sq of prev) {
        if (!next.has(sq)) {
          this.squareEls.get(sq)?.classList.remove(cls);
        }
      }
    }
    for (const sq of next) {
      if (!prev?.has(sq)) {
        this.squareEls.get(sq)?.classList.add(cls);
      }
    }
    this.applied.set(cls, next);
  }

  /** Remove `cls` from every square currently carrying it. */
  clear(cls: string): void {
    const prev = this.applied.get(cls);
    if (!prev) return;
    for (const sq of prev) {
      this.squareEls.get(sq)?.classList.remove(cls);
    }
    this.applied.delete(cls);
  }

  /**
   * Strip every tracked class from every square that currently carries
   * one, and forget the bookkeeping. Call this before the square→element
   * mapping is restructured (e.g. squares are relabeled in place for an
   * orientation flip), then re-apply current highlight state afterward —
   * otherwise a relabeled div could keep a stale class from the square it
   * used to represent.
   */
  clearAll(): void {
    for (const [cls, squares] of this.applied) {
      for (const sq of squares) {
        this.squareEls.get(sq)?.classList.remove(cls);
      }
    }
    this.applied.clear();
  }
}
