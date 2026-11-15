import { COLS, ROWS } from './analyzer';

export interface Spark {
  col: number;
  row: number;
  bornAt: number;
  strength: number;
}

export interface Cell {
  col: number;
  row: number;
}

const SPARK_LIFETIME = 700;
const CURSOR_COLOUR = '#ffb347';

export function fadeOldSparks(sparks: Spark[], now: number) {
  return sparks.filter((spark) => now - spark.bornAt < SPARK_LIFETIME);
}

export function resizeOverlay(canvas: HTMLCanvasElement, stage: HTMLElement) {
  const scale = window.devicePixelRatio || 1;
  canvas.width = stage.clientWidth * scale;
  canvas.height = stage.clientHeight * scale;
  canvas.getContext('2d')?.setTransform(scale, 0, 0, scale, 0, 0);
}

export function drawOverlay(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  playheadCol: number | null,
  sparks: Spark[],
  cursor: Cell | null,
  now: number,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const cellWidth = width / COLS;
  const cellHeight = height / ROWS;
  context.clearRect(0, 0, width, height);

  if (playheadCol !== null) {
    const left = playheadCol * cellWidth;
    context.fillStyle = 'rgba(255, 255, 255, 0.16)';
    context.fillRect(left, 0, cellWidth, height);
    context.fillStyle = 'rgba(255, 255, 255, 0.85)';
    context.fillRect(left + cellWidth - 1.5, 0, 1.5, height);
  }

  for (const spark of sparks) {
    const life = 1 - (now - spark.bornAt) / SPARK_LIFETIME;
    const radius = 4 + 14 * (1 - life) + 6 * spark.strength;
    context.beginPath();
    context.arc(
      (spark.col + 0.5) * cellWidth,
      (spark.row + 0.5) * cellHeight,
      radius,
      0,
      Math.PI * 2,
    );
    context.strokeStyle = `rgba(255, 255, 255, ${life})`;
    context.lineWidth = 2;
    context.stroke();
  }

  if (cursor) {
    context.strokeStyle = CURSOR_COLOUR;
    context.lineWidth = 3;
    context.strokeRect(
      cursor.col * cellWidth + 1.5,
      cursor.row * cellHeight + 1.5,
      cellWidth - 3,
      cellHeight - 3,
    );
  }
}
