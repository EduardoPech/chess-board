import type { SquareKey } from './types.ts';

/**
 * Pure decision layer for board pointer interaction.
 *
 * Every function here takes a snapshot of interaction state plus a
 * semantic press/release event and returns an intent — it touches no DOM
 * and calls no callback. `board.ts` is the adapter: it translates raw
 * PointerEvents into calls here, then executes the returned intent
 * (invoking `onMove`, mutating the DOM). Keeping the click/drag/arrow
 * precedence rules here means they're unit-testable without a browser.
 */

export interface InputState {
  readonly selected: SquareKey | null;
  readonly legalSqs: ReadonlySet<SquareKey>;
}

export interface PressConfig {
  readonly draggable: boolean;
}

export type PressIntent =
  | { readonly kind: 'attemptMove'; readonly from: SquareKey; readonly to: SquareKey }
  | { readonly kind: 'startDrag'; readonly square: SquareKey }
  | { readonly kind: 'startPendingClick'; readonly square: SquareKey }
  | { readonly kind: 'none' };

/**
 * Decision for a left-button press (pointerdown).
 *
 * A press on a legal target square while a piece is selected tries the
 * move immediately, before drag even has a chance to start. Otherwise a
 * press on an occupied square either starts a drag or — when the board
 * isn't draggable — arms a pending click resolved on release.
 */
export function decidePress(
  state: InputState,
  pressedSquare: SquareKey,
  hasPieceAtSquare: boolean,
  config: PressConfig,
): PressIntent {
  if (
    state.selected &&
    pressedSquare !== state.selected &&
    state.legalSqs.has(pressedSquare)
  ) {
    return { kind: 'attemptMove', from: state.selected, to: pressedSquare };
  }
  if (hasPieceAtSquare) {
    return config.draggable
      ? { kind: 'startDrag', square: pressedSquare }
      : { kind: 'startPendingClick', square: pressedSquare };
  }
  return { kind: 'none' };
}

export type ClickReleaseIntent =
  | { readonly kind: 'attemptMove'; readonly from: SquareKey; readonly to: SquareKey }
  | { readonly kind: 'select'; readonly square: SquareKey }
  | { readonly kind: 'deselect' }
  | { readonly kind: 'none' };

/**
 * Decision when a non-draggable press resolves on pointerup ("click").
 *
 * The pressed square always holds a piece (that's the only way a pending
 * click gets armed). If another piece is already selected, pressing a
 * second piece tries to move the selected one onto it; otherwise this is
 * a plain select/deselect toggle.
 */
export function decideClickRelease(
  state: InputState,
  pressedSquare: SquareKey,
  clickable: boolean,
): ClickReleaseIntent {
  if (state.selected && pressedSquare !== state.selected) {
    return { kind: 'attemptMove', from: state.selected, to: pressedSquare };
  }
  if (!clickable) return { kind: 'none' };
  return pressedSquare === state.selected
    ? { kind: 'deselect' }
    : { kind: 'select', square: pressedSquare };
}

export type DragReleaseIntent =
  | { readonly kind: 'attemptMove'; readonly from: SquareKey; readonly to: SquareKey }
  | { readonly kind: 'reselectOrigin' };

/** Decision when a drag resolves on pointerup. */
export function decideDragRelease(
  origin: SquareKey,
  targetSquare: SquareKey | null,
): DragReleaseIntent {
  if (targetSquare && targetSquare !== origin) {
    return { kind: 'attemptMove', from: origin, to: targetSquare };
  }
  return { kind: 'reselectOrigin' };
}

export type ShapeReleaseIntent =
  | { readonly kind: 'addArrow'; readonly from: SquareKey; readonly to: SquareKey }
  | { readonly kind: 'toggleCircle'; readonly square: SquareKey }
  | { readonly kind: 'none' };

/**
 * Decision when a right-button press resolves on pointerup.
 *
 * A drag to a different square draws an arrow; a plain press-and-release
 * on the same square (no drag) toggles a circle on it — the same split
 * lichess uses for right-click annotations. Releasing off the board does
 * nothing.
 */
export function decideShapeRelease(
  origin: SquareKey,
  targetSquare: SquareKey | null,
): ShapeReleaseIntent {
  if (targetSquare === null) return { kind: 'none' };
  if (targetSquare !== origin) {
    return { kind: 'addArrow', from: origin, to: targetSquare };
  }
  return { kind: 'toggleCircle', square: origin };
}
