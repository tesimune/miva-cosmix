import {
  Analyzer,
  COLOUR_FAMILIES,
  COLS,
  NO_DOMINANT_FAMILY,
  ROWS,
  cellIndex,
  type Features,
  type FrameSource,
} from './analyzer';
import { describeCell, describeFrame, formatTime, isSeekableVideo } from './describe';
import { chordFor, drumHits, exploreNote, melodyNotes } from './mapping';
import { drawOverlay, fadeOldSparks, resizeOverlay, type Cell, type Spark } from './overlay';
import { Synth, type Layer } from './synth';
import { startTestPattern } from './testPattern';
import {
  TRACKS,
  UPLOAD_PRESET,
  findTrack,
  noteName,
  posterUrl,
  sourcePageUrl,
  videoUrl,
  type Preset,
  type Track,
} from './tracks';

export type Badge = 'Ready' | 'Playing' | 'Paused' | 'No media' | 'Error';

export interface Stats {
  position: string;
  brightness: string;
  colour: string;
  notes: string;
}

export interface Snapshot {
  trackId: string | null;
  title: string;
  svsId: number | null;
  sourcePage: string | null;
  whatYouHear: string;
  isPlaying: boolean;
  badge: Badge;
  status: string;
  isMediaMissing: boolean;
  tempo: number;
  volume: number;
  layers: Record<Layer, boolean>;
  stats: Stats;
  description: string;
  cellDescription: string;
}

const EMPTY_STATS: Stats = { position: '–', brightness: '–', colour: '–', notes: '–' };
const UPLOAD_HINT =
  'Plucked notes follow the brightest parts of your picture. The chord follows its main colour.';

const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const STATS_INTERVAL_MS = 150;
const STEPS_PER_BEAT = 4;
const STEPS_PER_CHORD = 8;
const STEPS_PER_BASS_NOTE = 16;
const MIN_ASPECT_RATIO = 1;
const MAX_ASPECT_RATIO = 3.6;

const clampTo = (value: number, max: number) => Math.max(0, Math.min(max, value));
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

class Jukebox {
  private analyzer = new Analyzer();
  private synth: Synth | null = null;

  private mediaHost: HTMLElement | null = null;
  private stage: HTMLElement | null = null;
  private overlay: HTMLCanvasElement | null = null;

  private track: Track | null = null;
  private preset: Preset = UPLOAD_PRESET;
  private source: FrameSource | null = null;
  private features: Features | null = null;
  private lastNotes: number[] = [];
  private sparks: Spark[] = [];
  private cursor: Cell | null = null;

  private step = 0;
  private nextStepTime = 0;
  private schedulerTimer = 0;
  private animationFrame = 0;
  private statsUpdatedAt = 0;
  private loadToken = 0;
  private uploadUrl: string | null = null;
  private stopTestPattern: (() => void) | null = null;

