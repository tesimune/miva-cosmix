import { useEffect } from 'react';
import { jukebox } from './engine/jukebox';
import { TRACKS, findTrack } from './engine/tracks';
import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import SoundNotes from './components/SoundNotes';

function trackIdFromHash() {
  const track = findTrack(location.hash.slice(1));
  return track ? track.id : TRACKS[0].id;
}

function isTyping(target: HTMLElement) {
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
}

function isControl(target: HTMLElement) {
  return target.tagName === 'BUTTON' || target.tagName === 'A';
}

function useTrackFromHash() {
  useEffect(() => {
    jukebox.selectTrack(trackIdFromHash());

    const followHash = () => {
      const id = trackIdFromHash();
      if (id !== jukebox.getSnapshot().trackId) jukebox.selectTrack(id);
    };
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      if (hasModifier || isTyping(target)) return;

      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        jukebox.describe(false);
      } else if (event.key === ' ' && !isControl(target)) {
        event.preventDefault();
        jukebox.toggle();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);
}

export default function App() {
  useTrackFromHash();
  useKeyboardShortcuts();

  return (
    <>
      <a
        href="#player"
        className="absolute top-2 -left-[999px] z-20 rounded-[10px] bg-ink px-3.5 py-2.5 text-white focus:left-2"
      >
        Skip to the player
      </a>
      <Header />
      <main className="px-2 sm:px-3.5">
        <Hero />
        <HowItWorks />
        <SoundNotes />
        <Footer />
      </main>
    </>
  );
}
