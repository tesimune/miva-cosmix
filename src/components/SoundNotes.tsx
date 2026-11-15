const NOTES = [
  [
    'The music follows the picture',
    'Pause the visualization and the melody keeps scanning the same frame. Let it run and the music changes as the planet does.',
  ],
  [
    'Built to be explored without sight',
    'Move through the frame with the arrow keys or a finger to hear any single area. “Describe this frame” writes out what the picture shows right now, for screen readers and for anyone who wants it in words.',
  ],
  [
    'A representation, not a recording',
    'These sounds are an artistic reading of NASA imagery. Notes are held to a musical scale so the result is pleasant to listen to, which means small differences are rounded.',
  ],
];

export default function SoundNotes() {
  return (
    <section id="sound" className="mx-auto my-10 max-w-[900px] px-2 sm:my-18 sm:px-4">
      <h2 className="font-serif text-[clamp(26px,4vw,36px)] leading-tight text-balance">
        Brighter light, more notes. Warmer colour, brighter chords.
      </h2>
      <dl className="mt-7">
        {NOTES.map(([title, text]) => (
          <div key={title} className="border-t border-line pt-4.5 pb-4.5">
            <dt className="font-display text-lg font-semibold">{title}</dt>
            <dd className="mt-1.5 max-w-[68ch] text-mute">{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