  private listeners = new Set<() => void>();
  private snapshot: Snapshot = {
    trackId: null,
    title: 'Loading',
    svsId: null,
    sourcePage: null,
    whatYouHear: '',
    isPlaying: false,
    badge: 'Ready',
    status: 'Press Play to hear this visualization.',
    isMediaMissing: false,
    tempo: 1,
    volume: 0.7,
    layers: { melody: true, harmony: true, pulse: true },
    stats: EMPTY_STATS,
    description: '',
    cellDescription: '',
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  get currentCell() {
    return this.cursor;
  }

  mount(mediaHost: HTMLElement, stage: HTMLElement, overlay: HTMLCanvasElement) {
    this.mediaHost = mediaHost;
    this.stage = stage;
    this.overlay = overlay;
    if (this.source) mediaHost.replaceChildren(this.source);

    this.fitOverlay();
    window.addEventListener('resize', this.fitOverlay);
    this.animationFrame = requestAnimationFrame(this.render);

    return () => {
      window.removeEventListener('resize', this.fitOverlay);
      cancelAnimationFrame(this.animationFrame);
    };
  }

  selectTrack(id: string) {
    const track = findTrack(id) ?? TRACKS[0];
    this.unloadMedia();
    this.track = track;
    this.preset = track.preset;
    this.update({
      trackId: track.id,
      title: track.title,
      svsId: track.svs,
      sourcePage: sourcePageUrl(track),
      whatYouHear: track.hear,
      status: track.blurb,
      badge: this.idleBadge(),
    });

    const showMissing = () => {
      this.update({
        isMediaMissing: true,
        status: 'This track has no media on this site yet.',
        badge: 'No media',
      });
    };
    const loadPoster = () => this.loadImage(posterUrl(track), showMissing);
    const video = videoUrl(track);

    if (video) this.loadVideo(video, loadPoster);
    else loadPoster();
  }

  useFile(file: File | undefined) {
    if (!file) return;

    this.unloadMedia();
    this.track = null;
    this.preset = UPLOAD_PRESET;
    this.update({
      trackId: null,
      title: `Your file: ${file.name}`,
      svsId: null,
      sourcePage: null,
      whatYouHear: UPLOAD_HINT,
      status: `Loaded ${file.name}. Press Play to hear it.`,
      badge: this.idleBadge(),
    });

    const url = URL.createObjectURL(file);
    this.uploadUrl = url;
    const showError = () => {
      this.update({
        status: 'That file could not be read. Try a JPG, PNG or MP4.',
        badge: 'Error',
      });
    };

    if (file.type.startsWith('video/')) this.loadVideo(url, showError);
    else this.loadImage(url, showError);
  }

  useTestPattern() {
    this.unloadMedia();
    const pattern = startTestPattern();
    this.stopTestPattern = pattern.stop;
    this.showSource(pattern.canvas, pattern.canvas.width, pattern.canvas.height);
    this.update({
      status: 'Test pattern loaded. This is a generated picture, not NASA data.',
      badge: this.idleBadge(),
    });
  }

  play() {
    if (!this.source) {
      this.update({
        status: 'Choose a visualization that has media first, or use the test pattern.',
        badge: 'No media',
      });
      return;
    }

    const synth = this.startAudio();
    if (!synth) {
      this.update({ status: 'This browser could not start audio.', badge: 'Error' });
      return;
    }

    this.nextStepTime = synth.ctx.currentTime + 0.08;
    clearInterval(this.schedulerTimer);
    this.schedulerTimer = window.setInterval(this.scheduleSteps, SCHEDULER_INTERVAL_MS);
    this.playVideo();
    this.update({
      isPlaying: true,
      badge: 'Playing',
      status: 'Playing. The music is being generated from the picture as it moves.',
    });
  }

  pause() {
    clearInterval(this.schedulerTimer);
    this.synth?.silenceChord();
    if (this.source instanceof HTMLVideoElement) this.source.pause();
    this.update({ isPlaying: false, badge: 'Paused', status: 'Paused.' });
  }

  toggle() {
    if (this.snapshot.isPlaying) this.pause();
    else this.play();
  }

  restart() {
    this.step = 0;
    this.analyzer.reset();
    if (this.source instanceof HTMLVideoElement) this.source.currentTime = 0;
    this.update({ status: 'Back to the start.', badge: this.idleBadge() });
  }

  setTempo(tempo: number) {
    this.update({ tempo });
  }

  setVolume(volume: number) {
    this.synth?.setVolume(volume);
    this.update({ volume });
  }

  toggleLayer(layer: Layer) {
    const enabled = !this.snapshot.layers[layer];
    this.synth?.setLayer(layer, enabled);
    this.update({ layers: { ...this.snapshot.layers, [layer]: enabled } });
  }

  exploreCell(col: number, row: number, options: { announce: boolean; startAudio?: boolean }) {
    if (!this.source) return;
    if (options.startAudio) this.startAudio();

    const features = this.currentFeatures();
    if (!features) return;

    const cell = { col: clampTo(col, COLS - 1), row: clampTo(row, ROWS - 1) };
    const note = exploreNote(features, this.preset, cell.col, cell.row);
    this.cursor = cell;
    this.synth?.playNote('glass', note.midi, note.velocity, note.pan, 0, 'explore');
    this.vibrate(features.brightness[cellIndex(cell.col, cell.row)]);

    if (options.announce) {
      this.update({
        cellDescription: describeCell(features, cell.col, cell.row, noteName(note.midi)),
      });
    }
  }

  clearCursor() {
    this.cursor = null;
  }

  describe(readAloud: boolean) {
    if (!this.source) {
      this.update({ description: 'There is no picture loaded to describe yet.' });
      return;
    }

    const features = this.analyzer.analyze(this.source);
    if (!features) {
      this.update({ description: 'The picture is still loading.' });
      return;
    }

    this.features = features;
    const description = describeFrame(features, this.track, this.source);
    this.update({ description, stats: this.readStats() });
    if (readAloud) this.speak(description);
  }

  private update(changes: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...changes };
    this.listeners.forEach((listener) => listener());
  }

