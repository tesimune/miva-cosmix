import { jukebox } from '../engine/jukebox';
import { useJukebox } from '../useJukebox';

interface Props {
  label: string;
  className: string;
  hideLabelOnMobile?: boolean;
  testId?: string;
}

export default function PlayButton({ label, className, hideLabelOnMobile, testId }: Props) {
  const { isPlaying } = useJukebox();

  return (
    <button
      type="button"
      className={`btn ${className}`}
      data-testid={testId}
      onClick={() => jukebox.toggle()}
    >
      <span aria-hidden="true" className="text-xs">
        {isPlaying ? '❚❚' : '▶'}
      </span>
      <span className={hideLabelOnMobile ? 'max-sm:sr-only' : ''}>
        {isPlaying ? 'Pause' : label}
      </span>
    </button>
  );
}
