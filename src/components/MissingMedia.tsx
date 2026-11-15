import { jukebox } from '../engine/jukebox';

export default function MissingMedia({ onPickFile }: { onPickFile: () => void }) {
  return (
    <div
      data-testid="missing"
      className="absolute inset-0 flex cursor-default flex-col items-center justify-center gap-3.5 bg-[#141d36] p-4.5 text-center text-[15px] text-white"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="max-w-[440px]">
        <strong>This track's NASA media isn't on this site yet.</strong>
        <br />
        Run <code className="rounded bg-white/15 px-1.5 py-px">npm run media</code> in the project,
        or try the engine with one of these:
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          data-testid="use-test"
          className="btn btn-light min-h-10 px-3.5 text-sm"
          onClick={() => jukebox.useTestPattern()}
        >
          Use a test pattern
        </button>
        <button
          type="button"
          className="btn min-h-10 border-white px-3.5 text-sm text-white hover:bg-white/10"
          onClick={onPickFile}
        >
          Choose an image or video
        </button>
      </div>
    </div>
  );
}
