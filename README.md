# Earthbeat: The Earth Information Jukebox

NASA Space Apps Challenge 2026. Pick a NASA Earth Information Center (EIC) visualization and hear it: the app reads the frame on screen and generates music from its colour, light and motion, live in the browser. No audio is pre-recorded.

Stack: React 19, TypeScript, Vite, Tailwind CSS 4. Audio is plain Web Audio, with no audio library.

## Run it

```bash
npm install
npm run media   # one time: pulls the EIC clips from NASA SVS into public/media/ (ffmpeg is bundled via ffmpeg-static)
npm run dev     # http://localhost:5173
npm run format  # prettier
npm run build   # type-checks, then writes the static site to dist/
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages). Asset paths are relative, so a sub-path works. Commit `public/media/` or run `npm run media` before `npm run build` in your deploy step.

## Layout

```
src/
  engine/              plain TypeScript, no React
    tracks.json        the jukebox: one entry per EIC visualization, with its sound preset
    tracks.ts          types, scales, note helpers
    analyzer.ts        frame -> 32x12 grid of brightness and colour, plus whole-frame features
    mapping.ts         features -> melody notes, chord, drum hits
    synth.ts           Web Audio instruments, pad, drums
    describe.ts        plain-language descriptions of a frame or a cell
    overlay.ts         playhead, note sparks and explore cursor
    testPattern.ts     generated picture for trying the engine without media
    jukebox.ts         ties it together: media loading, audio clock, state
  useJukebox.ts        React subscription to the engine's state
  team.ts              team name and members shown in the footer
  components/          Header, Hero, TrackPicker, Player, Stage, HowItWorks, SoundNotes, Footer
scripts/fetch-media.mjs
```

The engine owns everything that runs on the audio clock or every animation frame, so React only re-renders for state a person can see change (track, play state, the four stats, text).

## How frames become sound

About six times a second (`jukebox.ts`, `playStep`, using `mapping.ts`):

1. **Capture.** The visible frame (video, still or uploaded file) is drawn to a 128x48 canvas and averaged into a 32x12 grid.
2. **Measure.** Per cell: mean brightness, peak brightness, saturation, hue. Per frame: mean brightness, share of each of six colour families, warm share, motion since the last step, sudden jumps in bright area.
3. **Map.** A playhead moves one column per step.
   - **Melody:** cells in that column that stand out become notes. Row sets pitch (top is high), strength sets loudness, column sets stereo position. Only strong cells get the fast off-beat notes, so denser light gives a busier rhythm.
   - **Harmony:** the dominant colour family picks the chord; brightness and warmth open the filter.
   - **Pulse:** frame-to-frame motion drives a kick; bright area drives ticks; on the lightning track, jumps in brightness trigger strikes.
4. **Play.** Oscillators and noise, held to a musical scale per track.

Tune a track by editing its `preset` in `tracks.json`: instrument, scale, tempo, threshold, and what counts as standing out.

## Accessibility

- Every control is a labelled button and works from the keyboard. `Space` plays or pauses, `D` describes.
- **Explore mode:** focus the frame and use the arrow keys (or drag a finger) to hear and read out any single cell: position, colour name, brightness, note.
- **Describe this frame** writes a plain-language description of the current frame into a live region for screen readers, with optional read-aloud.
- Sound never starts on its own. Layers can be switched off individually.

## Add a track

Add an entry to `src/engine/tracks.json` with the SVS page id and a direct media URL from `https://svs.gsfc.nasa.gov/api/<id>`, then `npm run media -- <track-id>`.

## Why the media is self-hosted

NASA's SVS server does not allow other sites to read its pixels (CORS), and the analyzer has to read them. So the clips are copied into `public/media/` and served with the app.

## Credits

Visualizations: NASA's Scientific Visualization Studio, Earth Information Center collection (https://svs.gsfc.nasa.gov/gallery/earth-information-center/). Each track links to its source page.
