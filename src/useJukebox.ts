import { useSyncExternalStore } from 'react';
import { jukebox } from './engine/jukebox';

export function useJukebox() {
  return useSyncExternalStore(jukebox.subscribe, jukebox.getSnapshot);
}
