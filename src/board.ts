import type {
  Arrow,
  BoardTheme,
  ChessBoardOptions,
  Color,
  Piece,
  PieceTheme,
  SquareKey,
} from './types.ts';
import { parseFen, positionToFen, STARTING_FEN } from './fen.ts';
import { defaultPieceTheme, defaultBoardTheme } from './assets.ts';
import { injectStyles } from './styles.ts';
import { squareToCoords, coordsToSquare } from './coords.ts';
import { createBoardDOM, createPieceEl, rebuildSquares } from './dom.ts';
import { diffPieces } from './diff.ts';
import { renderArrows } from './arrows.ts';

interface DragState {
  readonly pieceEl: HTMLElement;
  readonly originSq: SquareKey;
  readonly pointerId: number;
  readonly boardRect: DOMRect;
}

export class ChessBoard {
  // ── DOM ──────────────────────────────────────────────────────────────
  private boardEl: HTMLElement;
  private svgEl: SVGSVGElement;
  private squareEls: Map<SquareKey, HTMLElement>;
  private readonly pieceEls = new Map<SquareKey, HTMLElement>();

  // ── Config ───────────────────────────────────────────────────────────
  private readonly pieceTheme: PieceTheme;
  private readonly boardTheme: BoardTheme;
  private readonly animDuration: number;
  private readonly draggable: boolean;
  private readonly clickable: boolean;
  private readonly viewOnly: boolean;
  private readonly showCoords: boolean;
  private readonly onMoveCallback:
    | ((from: SquareKey, to: SquareKey) => boolean | void)
    | null;
  private readonly onSelectCallback:
    | ((sq: SquareKey | null) => void)
    | null;
  private readonly onArrowCallback:
    | ((from: SquareKey, to: SquareKey) => void)
    | null;

  // ── State ────────────────────────────────────────────────────────────
  private pieces: Map<SquareKey, Piece>;
  private orientation: Color;
  private selected: SquareKey | null = null;
  private lastMoveSquares: [SquareKey, SquareKey] | null = null;
  private checkSq: SquareKey | null = null;
  private legalSqs = new Set<SquareKey>();
  private arrowList: Arrow[] = [];

  // ── Interaction ──────────────────────────────────────────────────────
  private dragState: DragState | null = null;
  private arrowDragOrigin: SquareKey | null = null;
  private pendingClick: { sq: SquareKey; x: number; y: number } | null =
    null;
  private destroyed = false;

