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

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = coordsToSquare(col, row, orientation)!;
      const light = isLightSquare(sq);
      const div = document.createElement('div');
      div.className = `cb-square ${light ? 'cb-light' : 'cb-dark'}`;
      div.setAttribute('data-square', sq);

      if (showCoords) {
        appendCoords(div, sq, row, col, light);
      }

      boardEl.appendChild(div);
      squareEls.set(sq, div);
    }
  }

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('class', 'cb-svg');
  svgEl.setAttribute('viewBox', '0 0 100 100');
  boardEl.appendChild(svgEl);

  return { boardEl, squareEls, svgEl };
}

export function rebuildSquares(
  boardEl: HTMLElement,
  squareEls: Map<SquareKey, HTMLElement>,
  orientation: Color,
  theme: BoardTheme,
  showCoords: boolean,
): void {
  for (const el of squareEls.values()) {
    el.remove();
  }
  squareEls.clear();

  boardEl.style.setProperty('--cb-light-sq', theme.lightSquare);
  boardEl.style.setProperty('--cb-dark-sq', theme.darkSquare);

  const svgEl = boardEl.querySelector('.cb-svg');

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = coordsToSquare(col, row, orientation)!;
      const light = isLightSquare(sq);
      const div = document.createElement('div');
      div.className = `cb-square ${light ? 'cb-light' : 'cb-dark'}`;
      div.setAttribute('data-square', sq);

      if (showCoords) {
        appendCoords(div, sq, row, col, light);
      }

      if (svgEl) {
        boardEl.insertBefore(div, svgEl);
      } else {
        boardEl.appendChild(div);
      }
      squareEls.set(sq, div);
    }
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
