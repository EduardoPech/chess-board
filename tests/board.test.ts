// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChessBoard } from '../src/board.ts';
import { STARTING_FEN } from '../src/fen.ts';

/**
 * `tryMove` is the single private method every pointer/keyboard
 * interaction path routes a move attempt through. Testing it directly
 * (rather than via simulated PointerEvents) is deliberate: happy-dom has
 * no real layout engine, so `getBoundingClientRect()`-based square
 * detection can't be exercised meaningfully here — that's covered by
 * manual verification in a real browser instead. This still gives real
 * coverage of the promotion-picker integration logic.
 */
function tryMove(
  board: ChessBoard,
  from: string,
  to: string,
  onReject: () => void,
): void {
  (board as unknown as {
    tryMove: (from: string, to: string, onReject: () => void) => void;
  }).tryMove(from, to, onReject);
}

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

describe('ChessBoard construction', () => {
  it('renders 64 squares and the starting pieces', () => {
    const board = new ChessBoard(container);
    expect(container.querySelectorAll('.cb-square')).toHaveLength(64);
    expect(container.querySelectorAll('.cb-piece')).toHaveLength(32);
    board.destroy();
  });

  it('defaults to the starting position and white orientation', () => {
    const board = new ChessBoard(container);
    expect(board.getPosition()).toBe(
      STARTING_FEN.split(' ')[0],
    );
    expect(board.getOrientation()).toBe('white');
    board.destroy();
  });

  it('accepts a custom initial position', () => {
    const fen = '8/8/8/4k3/8/8/8/4K3 w - - 0 1';
    const board = new ChessBoard(container, { position: fen });
    expect(board.getPosition()).toBe('8/8/8/4k3/8/8/8/4K3');
    expect(container.querySelectorAll('.cb-piece')).toHaveLength(2);
    board.destroy();
  });
});

describe('setPosition', () => {
  it('updates the piece count and FEN', () => {
    const board = new ChessBoard(container);
    const fen = '8/8/8/4k3/8/8/8/4K3 w - - 0 1';
    board.setPosition(fen);
    expect(board.getPosition()).toBe('8/8/8/4k3/8/8/8/4K3');
    expect(container.querySelectorAll('.cb-piece')).toHaveLength(2);
    board.destroy();
  });

  it('moves a piece element rather than recreating it for a simple move', () => {
    const board = new ChessBoard(container);
    const before = container.querySelector('.cb-piece[data-square="e2"]');
    expect(before).not.toBeNull();
    board.setPosition(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    );
    expect(container.querySelector('.cb-piece[data-square="e2"]')).toBeNull();
    expect(container.querySelector('.cb-piece[data-square="e4"]')).not.toBeNull();
    board.destroy();
  });
});

describe('orientation', () => {
  it('flip() toggles between white and black', () => {
    const board = new ChessBoard(container);
    expect(board.getOrientation()).toBe('white');
    board.flip();
    expect(board.getOrientation()).toBe('black');
    board.flip();
    expect(board.getOrientation()).toBe('white');
    board.destroy();
  });

  it('setOrientation keeps 64 squares and all pieces after flipping', () => {
    const board = new ChessBoard(container);
    board.setOrientation('black');
    expect(container.querySelectorAll('.cb-square')).toHaveLength(64);
    expect(container.querySelectorAll('.cb-piece')).toHaveLength(32);
    board.destroy();
  });

  it('reuses the same square div nodes across a flip instead of recreating them', () => {
    const board = new ChessBoard(container);
    const before = new Set(container.querySelectorAll('.cb-square'));
    board.setOrientation('black');
    const after = container.querySelectorAll('.cb-square');
    expect(after).toHaveLength(before.size);
    for (const el of after) {
      expect(before.has(el)).toBe(true);
    }
    board.destroy();
  });

  it('relabels a1 to the correct square after flipping to black', () => {
    const board = new ChessBoard(container);
    // White orientation: top-left grid cell is a8.
    board.setOrientation('black');
    // Black orientation: top-left grid cell is h1.
    const topLeft = container.querySelector('.cb-board')!.children[0];
    expect(topLeft?.getAttribute('data-square')).toBe('h1');
    board.destroy();
  });
});

describe('circles', () => {
  it('addCircle renders a circle element in the SVG overlay', () => {
    const board = new ChessBoard(container);
    board.addCircle('e4');
    expect(container.querySelector('circle[data-circle="e4"]')).not.toBeNull();
    board.destroy();
  });

  it('addCircle is a no-op if the square already has a circle', () => {
    const board = new ChessBoard(container);
    board.addCircle('e4');
    board.addCircle('e4');
    expect(container.querySelectorAll('circle[data-circle="e4"]')).toHaveLength(1);
    board.destroy();
  });

  it('removeCircle removes the circle', () => {
    const board = new ChessBoard(container);
    board.addCircle('e4');
    board.removeCircle('e4');
    expect(container.querySelector('circle[data-circle="e4"]')).toBeNull();
    board.destroy();
  });

  it('clearCircles removes all circles', () => {
    const board = new ChessBoard(container);
    board.setCircles([{ square: 'e4' }, { square: 'd5' }]);
    board.clearCircles();
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    board.destroy();
  });

  it('setArrows does not clear existing circles', () => {
    const board = new ChessBoard(container);
    board.addCircle('e4');
    board.setArrows([{ from: 'e2', to: 'e4' }]);
    expect(container.querySelector('circle[data-circle="e4"]')).not.toBeNull();
    board.destroy();
  });
});