  // ────────────────────────────────────────────────────────────────────
  // Constructor
  // ────────────────────────────────────────────────────────────────────
  constructor(container: HTMLElement, options?: ChessBoardOptions) {
    injectStyles();

    this.orientation = options?.orientation ?? 'white';
    this.pieceTheme = options?.pieceTheme ?? defaultPieceTheme;
    this.boardTheme = options?.boardTheme ?? defaultBoardTheme;
    this.animDuration = options?.animationDuration ?? 150;
    this.draggable = options?.draggable ?? true;
    this.clickable = options?.clickable ?? true;
    this.viewOnly = options?.viewOnly ?? false;
    this.showCoords = options?.coordinates ?? true;
    this.onMoveCallback = options?.onMove ?? null;
    this.onSelectCallback = options?.onSelect ?? null;
    this.onArrowCallback = options?.onArrowDrawn ?? null;

    const { boardEl, squareEls, svgEl } = createBoardDOM(
      this.orientation,
      this.boardTheme,
      this.showCoords,
    );
    this.boardEl = boardEl;
    this.squareEls = squareEls;
    this.svgEl = svgEl;
    this.boardEl.style.setProperty(
      '--cb-anim-duration',
      `${this.animDuration}ms`,
    );
    container.appendChild(this.boardEl);

    const fen = options?.position ?? STARTING_FEN;
    this.pieces = parseFen(fen);
    this.renderAllPieces();

    this.boardEl.addEventListener('pointerdown', this.handlePointerDown);
    this.boardEl.addEventListener('pointermove', this.handlePointerMove);
    this.boardEl.addEventListener('pointerup', this.handlePointerUp);
    this.boardEl.addEventListener('pointercancel', this.handlePointerCancel);
    this.boardEl.addEventListener('contextmenu', this.handleContextMenu);
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — position
  // ────────────────────────────────────────────────────────────────────
  setPosition(fen: string): void {
    const newPieces = parseFen(fen);
    this.syncPieces(newPieces, true);
  }

  getPosition(): string {
    return positionToFen(this.pieces);
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — orientation
  // ────────────────────────────────────────────────────────────────────
  setOrientation(orientation: Color): void {
    if (orientation === this.orientation) return;
    this.orientation = orientation;
    rebuildSquares(
      this.boardEl,
      this.squareEls,
      orientation,
      this.boardTheme,
      this.showCoords,
    );
    this.repositionAllPieces();
    this.refreshHighlights();
    this.renderArrowsInternal();
  }

  getOrientation(): Color {
    return this.orientation;
  }

  flip(): void {
    this.setOrientation(
      this.orientation === 'white' ? 'black' : 'white',
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — selection & highlights
  // ────────────────────────────────────────────────────────────────────
  select(sq: SquareKey | null): void {
    if (sq) {
      this.doSelect(sq);
    } else {
      this.doDeselect();
    }
  }

  setLastMove(from: SquareKey, to: SquareKey): void {
    this.clearHighlightType('cb-hl-lastmove');
    this.lastMoveSquares = [from, to];
    this.squareEls.get(from)?.classList.add('cb-hl-lastmove');
    this.squareEls.get(to)?.classList.add('cb-hl-lastmove');
  }

  clearLastMove(): void {
    this.clearHighlightType('cb-hl-lastmove');
    this.lastMoveSquares = null;
  }

  setCheck(sq: SquareKey | null): void {
    this.clearHighlightType('cb-hl-check');
    this.checkSq = sq;
    if (sq) {
      this.squareEls.get(sq)?.classList.add('cb-hl-check');
    }
  }

  setLegalMoves(squares: readonly SquareKey[]): void {
    this.clearHighlightType('cb-legal');
    this.legalSqs = new Set(squares);
    for (const sq of squares) {
      this.squareEls.get(sq)?.classList.add('cb-legal');
    }
  }

  clearLegalMoves(): void {
    this.clearHighlightType('cb-legal');
    this.legalSqs.clear();
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — arrows
  // ────────────────────────────────────────────────────────────────────
  setArrows(arrows: readonly Arrow[]): void {
    this.arrowList = [...arrows];
    this.renderArrowsInternal();
  }

  addArrow(from: SquareKey, to: SquareKey, color?: string): void {
    const exists = this.arrowList.some(
      (a) => a.from === from && a.to === to,
    );
    if (exists) return;
    this.arrowList.push({ from, to, color });
    this.renderArrowsInternal();
  }

  removeArrow(from: SquareKey, to: SquareKey): void {
    this.arrowList = this.arrowList.filter(
      (a) => !(a.from === from && a.to === to),
    );
    this.renderArrowsInternal();
  }

  clearArrows(): void {
    this.arrowList = [];
    this.renderArrowsInternal();
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — lifecycle
  // ────────────────────────────────────────────────────────────────────
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.boardEl.removeEventListener(
      'pointerdown',
      this.handlePointerDown,
    );
    this.boardEl.removeEventListener(
      'pointermove',
      this.handlePointerMove,
    );
    this.boardEl.removeEventListener('pointerup', this.handlePointerUp);
    this.boardEl.removeEventListener(
      'pointercancel',
      this.handlePointerCancel,
    );
    this.boardEl.removeEventListener(
      'contextmenu',
      this.handleContextMenu,
    );
    this.boardEl.remove();
    this.pieceEls.clear();
    this.squareEls.clear();
    this.pieces.clear();
    this.arrowList.length = 0;
    this.legalSqs.clear();
  }

  // ────────────────────────────────────────────────────────────────────
  // Rendering internals
  // ────────────────────────────────────────────────────────────────────
  private renderAllPieces(): void {
    for (const el of this.pieceEls.values()) el.remove();
    this.pieceEls.clear();
    for (const [sq, piece] of this.pieces) {
      const el = createPieceEl(
        sq,
        piece,
        this.orientation,
        this.pieceTheme,
      );
      this.boardEl.insertBefore(el, this.svgEl);
      this.pieceEls.set(sq, el);
    }
    this.updateOccupied();
  }

  private syncPieces(
    newPieces: Map<SquareKey, Piece>,
    animate: boolean,
  ): void {
    const diff = diffPieces(this.pieces, newPieces);

    // Process removed first so captured pieces are gone before we move
    // the capturing piece to their square (avoid overwriting pieceEls).
    for (const sq of diff.removed) {
      const el = this.pieceEls.get(sq);
      if (el) {
        el.remove();
        this.pieceEls.delete(sq);
      }
    }

    for (const { from, to } of diff.moved) {
      const el = this.pieceEls.get(from);
      if (!el) continue;
      this.pieceEls.delete(from);
      this.pieceEls.set(to, el);
      el.setAttribute('data-square', to);
      this.translatePiece(el, to, animate);
    }

    for (const { square, piece } of diff.added) {
      const el = createPieceEl(
        square,
        piece,
        this.orientation,
        this.pieceTheme,
      );
      this.boardEl.insertBefore(el, this.svgEl);
      this.pieceEls.set(square, el);
    }

    this.pieces = newPieces;
    this.updateOccupied();
  }

  private repositionAllPieces(): void {
    for (const [sq, el] of this.pieceEls) {
      const [col, row] = squareToCoords(sq, this.orientation);
      el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    }
  }

  private translatePiece(
    el: HTMLElement,
    sq: SquareKey,
    animate: boolean,
  ): void {
    const [col, row] = squareToCoords(sq, this.orientation);
    if (animate && this.animDuration > 0) {
      el.classList.add('cb-animating');
      el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
      el.addEventListener(
        'transitionend',
        () => el.classList.remove('cb-animating'),
        { once: true },
      );
    } else {
      el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    }
  }

  private updateOccupied(): void {
    for (const [sq, el] of this.squareEls) {
      el.classList.toggle('cb-has-piece', this.pieces.has(sq));
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Highlight internals
  // ────────────────────────────────────────────────────────────────────
  private refreshHighlights(): void {
    this.clearHighlightType('cb-hl-lastmove');
    this.clearHighlightType('cb-hl-selected');
    this.clearHighlightType('cb-hl-check');
    this.clearHighlightType('cb-legal');

    if (this.lastMoveSquares) {
      this.squareEls
        .get(this.lastMoveSquares[0])
        ?.classList.add('cb-hl-lastmove');
      this.squareEls
        .get(this.lastMoveSquares[1])
        ?.classList.add('cb-hl-lastmove');
    }
    if (this.selected) {
      this.squareEls.get(this.selected)?.classList.add('cb-hl-selected');
    }
    if (this.checkSq) {
      this.squareEls.get(this.checkSq)?.classList.add('cb-hl-check');
    }
    for (const sq of this.legalSqs) {
      this.squareEls.get(sq)?.classList.add('cb-legal');
    }
    this.updateOccupied();
  }

  private clearHighlightType(cls: string): void {
    for (const el of this.squareEls.values()) {
      el.classList.remove(cls);
    }
  }

  private renderArrowsInternal(): void {
    renderArrows(this.svgEl, this.arrowList, this.orientation);
  }

  // ────────────────────────────────────────────────────────────────────
  // Selection internals
  // ────────────────────────────────────────────────────────────────────
  private doSelect(sq: SquareKey): void {
    if (this.selected) {
      this.squareEls
        .get(this.selected)
        ?.classList.remove('cb-hl-selected');
    }
    this.selected = sq;
    this.squareEls.get(sq)?.classList.add('cb-hl-selected');
    this.onSelectCallback?.(sq);
  }

  private doDeselect(): void {
    if (this.selected) {
      this.squareEls
        .get(this.selected)
        ?.classList.remove('cb-hl-selected');
    }
    this.selected = null;
    this.clearLegalMoves();
    this.onSelectCallback?.(null);
  }

  // ────────────────────────────────────────────────────────────────────
  // Move internals (after accepted drag or click-to-move)
  // ────────────────────────────────────────────────────────────────────
  private applyMove(from: SquareKey, to: SquareKey): void {
    const piece = this.pieces.get(from);
    if (!piece) return;

    const capturedEl = this.pieceEls.get(to);
    if (capturedEl) {
      capturedEl.remove();
      this.pieceEls.delete(to);
    }

    this.pieces.delete(from);
    this.pieces.set(to, piece);

    const el = this.pieceEls.get(from);
    if (el) {
      this.pieceEls.delete(from);
      this.pieceEls.set(to, el);
      el.setAttribute('data-square', to);
      const [col, row] = squareToCoords(to, this.orientation);
      el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    }

    this.setLastMove(from, to);
    this.updateOccupied();
  }

  // ────────────────────────────────────────────────────────────────────
  // Coordinate helpers
  // ────────────────────────────────────────────────────────────────────
  private squareFromPointer(e: PointerEvent): SquareKey | null {
    const rect = this.boardEl.getBoundingClientRect();
    const size = rect.width / 8;
    const col = Math.max(
      0,
      Math.min(7, Math.floor((e.clientX - rect.left) / size)),
    );
    const row = Math.max(
      0,
      Math.min(7, Math.floor((e.clientY - rect.top) / size)),
    );
    return coordsToSquare(col, row, this.orientation);
  }

  // ────────────────────────────────────────────────────────────────────
  // Event handlers (arrow-function fields for stable `this`)
  // ────────────────────────────────────────────────────────────────────
  private handlePointerDown = (e: PointerEvent): void => {
    if (this.destroyed) return;

    // Right click → arrow drawing
    if (e.button === 2) {
      e.preventDefault();
      const sq = this.squareFromPointer(e);
      if (sq) {
        this.arrowDragOrigin = sq;
        this.boardEl.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (e.button !== 0 || this.viewOnly) return;

    const sq = this.squareFromPointer(e);
    if (!sq) return;

    // Left click clears drawn arrows
    if (this.arrowList.length > 0) {
      this.clearArrows();
    }

    // Piece already selected + press on a legal square (empty or capture) → try move; don't drag/select the target piece
    if (
      this.selected &&
      sq !== this.selected &&
      this.legalSqs.has(sq)
    ) {
      const result = this.onMoveCallback?.(this.selected, sq);
      if (result === false) {
        this.doDeselect();
      } else {
        this.applyMove(this.selected, sq);
        this.doDeselect();
      }
      return;
    }

    // Press on a piece → start drag immediately; release on same square will count as select
    if (this.pieces.has(sq)) {
      if (this.draggable) {
        this.startDrag(sq, e);
      } else {
        this.pendingClick = { sq, x: e.clientX, y: e.clientY };
        this.boardEl.setPointerCapture(e.pointerId);
      }
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.destroyed) return;

    if (this.arrowDragOrigin) return;

    if (this.dragState) {
      this.updateDrag(e);
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.destroyed) return;

    // Arrow drawing end
    if (e.button === 2 && this.arrowDragOrigin) {
      const sq = this.squareFromPointer(e);
      if (sq && sq !== this.arrowDragOrigin) {
        this.addArrow(this.arrowDragOrigin, sq);
        this.onArrowCallback?.(this.arrowDragOrigin, sq);
      }
      try {
        this.boardEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      this.arrowDragOrigin = null;
      return;
    }

    // Drag end
    if (this.dragState) {
      this.endDrag(e);
      return;
    }

    // Click end: try move, or select/deselect on pointerup and release capture
    if (this.pendingClick) {
      const clickedSq = this.pendingClick.sq;
      if (this.selected && clickedSq !== this.selected) {
        // Clicked a different square (empty or piece): try to move selected piece there
        const result = this.onMoveCallback?.(this.selected, clickedSq);
        if (result === false) {
          // Only select the piece on clickedSq if it's not a legal move (e.g. capture); otherwise deselect
          if (
            this.pieces.has(clickedSq) &&
            this.clickable &&
            !this.legalSqs.has(clickedSq)
          ) {
            this.doSelect(clickedSq);
          } else {
            this.doDeselect();
          }
        } else {
          this.applyMove(this.selected, clickedSq);
          this.doDeselect();
        }
      } else if (this.clickable) {
        if (clickedSq === this.selected) {
          this.doDeselect();
        } else {
          this.doSelect(clickedSq);
        }
      }
      try {
        this.boardEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      this.pendingClick = null;
      return;
    }
  };

  private handlePointerCancel = (e: PointerEvent): void => {
    if (this.destroyed) return;

    if (this.dragState) {
      const { pieceEl, originSq, pointerId } = this.dragState;
      pieceEl.classList.remove('cb-dragging');
      try {
        this.boardEl.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
      this.translatePiece(pieceEl, originSq, true);
      this.dragState = null;
      return;
    }

    if (this.pendingClick) {
      try {
        this.boardEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      this.pendingClick = null;
      return;
    }

    if (this.arrowDragOrigin) {
      try {
        this.boardEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      this.arrowDragOrigin = null;
    }
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  // ────────────────────────────────────────────────────────────────────
  // Drag internals
  // ────────────────────────────────────────────────────────────────────
  private startDrag(sq: SquareKey, e: PointerEvent): void {
    const el = this.pieceEls.get(sq);
    if (!el) return;

    this.boardEl.setPointerCapture(e.pointerId);

    // Select piece so selection highlight and legal-move squares show (same as when clicking)
    if (this.clickable) {
      this.doSelect(sq);
    }

    const rect = this.boardEl.getBoundingClientRect();
    el.classList.add('cb-dragging');
    el.classList.remove('cb-animating');

    this.dragState = {
      pieceEl: el,
      originSq: sq,
      pointerId: e.pointerId,
      boardRect: rect,
    };

    this.updateDrag(e);
  }

  private updateDrag(e: PointerEvent): void {
    if (!this.dragState) return;
    const { pieceEl, boardRect } = this.dragState;
    const pieceSize = boardRect.width / 8;
    const relX = e.clientX - boardRect.left;
    const relY = e.clientY - boardRect.top;
    const tx = ((relX - pieceSize / 2) / pieceSize) * 100;
    const ty = ((relY - pieceSize / 2) / pieceSize) * 100;
    pieceEl.style.transform = `translate(${tx}%, ${ty}%)`;
  }

  private endDrag(e: PointerEvent): void {
    if (!this.dragState) return;
    const { pieceEl, originSq, pointerId } = this.dragState;

    pieceEl.classList.remove('cb-dragging');
    try {
      this.boardEl.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }

    const sq = this.squareFromPointer(e);

    if (sq && sq !== originSq) {
      const result = this.onMoveCallback?.(originSq, sq);
      if (result === false) {
        this.translatePiece(pieceEl, originSq, true);
        if (this.clickable) this.doSelect(originSq);
      } else {
        this.applyMove(originSq, sq);
        this.doDeselect();
      }
    } else {
      this.translatePiece(pieceEl, originSq, true);
      if (this.clickable) this.doSelect(originSq);
    }

    this.dragState = null;
  }
}
