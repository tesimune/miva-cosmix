import data from './tracks.json';

export type ScaleName = 'majPent' | 'minPent' | 'dorian' | 'lydian';
export type EnergyMode = 'peak' | 'sat' | 'luma';
export type Lead = 'bell' | 'pluck' | 'marimba' | 'glass';
export type PulseMode = 'motion' | 'flash' | 'none';

export interface Preset {
  root: number;
  scale: ScaleName;
  energy: EnergyMode;
  lead: Lead;
  threshold: number;
  bpm: number;
  voices: number;
  pulse: PulseMode;
}

export interface Track {
  id: string;
  svs: number;
  title: string;
  short: string;
  kind: 'video' | 'still';
  source: string;
  ss?: number;
  t?: number;
  blurb: string;
  hear: string;
  preset: Preset;
}

export const TRACKS = data as Track[];

export const UPLOAD_PRESET: Preset = {
  root: 48,
  scale: 'majPent',
  energy: 'luma',
  lead: 'pluck',
  threshold: 0.3,
  bpm: 96,
  voices: 3,
  pulse: 'motion',
};

export const SCALES: Record<ScaleName, number[]> = {
  majPent: [0, 2, 4, 7, 9],
  minPent: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const mediaFolder = `${import.meta.env.BASE_URL}media/`;

export function findTrack(id: string) {
  return TRACKS.find((track) => track.id === id);
}

export function videoUrl(track: Track) {
  return track.kind === 'video' ? `${mediaFolder}${track.id}.mp4` : null;
}

export function posterUrl(track: Track) {
  return `${mediaFolder}${track.id}.jpg`;
}

export function sourcePageUrl(track: Track) {
  return `https://svs.gsfc.nasa.gov/${track.svs}/`;
}

export function noteName(midi: number) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

export function scaleNote(preset: Preset, degree: number) {
  const scale = SCALES[preset.scale];
  const octave = Math.floor(degree / scale.length);
  return preset.root + 12 * octave + scale[degree % scale.length];
}
