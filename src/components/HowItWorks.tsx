const STEPS = [
  {
    n: '01',
    title: 'Capture',
    tick: 'bg-sky-soft',
    text: 'The frame on screen is copied into a small grid: 32 columns across, 12 rows down.',
    points: [
      'Works on video and still images',
      'Same grid for every visualization',
      'Nothing leaves your device',
    ],
  },
  {
    n: '02',
    title: 'Measure',
    tick: 'bg-[#e3f0b8]',
    text: 'Each cell is measured for brightness, colour and strength of colour. The whole frame is measured for motion.',
    points: ['Brightness and peak light', 'Six colour families', 'Change since the last frame'],
  },
  {
    n: '03',
    title: 'Map',
    tick: 'bg-[#ddd0f7]',
    text: 'A playhead sweeps left to right. Cells that stand out become notes on a musical scale.',
    points: [
      'Height in the frame sets pitch',
      'Strength sets loudness',
      'Left and right set the stereo position',
    ],
  },
  {
    n: '04',
    title: 'Play',
    tick: 'bg-[#bfe9e2]',
    text: 'Three layers sound together, and you can switch each one off to hear the others.',
    points: [
      'Melody: the standout cells',
      'Harmony: the dominant colour',
      'Pulse: motion and flashes',
    ],
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how"
      className="mt-10 rounded-[24px] bg-soft px-3 py-10 text-center sm:mt-20 sm:rounded-[44px] sm:px-7 sm:py-16"
    >
      <p className="mb-4.5 text-xs font-semibold tracking-[.14em] uppercase">Sonification</p>
      <h2 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.08] font-bold tracking-tight">
        Every frame becomes a score.
      </h2>
      <p className="mx-auto mt-5.5 max-w-[560px] text-mute sm:text-[17px]">
        Sonification means representing information with sound. Earthbeat does it live, in four
        steps, about six times a second.
      </p>
      <div className="mx-auto mt-9 grid max-w-[900px] gap-5 text-left sm:grid-cols-2">
        {STEPS.map((s) => (
          <article key={s.n} className="rounded-[28px] bg-white p-6.5">
            <span className="text-[13px] font-semibold text-mute">{s.n}</span>
            <h3 className="mt-2 mb-2.5 font-display text-2xl font-bold tracking-tight">
              {s.title}
            </h3>
            <p className="mb-3 text-mute">{s.text}</p>
            <ul className="grid gap-1.5">
              {s.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] text-xs font-bold ${s.tick}`}
                  >
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
