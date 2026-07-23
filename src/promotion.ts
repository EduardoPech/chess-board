import type { Color, PieceTheme, PieceType, SquareKey } from './types.ts';
import { squareToCoords } from './coords.ts';
import { renderPieceContent } from './dom.ts';

const PROMOTION_CHOICES: readonly PieceType[] = [
  'queen',
  'rook',
  'bishop',
  'knight',
];

export interface PromotionPickerHandle {
  /** Removes the picker overlay from the DOM. Safe to call more than once. */
  destroy(): void;
}

/**
 * Renders a column of piece choices anchored to `square`, backed by a
 * full-board click-away overlay. Calls `onPick` with the chosen type, or
 * `onCancel` if the user clicks outside the picker. Either outcome fires
 * exactly once; the caller should destroy the returned handle in both
 * `onPick` and `onCancel`.
 */
export function showPromotionPicker(
  boardEl: HTMLElement,
  square: SquareKey,
  color: Color,
  orientation: Color,
  pieceTheme: PieceTheme,
  onPick: (type: PieceType) => void,
  onCancel: () => void,
): PromotionPickerHandle {
  const [col, row] = squareToCoords(square, orientation);

  const overlay = document.createElement('div');
  overlay.className = 'cb-promotion-overlay';
  overlay.addEventListener('click', () => onCancel());
  // The overlay is a child of boardEl, so without this, pointer events on
  // it would bubble up to the board's own pointerdown/pointerup handlers
  // and could start a drag or selection underneath the picker.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    overlay.addEventListener(type, (e) => e.stopPropagation());
  }

  const picker = document.createElement('div');
  picker.className = 'cb-promotion-picker';
  picker.style.left = `${col * 12.5}%`;
  // Stack downward from the promotion rank if it's near the top edge
  // (white promoting, row 0), upward otherwise, so the picker stays
  // on-board regardless of orientation.
  picker.style.top = row === 0 ? '0%' : `${(row + 1) * 12.5}%`;
  picker.style.transform = row === 0 ? 'none' : 'translateY(-100%)';
  picker.addEventListener('click', (e) => e.stopPropagation());

  for (const type of PROMOTION_CHOICES) {
    const choiceEl = document.createElement('div');
    choiceEl.className = 'cb-promotion-choice';
    choiceEl.setAttribute('role', 'button');
    choiceEl.setAttribute('aria-label', `Promote to ${type}`);
    renderPieceContent(choiceEl, { color, type }, pieceTheme);
    choiceEl.addEventListener('click', () => onPick(type));
    picker.appendChild(choiceEl);
  }

  overlay.appendChild(picker);
  boardEl.appendChild(overlay);

  return {
    destroy() {
      overlay.remove();
    },
  };
}
