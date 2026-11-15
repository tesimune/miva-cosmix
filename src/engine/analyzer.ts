import type { EnergyMode } from './tracks';

export const COLS = 32;
export const ROWS = 12;

const PIXELS_PER_CELL_SIDE = 4;
const SAMPLE_WIDTH = COLS * PIXELS_PER_CELL_SIDE;
const SAMPLE_HEIGHT = ROWS * PIXELS_PER_CELL_SIDE;
const CELL_COUNT = COLS * ROWS;

const BRIGHT_CELL_THRESHOLD = 0.6;
const MIN_COLOUR_WEIGHT = 0.08;
const MIN_COLOUR_AMOUNT = 0.02;

export const COLOUR_FAMILIES = [
  'red and orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple and pink',
];
const WARM_FAMILIES = [0, 1];
export const NO_DOMINANT_FAMILY = -1;

export type FrameSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

export interface Features {
  brightness: Float32Array;
  peak: Float32Array;
  saturation: Float32Array;
  hue: Float32Array;
  meanBrightness: number;
  brightShare: number;
  motion: number;
  flash: number;
  warmShare: number;
  colourAmount: number;
  familyWeights: number[];
  dominantFamily: number;
}

export const cellIndex = (col: number, row: number) => row * COLS + col;

function luminance(red: number, green: number, blue: number) {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function toHueAndSaturation(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const range = max - min;

  if (range < 0.0001) {
    return { hue: 0, saturation: 0 };
  }

  let hue: number;
  if (max === r) hue = ((g - b) / range) % 6;
  else if (max === g) hue = (b - r) / range + 2;
  else hue = (r - g) / range + 4;
  hue *= 60;
  if (hue < 0) hue += 360;

  const saturation = Math.min(1, range / (1 - Math.abs(2 * lightness - 1) + 1e-6));
  return { hue, saturation };
}

function colourFamily(hue: number) {
  if (hue < 45 || hue >= 330) return 0;
  if (hue < 70) return 1;
  if (hue < 165) return 2;
  if (hue < 200) return 3;
  if (hue < 260) return 4;
  return 5;
}

function hueName(hue: number) {
  if (hue < 20 || hue >= 340) return 'red';
  if (hue < 45) return 'orange';
  if (hue < 70) return 'yellow';
  if (hue < 165) return 'green';
  if (hue < 200) return 'cyan';
  if (hue < 260) return 'blue';
  if (hue < 300) return 'purple';
  return 'pink';
}

export function colourName(hue: number, saturation: number, brightness: number) {
  if (brightness < 0.1) return 'black';
  if (saturation < 0.16) {
    if (brightness > 0.75) return 'white';
    return brightness > 0.35 ? 'grey' : 'dark grey';
  }
  const name = hueName(hue);
  if (brightness < 0.3) return `dark ${name}`;
  if (brightness > 0.7) return `pale ${name}`;
  return name;
}

function sourceWidth(source: FrameSource) {
  if (source instanceof HTMLVideoElement) return source.videoWidth;
  if (source instanceof HTMLImageElement) return source.naturalWidth;
  return source.width;
}

export class Analyzer {
  private context: CanvasRenderingContext2D;
  private previousBrightness: Float32Array | null = null;
  private smoothedBrightShare = 0;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    this.context = canvas.getContext('2d', { willReadFrequently: true })!;
  }

  reset() {
    this.previousBrightness = null;
    this.smoothedBrightShare = 0;
  }

  analyze(source: FrameSource): Features | null {
    const pixels = this.readPixels(source);
    if (!pixels) return null;

    const brightness = new Float32Array(CELL_COUNT);
    const peak = new Float32Array(CELL_COUNT);
    const saturation = new Float32Array(CELL_COUNT);
    const hue = new Float32Array(CELL_COUNT);
    const familyWeights = COLOUR_FAMILIES.map(() => 0);

    let brightnessTotal = 0;
    let brightCells = 0;
    let colourTotal = 0;
    let warmTotal = 0;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = this.measureCell(pixels, col, row);
        const index = cellIndex(col, row);
        brightness[index] = cell.brightness;
        peak[index] = cell.peak;
        saturation[index] = cell.saturation;
        hue[index] = cell.hue;

        brightnessTotal += cell.brightness;
        if (cell.peak > BRIGHT_CELL_THRESHOLD) brightCells++;

        const colourWeight = cell.saturation * Math.min(1, cell.brightness * 2.5);
        if (colourWeight > MIN_COLOUR_WEIGHT) {
          const family = colourFamily(cell.hue);
          familyWeights[family] += colourWeight;
          colourTotal += colourWeight;
          if (WARM_FAMILIES.includes(family)) warmTotal += colourWeight;
        }
      }
    }

    const brightShare = brightCells / CELL_COUNT;
    const colourAmount = colourTotal / CELL_COUNT;
    const strongestFamily = familyWeights.indexOf(Math.max(...familyWeights));

    return {
      brightness,
      peak,
      saturation,
      hue,
      meanBrightness: brightnessTotal / CELL_COUNT,
      brightShare,
      motion: this.measureMotion(brightness),
      flash: this.measureFlash(brightShare),
      warmShare: colourTotal > 0 ? warmTotal / colourTotal : 0.5,
      colourAmount,
      familyWeights,
      dominantFamily: colourAmount > MIN_COLOUR_AMOUNT ? strongestFamily : NO_DOMINANT_FAMILY,
    };
  }

  private readPixels(source: FrameSource) {
    if (!sourceWidth(source)) return null;
    try {
      this.context.drawImage(source, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      return this.context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
    } catch {
      return null;
    }
  }

  private measureCell(pixels: Uint8ClampedArray, col: number, row: number) {
    let red = 0;
    let green = 0;
    let blue = 0;
    let peak = 0;

    for (let y = 0; y < PIXELS_PER_CELL_SIDE; y++) {
      for (let x = 0; x < PIXELS_PER_CELL_SIDE; x++) {
        const pixelX = col * PIXELS_PER_CELL_SIDE + x;
        const pixelY = row * PIXELS_PER_CELL_SIDE + y;
        const offset = (pixelY * SAMPLE_WIDTH + pixelX) * 4;
        red += pixels[offset];
        green += pixels[offset + 1];
        blue += pixels[offset + 2];
        peak = Math.max(peak, luminance(pixels[offset], pixels[offset + 1], pixels[offset + 2]));
      }
    }

    const pixelCount = PIXELS_PER_CELL_SIDE * PIXELS_PER_CELL_SIDE;
    red /= pixelCount;
    green /= pixelCount;
    blue /= pixelCount;

    return {
      brightness: luminance(red, green, blue),
      peak,
      ...toHueAndSaturation(red, green, blue),
    };
  }

  private measureMotion(brightness: Float32Array) {
    const previous = this.previousBrightness;
    this.previousBrightness = brightness;
    if (!previous) return 0;

    let change = 0;
    for (let i = 0; i < CELL_COUNT; i++) {
      change += Math.abs(brightness[i] - previous[i]);
    }
    return change / CELL_COUNT;
  }

  private measureFlash(brightShare: number) {
    const flash = Math.max(0, brightShare - this.smoothedBrightShare);
    this.smoothedBrightShare = this.smoothedBrightShare * 0.6 + brightShare * 0.4;
    return flash;
  }
}

function rawEnergy(features: Features, mode: EnergyMode, index: number) {
  const brightness = features.brightness[index];
  if (mode === 'peak') return features.peak[index] * 0.7 + brightness * 0.3;
  if (mode === 'sat') return features.saturation[index] * Math.min(1, brightness * 2.2);
  return brightness;
}

export function cellEnergy(features: Features, mode: EnergyMode) {
  const energy = new Float32Array(CELL_COUNT);
  let highest = 0;
  let total = 0;

  for (let i = 0; i < CELL_COUNT; i++) {
    energy[i] = rawEnergy(features, mode, i);
    total += energy[i];
    highest = Math.max(highest, energy[i]);
  }

  const noiseFloor = (total / CELL_COUNT) * 0.85;
  const range = Math.max(0.08, highest - noiseFloor);
  for (let i = 0; i < CELL_COUNT; i++) {
    energy[i] = Math.max(0, Math.min(1, (energy[i] - noiseFloor) / range));
  }
  return energy;
}