describe('promotion', () => {
  const pawnOnSeventh = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';

  it('shows a picker instead of calling onMove immediately, when enabled', () => {
    const onMove = vi.fn();
    const board = new ChessBoard(container, {
      position: pawnOnSeventh,
      promotionPicker: true,
      onMove,
    });
    tryMove(board, 'e7', 'e8', () => {});
    expect(container.querySelector('.cb-promotion-picker')).not.toBeNull();
    expect(onMove).not.toHaveBeenCalled();
    board.destroy();
  });

  it('calls onMove with the chosen type and applies the promotion', () => {
    const onMove = vi.fn();
    const board = new ChessBoard(container, {
      position: pawnOnSeventh,
      promotionPicker: true,
      onMove,
    });
    tryMove(board, 'e7', 'e8', () => {});
    const knightChoice = container.querySelector(
      '.cb-promotion-choice[aria-label="Promote to knight"]',
    ) as HTMLElement;
    knightChoice.click();

    expect(onMove).toHaveBeenCalledWith('e7', 'e8', 'knight');
    expect(container.querySelector('.cb-piece[data-square="e7"]')).toBeNull();
    expect(
      container
        .querySelector('.cb-piece[data-square="e8"]')
        ?.getAttribute('aria-label'),
    ).toBe('white knight');
    expect(container.querySelector('.cb-promotion-picker')).toBeNull();
    board.destroy();
  });

  it('calls onReject and does not move the piece when onMove rejects', () => {
    const onMove = vi.fn(() => false);
    const onReject = vi.fn();
    const board = new ChessBoard(container, {
      position: pawnOnSeventh,
      promotionPicker: true,
      onMove,
    });
    tryMove(board, 'e7', 'e8', onReject);
    const queenChoice = container.querySelector(
      '.cb-promotion-choice[aria-label="Promote to queen"]',
    ) as HTMLElement;
    queenChoice.click();

    expect(onReject).toHaveBeenCalled();
    expect(container.querySelector('.cb-piece[data-square="e7"]')).not.toBeNull();
    expect(container.querySelector('.cb-piece[data-square="e8"]')).toBeNull();
    board.destroy();
  });

  it('calls onReject and never calls onMove when the picker is cancelled', () => {
    const onMove = vi.fn();
    const onReject = vi.fn();
    const board = new ChessBoard(container, {
      position: pawnOnSeventh,
      promotionPicker: true,
      onMove,
    });
    tryMove(board, 'e7', 'e8', onReject);
    const overlay = container.querySelector('.cb-promotion-overlay') as HTMLElement;
    overlay.click();

    expect(onReject).toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(container.querySelector('.cb-promotion-picker')).toBeNull();
    board.destroy();
  });

  it('does not show a picker when promotionPicker is disabled (default)', () => {
    const onMove = vi.fn();
    const board = new ChessBoard(container, {
      position: pawnOnSeventh,
      onMove,
    });
    tryMove(board, 'e7', 'e8', () => {});
    expect(container.querySelector('.cb-promotion-picker')).toBeNull();
    expect(onMove).toHaveBeenCalledWith('e7', 'e8');
    board.destroy();
  });

  it('does not show a picker for a non-promotion move even when enabled', () => {
    const onMove = vi.fn();
    const board = new ChessBoard(container, {
      promotionPicker: true,
      onMove,
    });
    tryMove(board, 'e2', 'e4', () => {});
    expect(container.querySelector('.cb-promotion-picker')).toBeNull();
    expect(onMove).toHaveBeenCalledWith('e2', 'e4');
    board.destroy();
  });
});

describe('highlights', () => {
  it('setLastMove marks both squares', () => {
    const board = new ChessBoard(container);
    board.setLastMove('e2', 'e4');
    expect(
      container
        .querySelector('.cb-square[data-square="e2"]')
        ?.classList.contains('cb-hl-lastmove'),
    ).toBe(true);
    expect(
      container
        .querySelector('.cb-square[data-square="e4"]')
        ?.classList.contains('cb-hl-lastmove'),
    ).toBe(true);
    board.destroy();
  });

  it('clearLastMove removes the highlight', () => {
    const board = new ChessBoard(container);
    board.setLastMove('e2', 'e4');
    board.clearLastMove();
    expect(
      container
        .querySelector('.cb-square[data-square="e4"]')
        ?.classList.contains('cb-hl-lastmove'),
    ).toBe(false);
    board.destroy();
  });
});

