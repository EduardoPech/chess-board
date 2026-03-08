export function injectStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cb-styles')) return;
  const el = document.createElement('style');
  el.id = 'cb-styles';
  el.textContent = STYLES;
  document.head.appendChild(el);
}

const STYLES = /* css */ `
.cb-board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  aspect-ratio: 1 / 1;
  width: 100%;
  contain: layout style paint;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-touch-callout: none;
  box-sizing: border-box;
  overflow: hidden;
}

/* Squares */
.cb-square {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
.cb-square.cb-light { background: var(--cb-light-sq); }
.cb-square.cb-dark  { background: var(--cb-dark-sq); }

/* Highlight: last move */
.cb-square.cb-hl-lastmove.cb-light { background: var(--cb-hl-lm-light, #cdd16a); }
.cb-square.cb-hl-lastmove.cb-dark  { background: var(--cb-hl-lm-dark, #aaaa23); }

/* Highlight: selected */
.cb-square.cb-hl-selected.cb-light { background: var(--cb-hl-sel-light, #7fc97f); }
.cb-square.cb-hl-selected.cb-dark  { background: var(--cb-hl-sel-dark, #5aad5a); }

/* Highlight: check */
.cb-square.cb-hl-check {
  background: radial-gradient(
    ellipse at center,
    rgba(255,0,0,0.6) 0%,
    rgba(255,0,0,0.3) 40%,
    rgba(255,0,0,0) 70%
  ) !important;
}

/* Legal move indicators: dot on empty squares */
.cb-square.cb-legal::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.14);
  pointer-events: none;
  z-index: 1;
}

/* Legal move indicators: ring on capture squares */
.cb-square.cb-legal.cb-has-piece::after {
  width: 100%;
  height: 100%;
  border-radius: 0;
  background: radial-gradient(transparent 48%, rgba(0,0,0,0.12) 52%);
}

/* Pieces — smaller than cell so they don't touch edges (padding via size) */
.cb-piece {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  top: 0;
  left: 0;
  z-index: 2;
  pointer-events: none;
  will-change: transform;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cb-piece.cb-animating {
  transition: transform var(--cb-anim-duration, 150ms) ease-out;
}
.cb-piece.cb-dragging {
  z-index: 10;
  cursor: grabbing;
  transition: none !important;
}
.cb-piece img,
.cb-piece svg {
  width: var(--cb-piece-size, 85%);
  height: var(--cb-piece-size, 85%);
  object-fit: contain;
  display: block;
  pointer-events: none;
}

/* Coordinates */
.cb-coord {
  position: absolute;
  font-size: 0.7em;
  font-family: system-ui, sans-serif;
  font-weight: 700;
  pointer-events: none;
  z-index: 1;
  line-height: 1;
}
.cb-coord-file { right: 2px; bottom: 1px; }
.cb-coord-rank { left: 2px;  top: 1px; }
.cb-coord.cb-on-light { color: var(--cb-dark-sq); }
.cb-coord.cb-on-dark  { color: var(--cb-light-sq); }

/* SVG overlay for arrows */
.cb-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  pointer-events: none;
  overflow: visible;
}
`;
