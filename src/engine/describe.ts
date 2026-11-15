import {
  COLOUR_FAMILIES,
  COLS,
  NO_DOMINANT_FAMILY,
  ROWS,
  cellIndex,
  colourName,
  type Features,
  type FrameSource,
} from './analyzer';
import type { Track } from './tracks';

const VERTICAL = ['upper', 'middle', 'lower'];
const HORIZONTAL = ['left', 'centre', 'right'];

export function formatTime(seconds: number) {
  const whole = Math.floor(seconds || 0);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

export function isSeekableVideo(source: FrameSource | null): source is HTMLVideoElement {
  return source instanceof HTMLVideoElement && isFinite(source.duration);
}

function indexOfLargest(values: number[]) {
  return values.indexOf(Math.max(...values));
}

function brightestRegion(features: Features) {
  const lightByColumnThird = [0, 0, 0];
  const lightByRowThird = [0, 0, 0];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const light = features.peak[cellIndex(col, row)];
      lightByColumnThird[Math.floor((col / COLS) * 3)] += light;
      lightByRowThird[Math.floor((row / ROWS) * 3)] += light;
    }
  }

  const vertical = VERTICAL[indexOfLargest(lightByRowThird)];
  const horizontal = HORIZONTAL[indexOfLargest(lightByColumnThird)];
  if (vertical === 'middle' && horizontal === 'centre') return 'centre';
  return `${vertical} ${horizontal}`;
}

function brightnessWord(meanBrightness: number) {
  if (meanBrightness < 0.12) return 'very dark';
  if (meanBrightness < 0.3) return 'dark';
  if (meanBrightness < 0.55) return 'medium bright';
  return 'bright';
}

function colourSummary(features: Features) {
  const total = features.familyWeights.reduce((sum, weight) => sum + weight, 0);
  if (features.dominantFamily === NO_DOMINANT_FAMILY || total === 0) {
    return 'There is little strong colour.';
  }

  const shares = features.familyWeights
    .map((weight, family) => ({ family, share: weight / total }))
    .filter((entry) => entry.share > 0.08)
    .sort((a, b) => b.share - a.share)
    .slice(0, 3)
    .map((entry) => `${Math.round(entry.share * 100)}% is ${COLOUR_FAMILIES[entry.family]}`);

  return `Of the coloured areas, ${shares.join(', ')}.`;
}

export function describeFrame(features: Features, track: Track | null, source: FrameSource) {
  const intro = track ? `${track.title}. ${track.blurb} ` : '';
  const moment = isSeekableVideo(source)
    ? `At ${formatTime(source.currentTime)} of ${formatTime(source.duration)}, the`
    : 'The';
  const percent = Math.round(features.meanBrightness * 100);

  return (
    `${intro}${moment} frame is ${brightnessWord(features.meanBrightness)} overall, ` +
    `${percent}% brightness. The most light is in the ${brightestRegion(features)}. ` +
    colourSummary(features)
  );
}

export function describeCell(features: Features, col: number, row: number, note: string) {
  const index = cellIndex(col, row);
  const brightness = features.brightness[index];
  const colour = colourName(features.hue[index], features.saturation[index], brightness);
  const percent = Math.round(brightness * 100);

  return `Column ${col + 1} of ${COLS}, row ${row + 1} of ${ROWS}: ${colour}, ${percent}% bright. Note ${note}.`;
}
