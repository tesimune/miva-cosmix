import type { Lead } from './tracks';

export type Layer = 'melody' | 'harmony' | 'pulse';
export type Drum = 'kick' | 'tick' | 'flash';
type Bus = Layer | 'explore';

interface Instrument {
  wave: OscillatorType;
  overtoneRatio: number;
  overtoneLevel: number;
  attack: number;
  decay: number;
  echo: number;
}

const INSTRUMENTS: Record<Lead, Instrument> = {
  bell: {
    wave: 'sine',
    overtoneRatio: 2.76,
    overtoneLevel: 0.35,
    attack: 0.004,
    decay: 1.3,
    echo: 0.5,
  },
  pluck: {
    wave: 'triangle',
    overtoneRatio: 2,
    overtoneLevel: 0.2,
    attack: 0.003,
    decay: 0.38,
    echo: 0.3,
  },
  marimba: {
    wave: 'sine',
    overtoneRatio: 4,
    overtoneLevel: 0.3,
    attack: 0.002,
    decay: 0.42,
    echo: 0.25,
  },
  glass: {
    wave: 'sine',
    overtoneRatio: 2,
    overtoneLevel: 0.25,
    attack: 0.03,
    decay: 1.0,
    echo: 0.55,
  },
};

const BUSES: Bus[] = ['melody', 'harmony', 'pulse', 'explore'];
const PAD_VOICES = 3;
const SILENT = 0.0001;

const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const clampPan = (pan: number) => Math.max(-1, Math.min(1, pan));

function createAudioContext() {
  const legacy = window as unknown as { webkitAudioContext?: typeof AudioContext };
  const Context = window.AudioContext ?? legacy.webkitAudioContext;
  return new Context!();
}

export class Synth {
  readonly ctx = createAudioContext();
  private master: GainNode;
  private buses = {} as Record<Bus, GainNode>;
  private echoSend: GainNode;
  private padFilter: BiquadFilterNode;
  private padLevel: GainNode;
  private padOscillators: OscillatorNode[][] = [];
  private noise: AudioBuffer;

  constructor() {
    this.master = this.createMaster();
    for (const name of BUSES) {
      this.buses[name] = this.ctx.createGain();
      this.buses[name].connect(this.master);
    }
    this.echoSend = this.createEcho();
    this.padFilter = this.ctx.createBiquadFilter();
    this.padLevel = this.ctx.createGain();
    this.createPad();
    this.noise = this.createNoise();
  }

