import type { Color, Piece, PieceTheme, BoardTheme, SquareKey } from './types.ts';
import { squareToCoords, coordsToSquare, isLightSquare } from './coords.ts';

export function createBoardDOM(
  orientation: Color,
  theme: BoardTheme,
  showCoords: boolean,
): {
  boardEl: HTMLElement;
  squareEls: Map<SquareKey, HTMLElement>;
  svgEl: SVGSVGElement;
} {
  const boardEl = document.createElement('div');
  boardEl.className = 'cb-board';
  boardEl.style.setProperty('--cb-light-sq', theme.lightSquare);
  boardEl.style.setProperty('--cb-dark-sq', theme.darkSquare);

  const squareEls = new Map<SquareKey, HTMLElement>();
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = coordsToSquare(col, row, orientation)!;
      const light = isLightSquare(sq);
      const div = document.createElement('div');
      div.className = `cb-square ${light ? 'cb-light' : 'cb-dark'}`;
      div.setAttribute('data-square', sq);
      div.setAttribute('role', 'gridcell');
      div.tabIndex = -1;

      if (showCoords) {
        appendCoords(div, sq, row, col, light);
      }

      fragment.appendChild(div);
      squareEls.set(sq, div);
    }
  }

  boardEl.setAttribute('role', 'grid');

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('class', 'cb-svg');
  svgEl.setAttribute('viewBox', '0 0 100 100');
  fragment.appendChild(svgEl);

  boardEl.appendChild(fragment);

  return { boardEl, squareEls, svgEl };
}

/**
 * Re-labels the existing square divs for a new orientation instead of
 * destroying and recreating all 64 of them. Square divs stay at their
 * fixed grid position (CSS grid places children by DOM order); only each
 * div's `data-square`, light/dark class, and coordinate labels change to
 * match the square that now belongs at that position.
 *
 * Highlight classes are NOT this function's concern — a caller relabeling
 * a live board must strip those first (a reused div could otherwise keep
 * a class from the square it used to represent). See
 * `HighlightTracker.clearAll()` in highlights.ts.
 */
export function reassignSquares(
  boardEl: HTMLElement,
  squareEls: Map<SquareKey, HTMLElement>,
  orientation: Color,
  theme: BoardTheme,
  showCoords: boolean,
): void {
  boardEl.style.setProperty('--cb-light-sq', theme.lightSquare);
  boardEl.style.setProperty('--cb-dark-sq', theme.darkSquare);

  // Grid position is DOM order, not squareEls Map order — read it
  // straight from the live children so this stays correct regardless of
  // prior reassignments.
  const divs: HTMLElement[] = [];
  for (const child of boardEl.children) {
    if (child instanceof HTMLElement && child.classList.contains('cb-square')) {
      divs.push(child);
    }
  }

  squareEls.clear();

  let i = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const div = divs[i++];
      if (!div) continue;
      const sq = coordsToSquare(col, row, orientation)!;
      const light = isLightSquare(sq);

      div.className = `cb-square ${light ? 'cb-light' : 'cb-dark'}`;
      div.setAttribute('data-square', sq);
      div.replaceChildren();
      if (showCoords) {
        appendCoords(div, sq, row, col, light);
      }

      squareEls.set(sq, div);
    }
  }
}

/**
 * Fills `el` with a piece's visual content from `pieceTheme` — either raw
 * SVG markup or an image URL. Shared by `createPieceEl` (board pieces)
 * and the promotion picker (choice icons) so both stay correct for
 * either theme shape.
 */
export function renderPieceContent(
  el: HTMLElement,
  piece: Piece,
  pieceTheme: PieceTheme,
): void {
  const content = pieceTheme(piece);
  if (content.trimStart().startsWith('<')) {
    el.innerHTML = content;
  } else {
    const img = document.createElement('img');
    img.src = content;
    img.alt = `${piece.color} ${piece.type}`;
    img.draggable = false;
    el.appendChild(img);
  }
}

export function createPieceEl(
  sq: SquareKey,
  piece: Piece,
  orientation: Color,
  pieceTheme: PieceTheme,
): HTMLElement {
  const [col, row] = squareToCoords(sq, orientation);
  const el = document.createElement('div');
  el.className = 'cb-piece';
  el.setAttribute('data-square', sq);
  el.setAttribute('aria-label', `${piece.color} ${piece.type}`);
  el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;

  renderPieceContent(el, piece, pieceTheme);

  return el;
}

function appendCoords(
  div: HTMLElement,
  sq: SquareKey,
  row: number,
  col: number,
  light: boolean,
): void {
  const colorCls = light ? 'cb-on-light' : 'cb-on-dark';
  if (row === 7) {
    const span = document.createElement('span');
    span.className = `cb-coord cb-coord-file ${colorCls}`;
    span.textContent = sq.charAt(0);
    div.appendChild(span);
  }
  if (col === 0) {
    const span = document.createElement('span');
    span.className = `cb-coord cb-coord-rank ${colorCls}`;
    span.textContent = sq.charAt(1);
    div.appendChild(span);
  }
}
