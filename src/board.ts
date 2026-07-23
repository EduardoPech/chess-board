import type {
  Arrow,
  BoardTheme,
  ChessBoardOptions,
  Circle,
  Color,
  Piece,
  PieceTheme,
  PieceType,
  SquareKey,
} from './types.ts';
import { parseFen, positionToFen, STARTING_FEN } from './fen.ts';
import { defaultPieceTheme, defaultBoardTheme } from './assets.ts';
import { injectStyles } from './styles.ts';
import { squareToCoords, coordsToSquare } from './coords.ts';
import { createBoardDOM, createPieceEl, reassignSquares } from './dom.ts';
import { diffPieces } from './diff.ts';
import { renderShapes } from './shapes.ts';
import { HighlightTracker } from './highlights.ts';
import { showPromotionPicker, type PromotionPickerHandle } from './promotion.ts';
import { directionFromKey, moveFocus } from './keyboard.ts';
import {
  decideClickRelease,
  decideDragRelease,
  decidePress,
  decideShapeRelease,
} from './input.ts';

interface DragState {
  readonly pieceEl: HTMLElement;
  readonly ghostEl: HTMLElement;
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
  private readonly highlights: HighlightTracker;
  private readonly liveRegion: HTMLElement;

  // ── Config ───────────────────────────────────────────────────────────
  private readonly pieceTheme: PieceTheme;
  private readonly boardTheme: BoardTheme;
  private readonly animDuration: number;
  private readonly draggable: boolean;
  private readonly clickable: boolean;
  private readonly viewOnly: boolean;
  private readonly showCoords: boolean;
  private readonly promotionPicker: boolean;
  private readonly keyboardEnabled: boolean;
  private readonly onMoveCallback:
    | ((from: SquareKey, to: SquareKey, promotion?: PieceType) => boolean | void)
    | null;
  private readonly onSelectCallback:
    | ((sq: SquareKey | null) => void)
    | null;
  private readonly onArrowCallback:
    | ((from: SquareKey, to: SquareKey) => void)
    | null;
  private readonly onCircleCallback: ((sq: SquareKey) => void) | null;

  // ── State ────────────────────────────────────────────────────────────
  private pieces: Map<SquareKey, Piece>;
  private orientation: Color;
  private selected: SquareKey | null = null;
  private lastMoveSquares: [SquareKey, SquareKey] | null = null;
  private checkSq: SquareKey | null = null;
  private legalSqs = new Set<SquareKey>();
  private arrowList: Arrow[] = [];
  private circleList: Circle[] = [];
  private focusedSq: SquareKey;

  // ── Interaction ──────────────────────────────────────────────────────
  private dragState: DragState | null = null;
  private dragRafId: number | null = null;
  private pendingDragPos: { x: number; y: number } | null = null;
  private shapeDragOrigin: SquareKey | null = null;
  private pendingClick: { sq: SquareKey; x: number; y: number } | null =
    null;
  private pendingPromotion: PromotionPickerHandle | null = null;
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
    this.promotionPicker = options?.promotionPicker ?? false;
    this.keyboardEnabled = options?.keyboard ?? !this.viewOnly;
    this.onMoveCallback = options?.onMove ?? null;
    this.onSelectCallback = options?.onSelect ?? null;
    this.onArrowCallback = options?.onArrowDrawn ?? null;
    this.onCircleCallback = options?.onCircleDrawn ?? null;

    const { boardEl, squareEls, svgEl } = createBoardDOM(
      this.orientation,
      this.boardTheme,
      this.showCoords,
    );
    this.boardEl = boardEl;
    this.squareEls = squareEls;
    this.svgEl = svgEl;
    this.highlights = new HighlightTracker(this.squareEls);
    this.boardEl.style.setProperty(
      '--cb-anim-duration',
      `${this.animDuration}ms`,
    );

    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'cb-sr-only';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('role', 'status');
    this.boardEl.appendChild(this.liveRegion);

    container.appendChild(this.boardEl);

    const fen = options?.position ?? STARTING_FEN;
    this.pieces = parseFen(fen);
    this.renderAllPieces();

    // Roving tabindex starts on the visually bottom-left square, the
    // natural first Tab stop regardless of orientation.
    this.focusedSq = coordsToSquare(0, 7, this.orientation)!;
    if (this.keyboardEnabled) {
      this.applyRovingTabIndex();
    }