  private idleBadge(): Badge {
    return this.snapshot.isPlaying ? 'Playing' : 'Ready';
  }

  private fitOverlay = () => {
    if (this.overlay && this.stage) resizeOverlay(this.overlay, this.stage);
  };

  private unloadMedia() {
    this.loadToken++;
    this.stopTestPattern?.();
    this.stopTestPattern = null;

    if (this.source instanceof HTMLVideoElement) {
      this.source.pause();
      this.source.removeAttribute('src');
      this.source.load();
    }
    this.mediaHost?.replaceChildren();

    if (this.uploadUrl) {
      URL.revokeObjectURL(this.uploadUrl);
      this.uploadUrl = null;
    }

    this.source = null;
    this.features = null;
    this.lastNotes = [];
    this.sparks = [];
    this.cursor = null;
    this.step = 0;
    this.analyzer.reset();
    this.update({
      isMediaMissing: false,
      stats: EMPTY_STATS,
      description: '',
      cellDescription: '',
    });
  }

  private loadVideo(url: string, onError: () => void) {
    const token = this.loadToken;
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');

    video.addEventListener(
      'loadeddata',
      () => {
        if (token === this.loadToken) this.showSource(video, video.videoWidth, video.videoHeight);
      },
      { once: true },
    );
    video.addEventListener(
      'error',
      () => {
        if (token === this.loadToken) onError();
      },
      { once: true },
    );
    video.src = url;
  }

  private loadImage(url: string, onError: () => void) {
    const token = this.loadToken;
    const image = new Image();
    image.alt = '';
    image.onload = () => {
      if (token === this.loadToken) this.showSource(image, image.naturalWidth, image.naturalHeight);
    };
    image.onerror = () => {
      if (token === this.loadToken) onError();
    };
    image.src = url;
  }

