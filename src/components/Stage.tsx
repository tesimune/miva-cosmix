import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { COLS, ROWS } from '../engine/analyzer';
import { jukebox } from '../engine/jukebox';
import { useJukebox } from '../useJukebox';
import MissingMedia from './MissingMedia';

const ARROW_MOVES: Record<string, { col: number; row: number }> = {
  ArrowLeft: { col: -1, row: 0 },
  ArrowRight: { col: 1, row: 0 },
  ArrowUp: { col: 0, row: -1 },
  ArrowDown: { col: 0, row: 1 },
  Enter: { col: 0, row: 0 },
};

const CENTRE_CELL = { col: Math.floor(COLS / 2), row: Math.floor(ROWS / 2) };

export default function Stage({ onPickFile }: { onPickFile: () => void }) {
  const { isMediaMissing } = useJukebox();
  const stage = useRef<HTMLDivElement>(null);
  const mediaHost = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  useEffect(() => jukebox.mount(mediaHost.current!, stage.current!, overlay.current!), []);

  useEffect(() => {
    const stopDragging = () => {
      isDragging.current = false;
    };
    window.addEventListener('pointerup', stopDragging);
    return () => window.removeEventListener('pointerup', stopDragging);
  }, []);

  const cellUnderPointer = (event: PointerEvent) => {
    const box = stage.current!.getBoundingClientRect();
    return {
      col: Math.floor(((event.clientX - box.left) / box.width) * COLS),
      row: Math.floor(((event.clientY - box.top) / box.height) * ROWS),
    };
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isMediaMissing) return;
    isDragging.current = true;
    const cell = cellUnderPointer(event);
    jukebox.exploreCell(cell.col, cell.row, { announce: true, startAudio: true });
  };

  const handlePointerMove = (event: PointerEvent) => {
    const isHovering = event.pointerType === 'mouse';
    if (isMediaMissing || (!isDragging.current && !isHovering)) return;

    const cell = cellUnderPointer(event);
    const current = jukebox.currentCell;
    const isSameCell = current?.col === cell.col && current?.row === cell.row;
    if (!isSameCell) jukebox.exploreCell(cell.col, cell.row, { announce: isDragging.current });
  };

  const handlePointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && !isDragging.current) jukebox.clearCursor();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const move = ARROW_MOVES[event.key];
    if (!move) return;

    event.preventDefault();
    const from = jukebox.currentCell ?? CENTRE_CELL;
    jukebox.exploreCell(from.col + move.col, from.row + move.row, {
      announce: true,
      startAudio: true,
    });
  };

  return (
    <div
      ref={stage}
      id="stage"
      tabIndex={0}
      role="application"
      aria-label="Frame explorer. Use the arrow keys to move across the picture and hear each area. Press D for a description."
      className="relative aspect-video w-full cursor-crosshair touch-none overflow-hidden rounded-2xl bg-stage"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        jukebox.useFile(event.dataTransfer.files[0]);
      }}
    >
      <div ref={mediaHost} className="absolute inset-0" />
      <canvas
        ref={overlay}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {isMediaMissing && <MissingMedia onPickFile={onPickFile} />}
    </div>
  );
}
