// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showPromotionPicker } from '../src/promotion.ts';
import { defaultPieceTheme } from '../src/assets.ts';

let boardEl: HTMLElement;

beforeEach(() => {
  boardEl = document.createElement('div');
  document.body.appendChild(boardEl);
});

describe('showPromotionPicker', () => {
  it('renders an overlay with 4 piece choices', () => {
    showPromotionPicker(
      boardEl,
      'e8',
      'white',
      'white',
      defaultPieceTheme,
      () => {},
      () => {},
    );
    expect(boardEl.querySelectorAll('.cb-promotion-choice')).toHaveLength(4);
    const types = [...boardEl.querySelectorAll('.cb-promotion-choice')].map(
      (el) => el.getAttribute('aria-label'),
    );
    expect(types).toEqual([
      'Promote to queen',
      'Promote to rook',
      'Promote to bishop',
      'Promote to knight',
    ]);
  });

  it('calls onPick with the chosen type when a choice is clicked', () => {
    const onPick = vi.fn();
    showPromotionPicker(
      boardEl,
      'e8',
      'white',
      'white',
      defaultPieceTheme,
      onPick,
      () => {},
    );
    const rookChoice = boardEl.querySelector(
      '.cb-promotion-choice[aria-label="Promote to rook"]',
    ) as HTMLElement;
    rookChoice.click();
    expect(onPick).toHaveBeenCalledWith('rook');
  });

  it('calls onCancel when clicking the overlay outside the picker', () => {
    const onCancel = vi.fn();
    showPromotionPicker(
      boardEl,
      'e8',
      'white',
      'white',
      defaultPieceTheme,
      () => {},
      onCancel,
    );
    const overlay = boardEl.querySelector('.cb-promotion-overlay') as HTMLElement;
    overlay.click();
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not call onCancel when clicking inside the picker itself', () => {
    const onCancel = vi.fn();
    showPromotionPicker(
      boardEl,
      'e8',
      'white',
      'white',
      defaultPieceTheme,
      () => {},
      onCancel,
    );
    const picker = boardEl.querySelector('.cb-promotion-picker') as HTMLElement;
    picker.click();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('destroy() removes the overlay from the DOM', () => {
    const handle = showPromotionPicker(
      boardEl,
      'e8',
      'white',
      'white',
      defaultPieceTheme,
      () => {},
      () => {},
    );
    handle.destroy();
    expect(boardEl.querySelector('.cb-promotion-overlay')).toBeNull();
  });
});