  setVolume(volume: number) {
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.03);
  }

  setLayer(layer: Layer, enabled: boolean) {
    this.buses[layer].gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.04);
  }

  playNote(lead: Lead, midi: number, velocity: number, pan: number, time = 0, bus: Bus = 'melody') {
    const ctx = this.ctx;
    const instrument = INSTRUMENTS[lead];
    const frequency = midiToHz(midi);
    const start = Math.max(time, ctx.currentTime);
    const peakTime = start + instrument.attack;
    const end = peakTime + instrument.decay;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(SILENT, start);
    envelope.gain.exponentialRampToValueAtTime(0.05 + 0.3 * velocity, peakTime);
    envelope.gain.exponentialRampToValueAtTime(SILENT, end);

    const tone = ctx.createOscillator();
    tone.type = instrument.wave;
    tone.frequency.value = frequency;
    tone.connect(envelope);

    const overtone = ctx.createOscillator();
    const overtoneEnvelope = ctx.createGain();
    overtone.frequency.value = frequency * instrument.overtoneRatio;
    overtoneEnvelope.gain.setValueAtTime(instrument.overtoneLevel, start);
    overtoneEnvelope.gain.exponentialRampToValueAtTime(0.001, start + instrument.decay * 0.5);
    overtone.connect(overtoneEnvelope);
    overtoneEnvelope.connect(envelope);

    const panner = ctx.createStereoPanner();
    panner.pan.value = clampPan(pan);
    envelope.connect(panner);
    panner.connect(this.buses[bus]);

    const echo = ctx.createGain();
    echo.gain.value = instrument.echo;
    panner.connect(echo);
    echo.connect(this.echoSend);

    tone.start(start);
    overtone.start(start);
    tone.stop(end + 0.05);
    overtone.stop(end + 0.05);
  }

  playChord(midis: number[], cutoffHz: number, level: number, time = 0) {
    const start = Math.max(time, this.ctx.currentTime);
    this.padOscillators.forEach((voice, index) => {
      const frequency = midiToHz(midis[index % midis.length]);
      for (const oscillator of voice) {
        oscillator.frequency.setTargetAtTime(frequency, start, 0.12);
      }
    });
    this.padFilter.frequency.setTargetAtTime(cutoffHz, start, 0.3);
    this.padLevel.gain.setTargetAtTime(level * 0.5, start, 0.4);
  }

  silenceChord() {
    this.padLevel.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  playDrum(drum: Drum, velocity: number, time = 0) {
    const start = Math.max(time, this.ctx.currentTime);
    if (drum === 'kick') this.playKick(velocity, start);
    else if (drum === 'tick')
      this.playNoiseHit(velocity * 0.35, start, 0.05, 'highpass', 6500, false);
    else this.playNoiseHit(velocity, start, 0.22, 'bandpass', 1800 + velocity * 2500, true);
  }

  private playKick(velocity: number, start: number) {
    const ctx = this.ctx;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(SILENT, start);
    envelope.gain.exponentialRampToValueAtTime(0.55 * velocity + 0.05, start + 0.005);
    envelope.gain.exponentialRampToValueAtTime(SILENT, start + 0.28);
    envelope.connect(this.buses.pulse);

    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(130, start);
    thump.frequency.exponentialRampToValueAtTime(42, start + 0.14);
    thump.connect(envelope);
    thump.start(start);
    thump.stop(start + 0.3);
  }

  private playNoiseHit(
    velocity: number,
    start: number,
    duration: number,
    filterType: BiquadFilterType,
    filterHz: number,
    withEcho: boolean,
  ) {
    const ctx = this.ctx;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(SILENT, start);
    envelope.gain.exponentialRampToValueAtTime(0.5 * velocity + 0.02, start + 0.003);
    envelope.gain.exponentialRampToValueAtTime(SILENT, start + duration);
    envelope.connect(this.buses.pulse);
    if (withEcho) envelope.connect(this.echoSend);

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterHz;
    filter.Q.value = 0.8;
    filter.connect(envelope);

    const burst = ctx.createBufferSource();
    burst.buffer = this.noise;
    burst.connect(filter);
    burst.start(start);
    burst.stop(start + duration + 0.02);
  }

  private createMaster() {
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0.7;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;

    master.connect(compressor);
    compressor.connect(ctx.destination);
    return master;
  }

  private createEcho() {
    const ctx = this.ctx;
    const send = ctx.createGain();
    send.gain.value = 0.28;

    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;

    const leftDelay = ctx.createDelay(1);
    const rightDelay = ctx.createDelay(1);
    leftDelay.delayTime.value = 0.31;
    rightDelay.delayTime.value = 0.47;

    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;

    const leftPan = ctx.createStereoPanner();
    const rightPan = ctx.createStereoPanner();
    leftPan.pan.value = -0.6;
    rightPan.pan.value = 0.6;

    send.connect(tone);
    tone.connect(leftDelay);
    leftDelay.connect(rightDelay);
    rightDelay.connect(feedback);
    feedback.connect(leftDelay);
    leftDelay.connect(leftPan);
    rightDelay.connect(rightPan);
    leftPan.connect(this.master);
    rightPan.connect(this.master);
    return send;
  }

  private createPad() {
    const ctx = this.ctx;
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 500;
    this.padFilter.Q.value = 0.6;
    this.padLevel.gain.value = 0;
    this.padFilter.connect(this.padLevel);
    this.padLevel.connect(this.buses.harmony);
    this.padLevel.connect(this.echoSend);

    for (let i = 0; i < PAD_VOICES; i++) {
      const saw = ctx.createOscillator();
      const triangle = ctx.createOscillator();
      const mix = ctx.createGain();
      saw.type = 'sawtooth';
      triangle.type = 'triangle';
      saw.detune.value = -6;
      triangle.detune.value = 7;
      mix.gain.value = 0.16;
      saw.connect(mix);
      triangle.connect(mix);
      mix.connect(this.padFilter);
      saw.start();
      triangle.start();
      this.padOscillators.push([saw, triangle]);
    }
  }

  private createNoise() {
    const length = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      samples[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
