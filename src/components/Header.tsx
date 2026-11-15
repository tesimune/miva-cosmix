import Logo from './Logo';
import PlayButton from './PlayButton';

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-paper/90 px-4 py-2.5 backdrop-blur sm:px-7">
      <div className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-sky">
          <Logo />
        </span>
        EARTHBEAT
      </div>
      <PlayButton label="Press Play" className="btn-dark" hideLabelOnMobile />
    </header>
  );
}
