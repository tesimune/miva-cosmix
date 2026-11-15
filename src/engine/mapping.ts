import { COLS, NO_DOMINANT_FAMILY, ROWS, cellEnergy, cellIndex, type Features } from './analyzer';
import type { Drum } from './synth';
import { SCALES, scaleNote, type Preset } from './tracks';

export interface MelodyNote {
  midi: number;
  velocity: number;
  pan: number;
  row: number;
  delay: number;
}

export interface Chord {
  midis: number[];
  cutoffHz: number;
  level: number;
}

export interface DrumHit {
  drum: Drum;
  velocity: number;
}

const CHORD_DEGREE_BY_FAMILY = [3, 4, 2, 5, 0, 1];
const MELODY_OCTAVES = 2.4;
const EXPLORE_OCTAVES = 2.6;
const OFF_BEAT_MIN_ENERGY = 0.7;
const STRUM_DELAY = 0.012;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const panForColumn = (col: number) => (col / (COLS - 1)) * 1.6 - 0.8;

function standoutRows(features: Features, preset: Preset, col: number) {
  const energy = cellEnergy(features, preset.energy);
  const candidates = [];
  for (let row = 0; row < ROWS; row++) {
    const value = energy[cellIndex(col, row)];
    if (value >= preset.threshold) candidates.push({ row, energy: value });
  }
  candidates.sort((a, b) => b.energy - a.energy);

  const chosen: typeof candidates = [];
  for (const candidate of candidates) {
    const tooClose = chosen.some((other) => Math.abs(other.row - candidate.row) <= 1);
    if (!tooClose && chosen.length < preset.voices) chosen.push(candidate);
  }
  return chosen;
}

function pitchForRow(preset: Preset, row: number) {
  const height = (ROWS - 1 - row) / (ROWS - 1);
  const degree = Math.round(height * SCALES[preset.scale].length * MELODY_OCTAVES);
  return scaleNote(preset, degree) + 12;
}

export function melodyNotes(features: Features, preset: Preset, step: number): MelodyNote[] {
  const col = step % COLS;
  const isOffBeat = step % 2 === 1;

  return standoutRows(features, preset, col)
    .filter((cell) => !isOffBeat || cell.energy >= OFF_BEAT_MIN_ENERGY)
    .map((cell, index) => ({
      midi: pitchForRow(preset, cell.row),
      velocity: index === 0 ? cell.energy : cell.energy * 0.7,
      pan: panForColumn(col),
      row: cell.row,
      delay: index * STRUM_DELAY,
    }));
}

export function chordFor(features: Features, preset: Preset): Chord {
  const hasColour = features.dominantFamily !== NO_DOMINANT_FAMILY;
  const degree = hasColour ? CHORD_DEGREE_BY_FAMILY[features.dominantFamily] : 0;
  const openness = clamp(features.meanBrightness * 1.6 + features.warmShare * 0.25);
  const fullness = clamp(features.colourAmount * 3 + features.meanBrightness);

  return {
    midis: [
      scaleNote(preset, degree),
      scaleNote(preset, degree + 2),
      scaleNote(preset, degree + 4),
    ],
    cutoffHz: 260 + 4200 * openness,
    level: 0.35 + 0.65 * fullness,
  };
}

export function drumHits(features: Features, preset: Preset, step: number): DrumHit[] {
  const hits: DrumHit[] = [];

  if (preset.pulse === 'motion') {
    const motion = clamp(features.motion * 40);
    const sparkle = clamp(features.brightShare * 6);
    if (step % 4 === 0 && motion > 0.08) hits.push({ drum: 'kick', velocity: motion });
    if (step % 4 === 2 && sparkle > 0.05) hits.push({ drum: 'tick', velocity: sparkle });
  }

  if (preset.pulse === 'flash') {
    const flash = clamp(features.flash * 25);
    if (flash > 0.12) hits.push({ drum: 'flash', velocity: flash });
    if (step % 8 === 0) hits.push({ drum: 'kick', velocity: 0.3 });
  }

  return hits;
}

export function exploreNote(features: Features, preset: Preset, col: number, row: number) {
  const index = cellIndex(col, row);
  const brightness = clamp(features.brightness[index] * 1.15);
  const degree = Math.round(brightness * SCALES[preset.scale].length * EXPLORE_OCTAVES);

  return {
    midi: scaleNote(preset, degree) + 12,
    velocity: 0.45 + 0.5 * features.saturation[index],
    pan: panForColumn(col),
  };
}
