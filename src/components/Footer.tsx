import type { ReactNode } from 'react';
import { TEAM } from '../team';
import Logo from './Logo';
import PlayButton from './PlayButton';

const EXPLORE_LINKS = [
  { label: 'Listen', href: '#player' },
  { label: 'How it works', href: '#how' },
  { label: 'The sound', href: '#sound' },
];

const CHALLENGE_LINKS = [
  { label: 'NASA Space Apps 2026', href: 'https://www.spaceappschallenge.org/2026/' },
  {
    label: 'The Earth Information Jukebox',
    href: 'https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/',
  },
];

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold tracking-tight">{title}</h3>
      <ul className="grid gap-2.5 text-white/85">{children}</ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mb-3.5 rounded-[24px] bg-ink px-5 pt-10 pb-7 text-white sm:rounded-[44px] sm:px-10 sm:pt-14">
      <h2 className="font-display text-[clamp(24px,3.6vw,32px)] leading-tight font-bold tracking-tight">
        The Earth has a story. We want people to hear it.
      </h2>
      <div className="mt-6">
        <PlayButton label="Play this track" className="btn-light" />
      </div>

      <div className="mt-11 grid gap-9 sm:grid-cols-3">
        <Column title="Explore">
          {EXPLORE_LINKS.map((link) => (
            <li key={link.label}>
              <a className="no-underline hover:underline" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </Column>

        <Column title={TEAM.name}>
          {TEAM.members.map((member) => (
            <li key={member.name}>
              {member.name} · {member.role}
            </li>
          ))}
        </Column>

        <Column title="Challenge">
          {CHALLENGE_LINKS.map((link) => (
            <li key={link.label}>
              <a className="no-underline hover:underline" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </Column>
      </div>

      <div className="mt-11 border-t border-white/15 pt-6 text-[13px]">
        <p className="flex flex-wrap items-center gap-2.5 font-medium">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10">
            <Logo size={14} />
          </span>
          EARTHBEAT by {TEAM.name} · {TEAM.motto}
        </p>
        <p className="mt-3 text-white/75">
          Visualizations: NASA's Scientific Visualization Studio, Earth Information Center
          collection. Each track links to its source page.
        </p>
      </div>
    </footer>
  );
}