describe('destroy', () => {
  it('removes the board element from the container', () => {
    const board = new ChessBoard(container);
    board.destroy();
    expect(container.querySelectorAll('.cb-board')).toHaveLength(0);
  });

  it('is idempotent', () => {
    const board = new ChessBoard(container);
    board.destroy();
    expect(() => board.destroy()).not.toThrow();
  });
});

function fireKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('keyboard accessibility', () => {
  it('marks the board as a grid and squares as gridcells', () => {
    const board = new ChessBoard(container);
    expect(container.querySelector('.cb-board')?.getAttribute('role')).toBe('grid');
    expect(
      container.querySelector('.cb-square')?.getAttribute('role'),
    ).toBe('gridcell');
    board.destroy();
  });

  it('starts with exactly one square tab-reachable, at the visual bottom-left', () => {
    const board = new ChessBoard(container);
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    expect(a1.tabIndex).toBe(0);
    const tabbable = [...container.querySelectorAll('.cb-square')].filter(
      (el) => (el as HTMLElement).tabIndex === 0,
    );
    expect(tabbable).toHaveLength(1);
    board.destroy();
  });

  it('ArrowUp moves the roving tabindex to the next square', () => {
    const board = new ChessBoard(container);
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'ArrowUp');
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    const a2 = container.querySelector('.cb-square[data-square="a2"]') as HTMLElement;
    expect(a1.tabIndex).toBe(-1);
    expect(a2.tabIndex).toBe(0);
    board.destroy();
  });

  it('does not move focus off the edge of the board', () => {
    const board = new ChessBoard(container);
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'ArrowDown'); // already at rank 1, can't go further down
    fireKey(boardEl, 'ArrowLeft'); // already at the a-file
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    expect(a1.tabIndex).toBe(0);
    board.destroy();
  });

  it('Enter on a focused piece square selects it', () => {
    const board = new ChessBoard(container);
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    // Starting position: a1 (bottom-left, white orientation) holds the white rook.
    fireKey(boardEl, 'Enter');
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    expect(a1.classList.contains('cb-hl-selected')).toBe(true);
    board.destroy();
  });

  it('Enter again on the same square deselects it', () => {
    const board = new ChessBoard(container);
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'Enter');
    fireKey(boardEl, 'Enter');
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    expect(a1.classList.contains('cb-hl-selected')).toBe(false);
    board.destroy();
  });

  it('Escape deselects the current selection', () => {
    const board = new ChessBoard(container);
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'Enter');
    fireKey(boardEl, 'Escape');
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    expect(a1.classList.contains('cb-hl-selected')).toBe(false);
    board.destroy();
  });

  it('Enter on an empty square with nothing selected does nothing', () => {
    const board = new ChessBoard(container);
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'ArrowUp');
    fireKey(boardEl, 'ArrowUp'); // now on a3, empty
    fireKey(boardEl, 'Enter');
    const a3 = container.querySelector('.cb-square[data-square="a3"]') as HTMLElement;
    expect(a3.classList.contains('cb-hl-selected')).toBe(false);
    board.destroy();
  });

  it('announces the selection via the aria-live region', () => {
    const board = new ChessBoard(container);
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'Enter');
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain('rook');
    expect(live?.textContent).toContain('a1');
    board.destroy();
  });

  it('announces the move, not a generic "Deselected", when a move completes', () => {
    // Regression: applyMove announces the move, then the auto-deselect
    // that follows an accepted move used to immediately overwrite it
    // with "Deselected" in the same tick — a screen reader would only
    // ever hear "Deselected" and never the actual move description.
    const board = new ChessBoard(container, {
      onMove: () => true,
    });
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'Enter'); // select a1 (rook)
    fireKey(boardEl, 'ArrowUp'); // focus a2
    fireKey(boardEl, 'Enter'); // move a1 -> a2 (legality is the consumer's job)
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain('a1 to a2');
    expect(live?.textContent).not.toBe('Deselected');
    board.destroy();
  });

  it('is disabled by default when viewOnly is set', () => {
    const board = new ChessBoard(container, { viewOnly: true });
    const boardEl = container.querySelector('.cb-board') as HTMLElement;
    fireKey(boardEl, 'Enter');
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    expect(a1.classList.contains('cb-hl-selected')).toBe(false);
    expect(a1.tabIndex).toBe(-1);
    board.destroy();
  });

  it('can be explicitly disabled', () => {
    const board = new ChessBoard(container, { keyboard: false });
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    expect(a1.tabIndex).toBe(-1);
    board.destroy();
  });

  it('keeps roving tabindex on the same logical square across a flip', () => {
    // focusedSq is tracked as a logical square key (consistent with how
    // selected/lastMove/check already behave across orientation), so it
    // stays on "a1" even though a1 now sits at a different grid position.
    const board = new ChessBoard(container);
    board.setOrientation('black');
    const a1 = container.querySelector('.cb-square[data-square="a1"]') as HTMLElement;
    const tabbable = [...container.querySelectorAll('.cb-square')].filter(
      (el) => (el as HTMLElement).tabIndex === 0,
    );
    expect(tabbable).toEqual([a1]);
    board.destroy();
  });
});
