import { jukebox } from '../engine/jukebox';
import { TRACKS } from '../engine/tracks';
import { useJukebox } from '../useJukebox';

function selectTrack(id: string) {
  jukebox.selectTrack(id);
  history.replaceState(null, '', `#${id}`);
}

export default function TrackPicker() {
  const { trackId } = useJukebox();

  return (
    <div
      role="group"
      aria-label="Choose a visualization"
      className="mx-auto mt-8.5 mb-4.5 flex max-w-[900px] flex-wrap justify-center gap-2"
    >
      {TRACKS.map((track) => (
        <button
          key={track.id}
          type="button"
          data-id={track.id}
          aria-pressed={track.id === trackId}
          onClick={() => selectTrack(track.id)}
          className="min-h-11 cursor-pointer rounded-full border-2 border-white/55 bg-white/70 px-4.5 text-sm font-semibold text-ink hover:bg-white/90 aria-pressed:border-white aria-pressed:bg-white aria-pressed:shadow-[0_0_0_4px_rgba(255,255,255,.35)]"
        >
          {track.short}
        </button>
      ))}
    </div>
  );
}