    this.boardEl.addEventListener('pointerdown', this.handlePointerDown);
    this.boardEl.addEventListener('pointermove', this.handlePointerMove);
    this.boardEl.addEventListener('pointerup', this.handlePointerUp);
    this.boardEl.addEventListener('pointercancel', this.handlePointerCancel);
    this.boardEl.addEventListener('contextmenu', this.handleContextMenu);
    if (this.keyboardEnabled) {
      this.boardEl.addEventListener('keydown', this.handleKeyDown);
    }
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
    // Strip highlight classes while squareEls still reflects the current
    // (pre-flip) square→div assignment, so nothing survives a relabel.
    this.highlights.clearAll();
    this.orientation = orientation;
    reassignSquares(
      this.boardEl,
      this.squareEls,
      orientation,
      this.boardTheme,
      this.showCoords,
    );
    this.repositionAllPieces();
    this.reapplyHighlights();
    this.renderShapesInternal();
    if (this.keyboardEnabled) {
      this.applyRovingTabIndex();
    }
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
    this.lastMoveSquares = [from, to];
    this.highlights.set('cb-hl-lastmove', [from, to]);
  }

  clearLastMove(): void {
    this.lastMoveSquares = null;
    this.highlights.clear('cb-hl-lastmove');
  }

  setCheck(sq: SquareKey | null): void {
    this.checkSq = sq;
    this.highlights.set('cb-hl-check', sq ? [sq] : []);
  }

  setLegalMoves(squares: readonly SquareKey[]): void {
    this.legalSqs = new Set(squares);
    this.highlights.set('cb-legal', squares);
  }

  clearLegalMoves(): void {
    this.legalSqs.clear();
    this.highlights.clear('cb-legal');
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — arrows
  // ────────────────────────────────────────────────────────────────────
  setArrows(arrows: readonly Arrow[]): void {
    this.arrowList = [...arrows];
    this.renderShapesInternal();
  }

  addArrow(from: SquareKey, to: SquareKey, color?: string): void {
    const exists = this.arrowList.some(
      (a) => a.from === from && a.to === to,
    );
    if (exists) return;
    this.arrowList.push({ from, to, color });
    this.renderShapesInternal();
  }

  removeArrow(from: SquareKey, to: SquareKey): void {
    this.arrowList = this.arrowList.filter(
      (a) => !(a.from === from && a.to === to),
    );
    this.renderShapesInternal();
  }

  clearArrows(): void {
    this.arrowList = [];
    this.renderShapesInternal();
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — circles
  // ────────────────────────────────────────────────────────────────────
  setCircles(circles: readonly Circle[]): void {
    this.circleList = [...circles];
    this.renderShapesInternal();
  }

  addCircle(square: SquareKey, color?: string): void {
    const exists = this.circleList.some((c) => c.square === square);
    if (exists) return;
    this.circleList.push({ square, color });
    this.renderShapesInternal();
  }

  removeCircle(square: SquareKey): void {
    this.circleList = this.circleList.filter((c) => c.square !== square);
    this.renderShapesInternal();
  }

  clearCircles(): void {
    this.circleList = [];
    this.renderShapesInternal();
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API — lifecycle
  // ────────────────────────────────────────────────────────────────────
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelDragFrame();
    this.dismissPendingPromotion();
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
    if (this.keyboardEnabled) {
      this.boardEl.removeEventListener('keydown', this.handleKeyDown);
    }
    this.boardEl.remove();
    this.pieceEls.clear();
    this.squareEls.clear();
    this.pieces.clear();
    this.arrowList.length = 0;
    this.circleList.length = 0;
    this.legalSqs.clear();
  }

  // ────────────────────────────────────────────────────────────────────
  // Rendering internals
  // ────────────────────────────────────────────────────────────────────
  private renderAllPieces(): void {
    // Remove all existing piece elements from the DOM, not only those
    // tracked in pieceEls, to avoid leaving orphaned nodes around.
    const existing = this.boardEl.querySelectorAll('.cb-piece');
    existing.forEach((el) => el.remove());
    this.pieceEls.clear();

    const fragment = document.createDocumentFragment();
    for (const [sq, piece] of this.pieces) {
      const el = createPieceEl(
        sq,
        piece,
        this.orientation,
        this.pieceTheme,
      );
      fragment.appendChild(el);
      this.pieceEls.set(sq, el);
    }
    this.boardEl.insertBefore(fragment, this.svgEl);

    this.updateOccupied();
  }

  private syncPieces(
    newPieces: Map<SquareKey, Piece>,
    animate: boolean,
  ): void {
    const diff = diffPieces(this.pieces, newPieces);

    const totalChanges =
      diff.moved.length + diff.added.length + diff.removed.length;
    if (totalChanges > 8) {
      this.pieces = newPieces;
      this.renderAllPieces();
      this.updateOccupied();
      return;
    }

    // Process removed first so captured pieces are gone from pieceEls
    // before we move the capturing piece to their square. The DOM element
    // itself fades out rather than vanishing instantly.
    for (const sq of diff.removed) {
      const el = this.pieceEls.get(sq);
      if (el) {
        this.pieceEls.delete(sq);
        this.fadeOutAndRemove(el, animate);
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
      if (animate && this.animDuration > 0) {
        el.classList.add('cb-fade-in');
      }
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

  private fadeOutAndRemove(el: HTMLElement, animate: boolean): void {
    if (!animate || this.animDuration <= 0) {
      el.remove();
      return;
    }
    el.classList.add('cb-fade-out');
    const cleanup = () => el.remove();
    el.addEventListener('transitionend', cleanup, { once: true });
    // Fallback in case transitionend never fires (e.g. element detached
    // from a display:none ancestor mid-transition).
    setTimeout(cleanup, this.animDuration + 50);
  }

  private updateOccupied(): void {
    this.highlights.set('cb-has-piece', this.pieces.keys());
  }

  // ────────────────────────────────────────────────────────────────────
  // Highlight internals
  // ────────────────────────────────────────────────────────────────────
  /**
   * Re-applies all current highlight state against whatever squareEls
   * currently point to. Callers that restructure the square→element
   * mapping (orientation flip) must call `this.highlights.clearAll()`
   * first, while the mapping still reflects the *old* assignment —
   * otherwise a reused div could keep a stale class from the square it
   * used to represent.
   */
  private reapplyHighlights(): void {
    if (this.lastMoveSquares) {
      this.highlights.set('cb-hl-lastmove', this.lastMoveSquares);
    }
    if (this.selected) {
      this.highlights.set('cb-hl-selected', [this.selected]);
    }
    if (this.checkSq) {
      this.highlights.set('cb-hl-check', [this.checkSq]);
    }
    this.highlights.set('cb-legal', this.legalSqs);
    this.updateOccupied();
  }

  private renderShapesInternal(): void {
    renderShapes(this.svgEl, this.arrowList, this.circleList, this.orientation);
  }

  // ────────────────────────────────────────────────────────────────────
  // Selection internals
  // ────────────────────────────────────────────────────────────────────
  private doSelect(sq: SquareKey): void {
    this.selected = sq;
    this.highlights.set('cb-hl-selected', [sq]);
    const piece = this.pieces.get(sq);
    this.announce(
      piece ? `${piece.color} ${piece.type} on ${sq} selected` : `${sq} selected`,
    );
    this.onSelectCallback?.(sq);
  }

  /**
   * @param announce Pass `false` right after a move was just announced
   * (see `tryMove`'s accept path) — the aria-live region only holds one
   * message at a time, and the move description matters more than a
   * generic "Deselected" that would otherwise overwrite it in the same
   * synchronous tick, before a screen reader ever gets to read it.
   */
  private doDeselect(announce = true): void {
    const wasSelected = this.selected !== null;
    this.selected = null;
    this.highlights.clear('cb-hl-selected');
    this.clearLegalMoves();
    if (wasSelected && announce) this.announce('Deselected');
    this.onSelectCallback?.(null);
  }

  private announce(message: string): void {
    this.liveRegion.textContent = message;
  }

  // ────────────────────────────────────────────────────────────────────
  // Move internals (after accepted drag or click-to-move)
  // ────────────────────────────────────────────────────────────────────
  private applyMove(
    from: SquareKey,
    to: SquareKey,
    promotion?: PieceType,
  ): void {
    const piece = this.pieces.get(from);
    if (!piece) return;
    const movedPiece: Piece = promotion
      ? { color: piece.color, type: promotion }
      : piece;

    const capturedEl = this.pieceEls.get(to);
    const wasCapture = capturedEl !== undefined;
    if (capturedEl) {
      this.pieceEls.delete(to);
      this.fadeOutAndRemove(capturedEl, this.animDuration > 0);
    }

    this.pieces.delete(from);
    this.pieces.set(to, movedPiece);

    const el = this.pieceEls.get(from);
    if (el) {
      this.pieceEls.delete(from);
      if (promotion) {
        // Piece type changed — swap the element rather than reuse it, so
        // its theme content (SVG/img) matches the promoted piece.
        el.remove();
        const newEl = createPieceEl(to, movedPiece, this.orientation, this.pieceTheme);
        this.boardEl.insertBefore(newEl, this.svgEl);
        this.pieceEls.set(to, newEl);
      } else {
        this.pieceEls.set(to, el);
        el.setAttribute('data-square', to);
        const [col, row] = squareToCoords(to, this.orientation);
        el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
      }
    }

    this.setLastMove(from, to);
    this.updateOccupied();
    this.announce(
      `${movedPiece.color} ${movedPiece.type} ${from} to ${to}` +
        (wasCapture ? ', capture' : '') +
        (promotion ? `, promoted to ${promotion}` : ''),
    );
  }

  private isPromotionMove(from: SquareKey, to: SquareKey): boolean {
    const piece = this.pieces.get(from);
    if (!piece || piece.type !== 'pawn') return false;
    const targetRank = to.charAt(1);
    return piece.color === 'white' ? targetRank === '8' : targetRank === '1';
  }

  private dismissPendingPromotion(): void {
    this.pendingPromotion?.destroy();
    this.pendingPromotion = null;
  }

  /**
   * Attempts a move through `onMove`, uniformly handling accept
   * (apply + deselect) for every interaction path. Callers only need to
   * supply what happens on rejection, since that differs by path (press,
   * click, drag). When the move is a promotion and `promotionPicker` is
   * enabled, this defers to the picker UI first and resumes the same
   * accept/reject flow once the user chooses — or cancels, which is
   * treated as a rejection.
   */
  private tryMove(from: SquareKey, to: SquareKey, onReject: () => void): void {
    if (this.promotionPicker && this.isPromotionMove(from, to)) {
      const piece = this.pieces.get(from);
      if (!piece) return;
      this.dismissPendingPromotion();
      this.pendingPromotion = showPromotionPicker(
        this.boardEl,
        to,
        piece.color,
        this.orientation,
        this.pieceTheme,
        (promotionType) => {
          this.dismissPendingPromotion();
          const result = this.onMoveCallback?.(from, to, promotionType);
          if (result === false) {
            onReject();
          } else {
            this.applyMove(from, to, promotionType);
            this.doDeselect(false);
          }
        },
        () => {
          this.dismissPendingPromotion();
          onReject();
        },
      );
      return;
    }

    const result = this.onMoveCallback?.(from, to);
    if (result === false) {
      onReject();
    } else {
      this.applyMove(from, to);
      this.doDeselect(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Coordinate helpers
  // ────────────────────────────────────────────────────────────────────
  private squareFromPointer(e: PointerEvent): SquareKey | null {
    return this.squareFromClientPos({ x: e.clientX, y: e.clientY });
  }

  private squareFromClientPos(pos: { x: number; y: number }): SquareKey | null {
    const rect = this.boardEl.getBoundingClientRect();
    const size = rect.width / 8;
    const col = Math.max(
      0,
      Math.min(7, Math.floor((pos.x - rect.left) / size)),
    );
    const row = Math.max(
      0,
      Math.min(7, Math.floor((pos.y - rect.top) / size)),
    );
    return coordsToSquare(col, row, this.orientation);
  }

  // ────────────────────────────────────────────────────────────────────
  // Event handlers (arrow-function fields for stable `this`)
  // ────────────────────────────────────────────────────────────────────
  private handlePointerDown = (e: PointerEvent): void => {
    if (this.destroyed) return;

    // Right click → arrow/circle drawing
    if (e.button === 2) {
      e.preventDefault();
      const sq = this.squareFromPointer(e);
      if (sq) {
        this.shapeDragOrigin = sq;
        this.boardEl.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (e.button !== 0 || this.viewOnly) return;

    const sq = this.squareFromPointer(e);
    if (!sq) return;

    // Left click clears drawn arrows and circles
    if (this.arrowList.length > 0 || this.circleList.length > 0) {
      this.arrowList = [];
      this.circleList = [];
      this.renderShapesInternal();
    }

    const intent = decidePress(
      { selected: this.selected, legalSqs: this.legalSqs },
      sq,
      this.pieces.has(sq),
      { draggable: this.draggable },
    );

    switch (intent.kind) {
      case 'attemptMove':
        this.tryMove(intent.from, intent.to, () => this.doDeselect());
        break;
      case 'startDrag':
        this.startDrag(intent.square, e);
        break;
      case 'startPendingClick':
        this.pendingClick = { sq: intent.square, x: e.clientX, y: e.clientY };
        this.boardEl.setPointerCapture(e.pointerId);
        break;
      case 'none':
        break;
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.destroyed) return;

    if (this.shapeDragOrigin) return;

    if (this.dragState) {
      // Pointer events can fire well past 60Hz; batch to one transform
      // write per animation frame instead of one per event.
      this.pendingDragPos = { x: e.clientX, y: e.clientY };
      if (this.dragRafId === null) {
        this.dragRafId = requestAnimationFrame(() => {
          this.dragRafId = null;
          if (this.pendingDragPos) {
            this.updateDrag(this.pendingDragPos);
          }
        });
      }
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.destroyed) return;

    // Arrow/circle drawing end
    if (e.button === 2 && this.shapeDragOrigin) {
      const sq = this.squareFromPointer(e);
      const shapeIntent = decideShapeRelease(this.shapeDragOrigin, sq);
      switch (shapeIntent.kind) {
        case 'addArrow':
          this.addArrow(shapeIntent.from, shapeIntent.to);
          this.onArrowCallback?.(shapeIntent.from, shapeIntent.to);
          break;
        case 'toggleCircle': {
          const exists = this.circleList.some(
            (c) => c.square === shapeIntent.square,
          );
          if (exists) {
            this.removeCircle(shapeIntent.square);
          } else {
            this.addCircle(shapeIntent.square);
            this.onCircleCallback?.(shapeIntent.square);
          }
          break;
        }
        case 'none':
          break;
      }
      try {
        this.boardEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      this.shapeDragOrigin = null;
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
      const intent = decideClickRelease(
        { selected: this.selected, legalSqs: this.legalSqs },
        clickedSq,
        this.clickable,
      );

      switch (intent.kind) {
        case 'attemptMove':
          this.tryMove(intent.from, intent.to, () => {
            // Only select the piece on clickedSq if it's not a legal move (e.g. capture); otherwise deselect
            if (this.clickable && !this.legalSqs.has(clickedSq)) {
              this.doSelect(clickedSq);
            } else {
              this.doDeselect();
            }
          });
          break;
        case 'select':
          this.doSelect(intent.square);
          break;
        case 'deselect':
          this.doDeselect();
          break;
        case 'none':
          break;
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
      const { pieceEl, ghostEl, originSq, pointerId } = this.dragState;
      this.cancelDragFrame();
      pieceEl.classList.remove('cb-dragging');
      ghostEl.remove();
      this.highlights.clear('cb-drag-over');
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

    if (this.shapeDragOrigin) {
      try {
        this.boardEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      this.shapeDragOrigin = null;
    }
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.destroyed) return;

    const direction = directionFromKey(e.key);
    if (direction) {
      e.preventDefault();
      const next = moveFocus(this.focusedSq, direction, this.orientation);
      if (next && this.squareEls.has(next)) {
        this.setFocusedSquare(next);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activateFocusedSquare();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.doDeselect();
    }
  };

  // ────────────────────────────────────────────────────────────────────
  // Keyboard internals
  // ────────────────────────────────────────────────────────────────────
  /**
   * Resets the roving tabindex to `-1` on every square and `0` on
   * whichever div currently represents `focusedSq`. Called on
   * construction and after `reassignSquares` restructures the
   * square→div mapping (orientation flip), since a div's tabIndex
   * property isn't reset by relabeling.
   */
  private applyRovingTabIndex(): void {
    for (const el of this.squareEls.values()) {
      el.tabIndex = -1;
    }
    const el = this.squareEls.get(this.focusedSq);
    if (el) el.tabIndex = 0;
  }

  private setFocusedSquare(sq: SquareKey): void {
    const prevEl = this.squareEls.get(this.focusedSq);
    if (prevEl) prevEl.tabIndex = -1;
    this.focusedSq = sq;
    const nextEl = this.squareEls.get(sq);
    if (nextEl) {
      nextEl.tabIndex = 0;
      nextEl.focus();
    }
  }

  /** Enter/Space on the focused square — the keyboard equivalent of a click. */
  private activateFocusedSquare(): void {
    if (this.viewOnly) return;
    const sq = this.focusedSq;
    // Mirrors the click-release invariant: only a square that already
    // holds a piece can start a selection.
    if (!this.selected && !this.pieces.has(sq)) return;

    const intent = decideClickRelease(
      { selected: this.selected, legalSqs: this.legalSqs },
      sq,
      this.clickable,
    );

    switch (intent.kind) {
      case 'attemptMove':
        this.tryMove(intent.from, intent.to, () => {
          if (this.clickable && !this.legalSqs.has(sq)) {
            this.doSelect(sq);
          } else {
            this.doDeselect();
          }
        });
        break;
      case 'select':
        this.doSelect(intent.square);
        break;
      case 'deselect':
        this.doDeselect();
        break;
      case 'none':
        break;
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Drag internals
  // ────────────────────────────────────────────────────────────────────
  private startDrag(sq: SquareKey, e: PointerEvent): void {
    const el = this.pieceEls.get(sq);
    const piece = this.pieces.get(sq);
    if (!el || !piece) return;

    this.boardEl.setPointerCapture(e.pointerId);

    // Select piece so selection highlight and legal-move squares show (same as when clicking)
    if (this.clickable) {
      this.doSelect(sq);
    }

    const rect = this.boardEl.getBoundingClientRect();
    el.classList.add('cb-dragging');
    el.classList.remove('cb-animating');

    // Ghost: a faded copy left behind at the origin square while the real
    // piece element follows the pointer.
    const ghostEl = createPieceEl(sq, piece, this.orientation, this.pieceTheme);
    ghostEl.classList.add('cb-ghost');
    this.boardEl.insertBefore(ghostEl, el);

    this.dragState = {
      pieceEl: el,
      ghostEl,
      originSq: sq,
      pointerId: e.pointerId,
      boardRect: rect,
    };

    this.updateDrag({ x: e.clientX, y: e.clientY });
  }

  private updateDrag(pos: { x: number; y: number }): void {
    if (!this.dragState) return;
    const { pieceEl, boardRect } = this.dragState;
    const pieceSize = boardRect.width / 8;
    const relX = pos.x - boardRect.left;
    const relY = pos.y - boardRect.top;
    const tx = ((relX - pieceSize / 2) / pieceSize) * 100;
    const ty = ((relY - pieceSize / 2) / pieceSize) * 100;
    pieceEl.style.transform = `translate(${tx}%, ${ty}%)`;

    const hoverSq = this.squareFromClientPos(pos);
    this.highlights.set('cb-drag-over', hoverSq ? [hoverSq] : []);
  }

  private cancelDragFrame(): void {
    if (this.dragRafId !== null) {
      cancelAnimationFrame(this.dragRafId);
      this.dragRafId = null;
    }
    this.pendingDragPos = null;
  }

  private endDrag(e: PointerEvent): void {
    if (!this.dragState) return;
    const { pieceEl, ghostEl, originSq, pointerId } = this.dragState;

    this.cancelDragFrame();
    pieceEl.classList.remove('cb-dragging');
    ghostEl.remove();
    this.highlights.clear('cb-drag-over');
    try {
      this.boardEl.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }

    const sq = this.squareFromPointer(e);
    const intent = decideDragRelease(originSq, sq);

    if (intent.kind === 'attemptMove') {
      // Snap onto the target square first (it was following the pointer
      // pixel-by-pixel) so it's correctly placed if a promotion picker
      // opens over it; applyMove repositions it again regardless.
      this.translatePiece(pieceEl, intent.to, false);
      this.tryMove(intent.from, intent.to, () => {
        this.translatePiece(pieceEl, originSq, true);
        if (this.clickable) this.doSelect(originSq);
      });
    } else {
      this.translatePiece(pieceEl, originSq, true);
      if (this.clickable) this.doSelect(originSq);
    }

    this.dragState = null;
  }
}