  private showSource(source: FrameSource, width: number, height: number) {
    source.className = 'absolute inset-0 block h-full w-full';
    this.mediaHost?.replaceChildren(source);
    this.source = source;

    if (this.stage) {
      const aspectRatio = Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, width / height));
      this.stage.style.aspectRatio = String(aspectRatio);
    }
    this.fitOverlay();

    if (this.snapshot.isPlaying) this.playVideo();
    else this.features = this.analyzer.analyze(source);

    this.update({ isMediaMissing: false, stats: this.readStats() });
  }

  private playVideo() {
    if (this.source instanceof HTMLVideoElement) {
      this.source.play().catch(() => {});
    }
  }

  private startAudio() {
    try {
      if (!this.synth) {
        this.synth = new Synth();
        this.synth.setVolume(this.snapshot.volume);
        for (const [layer, enabled] of Object.entries(this.snapshot.layers)) {
          this.synth.setLayer(layer as Layer, enabled);
        }
      }
      if (this.synth.ctx.state === 'suspended') void this.synth.ctx.resume();
      return this.synth;
    } catch {
      return null;
    }
  }

  private stepDuration() {
    const beatsPerSecond = (this.preset.bpm * this.snapshot.tempo) / 60;
    return 1 / beatsPerSecond / STEPS_PER_BEAT;
  }

  private scheduleSteps = () => {
    if (!this.source || !this.synth) return;

    const now = this.synth.ctx.currentTime;
    const fellBehind = this.nextStepTime < now - 0.5;
    if (fellBehind) this.nextStepTime = now + 0.05;

    while (this.nextStepTime < now + SCHEDULE_AHEAD_SECONDS) {
      this.playStep(this.source, this.synth, this.nextStepTime);
      this.nextStepTime += this.stepDuration();
      this.step++;
    }
  };

  private playStep(source: FrameSource, synth: Synth, time: number) {
    const features = this.analyzer.analyze(source);
    if (!features) return;
    this.features = features;

    const preset = this.preset;
    const step = this.step;

    const notes = melodyNotes(features, preset, step);
    for (const note of notes) {
      synth.playNote(preset.lead, note.midi, note.velocity, note.pan, time + note.delay);
      this.sparks.push({
        col: step % COLS,
        row: note.row,
        bornAt: performance.now(),
        strength: note.velocity,
      });
    }
    if (notes.length > 0) this.lastNotes = notes.map((note) => note.midi);

    if (step % STEPS_PER_CHORD === 0) {
      const chord = chordFor(features, preset);
      synth.playChord(chord.midis, chord.cutoffHz, chord.level, time);
      if (step % STEPS_PER_BASS_NOTE === 0) {
        synth.playNote('pluck', chord.midis[0] - 12, 0.75, 0, time, 'harmony');
      }
    }

    for (const hit of drumHits(features, preset, step)) {
      synth.playDrum(hit.drum, hit.velocity, time);
    }
  }

  private currentFeatures() {
    if (this.snapshot.isPlaying && this.features) return this.features;
    if (!this.source) return null;
    this.features = this.analyzer.analyze(this.source);
    return this.features;
  }

  private readStats(): Stats {
    const features = this.features;
    const source = this.source;
    if (!features || !source) return EMPTY_STATS;

    const position = isSeekableVideo(source)
      ? `${formatTime(source.currentTime)} / ${formatTime(source.duration)}`
      : `Column ${(this.step % COLS) + 1} of ${COLS}`;
    const colour =
      features.dominantFamily === NO_DOMINANT_FAMILY
        ? 'Little colour'
        : capitalise(COLOUR_FAMILIES[features.dominantFamily]);

    return {
      position,
      brightness: `${Math.round(features.meanBrightness * 100)}%`,
      colour,
      notes: this.lastNotes.length > 0 ? this.lastNotes.map(noteName).join(' ') : '–',
    };
  }

  private render = (now: number) => {
    this.sparks = fadeOldSparks(this.sparks, now);

    if (this.overlay && this.stage) {
      const hasStarted = this.snapshot.isPlaying || this.step > 0;
      const playheadCol = this.source && hasStarted ? (this.step + COLS - 1) % COLS : null;
      drawOverlay(this.overlay, this.stage, playheadCol, this.sparks, this.cursor, now);
    }

    if (this.snapshot.isPlaying && now - this.statsUpdatedAt > STATS_INTERVAL_MS) {
      this.statsUpdatedAt = now;
      this.update({ stats: this.readStats() });
    }

    this.animationFrame = requestAnimationFrame(this.render);
  };

  private vibrate(brightness: number) {
    if ('vibrate' in navigator) navigator.vibrate(Math.round(8 + brightness * 30));
  }

  private speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
}

export const jukebox = new Jukebox();
