import PlayButton from './PlayButton';
import Player from './Player';
import TrackPicker from './TrackPicker';

const EIC_GALLERY = 'https://svs.gsfc.nasa.gov/gallery/earth-information-center/';

export default function Hero() {
  return (
    <section className="hero-bg rounded-[24px] px-3 pt-9 pb-3.5 text-center text-white sm:rounded-[44px] sm:px-7 sm:pt-16 sm:pb-7">
      <p className="mb-4.5 text-xs font-semibold tracking-[.14em] uppercase">
        NASA Space Apps Challenge 2026 · The Earth Information Jukebox
      </p>
      <h1 className="font-display text-[clamp(36px,6.4vw,62px)] leading-[1.08] font-bold tracking-tight">
        Hear the Planet.
        <br />
        Understand Our World.
      </h1>
      <p className="mx-auto mt-5.5 max-w-[560px] text-[15px] text-white/95 sm:text-[17px]">
        Earthbeat reads NASA Earth Information Center visualizations frame by frame and turns their
        colour, light and motion into music as you watch. Nothing is pre-recorded.
      </p>

      <div className="mt-7 mb-4 flex flex-wrap justify-center gap-2.5">
        <PlayButton label="Play this track" className="btn-light" />
        <a className="btn btn-soft" href="#how">
          How the sound works
        </a>
      </div>
      <p className="text-[13px] text-white/95">
        Sound starts only when you press Play · Visuals from{' '}
        <a className="underline" href={EIC_GALLERY}>
          NASA's Earth Information Center collection
        </a>
      </p>

      <TrackPicker />
      <Player />
    </section>
  );
}
