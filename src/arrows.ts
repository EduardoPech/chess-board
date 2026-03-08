import type { Arrow, Color, SquareKey } from './types.ts';
import { squareToCoords } from './coords.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_COLOR = 'rgba(0, 180, 50, 0.8)';

function squareCenter(
  sq: SquareKey,
  orientation: Color,
): [x: number, y: number] {
  const [col, row] = squareToCoords(sq, orientation);
  return [(col + 0.5) * 12.5, (row + 0.5) * 12.5];
}

function createArrowEl(arrow: Arrow, orientation: Color): SVGGElement {
  const color = arrow.color ?? DEFAULT_COLOR;
  const [x1, y1] = squareCenter(arrow.from, orientation);
  const [x2, y2] = squareCenter(arrow.to, orientation);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len;
  const ny = dy / len;

  const headLen = 3.5;
  const headW = 2.8;
  const endX = x2 - nx * headLen;
  const endY = y2 - ny * headLen;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('data-arrow', `${arrow.from}-${arrow.to}`);

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(endX));
  line.setAttribute('y2', String(endY));
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '2.4');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('opacity', '0.85');

  const head = document.createElementNS(SVG_NS, 'polygon');
  head.setAttribute(
    'points',
    `${x2},${y2} ${endX - ny * headW},${endY + nx * headW} ${endX + ny * headW},${endY - nx * headW}`,
  );
  head.setAttribute('fill', color);
  head.setAttribute('opacity', '0.85');

  g.appendChild(line);
  g.appendChild(head);
  return g;
}

export function renderArrows(
  svgEl: SVGSVGElement,
  arrows: readonly Arrow[],
  orientation: Color,
): void {
  svgEl.replaceChildren();
  for (const arrow of arrows) {
    svgEl.appendChild(createArrowEl(arrow, orientation));
  }
}
