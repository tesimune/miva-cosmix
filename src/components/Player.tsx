import { useRef, useState } from 'react';
import { jukebox } from '../engine/jukebox';
import type { Layer } from '../engine/synth';
import { useJukebox } from '../useJukebox';
import PlayButton from './PlayButton';
import Segmented from './Segmented';
import Stage from './Stage';

const TEMPOS = [
  { label: 'Slow', value: 0.7 },
  { label: 'Normal', value: 1 },
  { label: 'Fast', value: 1.4 },
];

const LAYERS: { label: string; value: Layer }[] = [
  { label: 'Melody', value: 'melody' },
  { label: 'Harmony', value: 'harmony' },
  { label: 'Pulse', value: 'pulse' },
];

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div>
      <dt className="text-[13px] text-mute">{label}</dt>
      <dd
        data-testid={testId}
        className="font-display text-[clamp(18px,2.6vw,26px)] leading-tight font-bold tracking-tight tabular-nums"
      >
        {value}
      </dd>
    </div>
  );
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded-[5px] border border-b-2 border-line bg-white px-1.5 py-px font-sans text-xs font-medium text-ink">
      {children}
    </kbd>
  );
}

export default function Player() {
  const state = useJukebox();
  const fileInput = useRef<HTMLInputElement>(null);
  const [readAloud, setReadAloud] = useState(false);

  const openFilePicker = () => fileInput.current?.click();
  const badgeColour = state.badge === 'Playing' ? 'bg-[#d8f0d2]' : 'bg-soft';

  return (
    <div
      id="player"
      className="mx-auto max-w-[980px] rounded-[18px] bg-paper p-3.5 text-left text-ink sm:rounded-[32px] sm:p-6.5"
    >
      <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <h2 data-testid="title" className="font-display text-[17px] leading-tight font-bold">
          {state.title}
        </h2>
        {state.sourcePage && (
          <a
            href={state.sourcePage}
            target="_blank"
            rel="noopener"
            aria-label={`Source: NASA Scientific Visualization Studio page ${state.svsId}`}
            className="rounded-[7px] bg-soft px-2.5 py-0.5 text-[13px] text-mute no-underline hover:text-ink"
          >
            SVS {state.svsId}
          </a>
        )}
        <Segmented
          label="Speed"
          options={TEMPOS.map((tempo) => ({ ...tempo, isOn: tempo.value === state.tempo }))}
          onSelect={(tempo) => jukebox.setTempo(tempo)}
        />
        <label className="flex items-center gap-2">
          <span className="sr-only">Volume</span>
          <span aria-hidden="true">🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.volume}
            onChange={(event) => jukebox.setVolume(Number(event.target.value))}
            className="w-24 accent-ink"
          />
        </label>
      </div>

      <Stage onPickFile={openFilePicker} />

      <dl className="mt-4.5 mb-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Position" value={state.stats.position} testId="stat-pos" />
        <Stat label="Brightness" value={state.stats.brightness} testId="stat-bright" />
        <Stat label="Main colour" value={state.stats.colour} testId="stat-colour" />
        <Stat label="Notes" value={state.stats.notes} testId="stat-notes" />
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PlayButton label="Play" className="btn-dark" testId="play" />
        <button
          type="button"
          aria-label="Restart"
          className="btn btn-outline w-[46px] px-0 text-xl"
          onClick={() => jukebox.restart()}
        >
          ↺
        </button>
        <button
          type="button"
          data-testid="describe"
          className="btn btn-outline"
          onClick={() => jukebox.describe(readAloud)}
        >
          Describe this frame
        </button>
        <Segmented
          label="Sound layers"
          options={LAYERS.map((layer) => ({ ...layer, isOn: state.layers[layer.value] }))}
          onSelect={(layer) => jukebox.toggleLayer(layer)}
          strikeWhenOff
        />
      </div>

      <p className="mt-4.5 flex items-baseline gap-3">
        <span
          className={`flex-none rounded-[7px] px-2.5 py-0.5 text-[13px] font-semibold ${badgeColour}`}
        >
          {state.badge}
        </span>
        <span role="status">{state.status}</span>
      </p>
      <p className="mt-2.5 text-[15px] text-mute">
        <strong className="text-ink">What you'll hear.</strong> {state.whatYouHear}
      </p>
      <p
        aria-live="polite"
        data-testid="desc"
        className="mt-2.5 rounded-xl bg-soft px-3.5 py-3 text-[15px] empty:hidden"
      >
        {state.description}
      </p>
      <p
        aria-live="polite"
        data-testid="probe"
        className="mt-2.5 text-[15px] text-mute empty:hidden"
      >
        {state.cellDescription}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4.5 gap-y-2.5 border-t border-line pt-3.5 text-sm text-mute">
        <button
          type="button"
          className="cursor-pointer py-1.5 font-semibold text-ink underline"
          onClick={openFilePicker}
        >
          Sonify your own image or video
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(event) => {
            jukebox.useFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={readAloud}
            onChange={(event) => setReadAloud(event.target.checked)}
          />
          Read descriptions aloud
        </label>
        <span className="ml-auto max-sm:hidden">
          Keys: <Key>Space</Key> play or pause · <Key>D</Key> describe · arrows explore the frame
        </span>
      </div>
    </div>
  );
}
