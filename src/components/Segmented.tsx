interface Option<Value> {
  label: string;
  value: Value;
  isOn: boolean;
}

interface Props<Value> {
  label: string;
  options: Option<Value>[];
  onSelect: (value: Value) => void;
  strikeWhenOff?: boolean;
}

export default function Segmented<Value extends string | number>({
  label,
  options,
  onSelect,
  strikeWhenOff,
}: Props<Value>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-[10px] bg-soft p-1 sm:ml-auto"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.isOn}
          onClick={() => onSelect(option.value)}
          className={`min-h-[34px] cursor-pointer rounded-[7px] px-3 text-sm font-medium text-mute aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-sm ${
            strikeWhenOff ? 'aria-[pressed=false]:line-through' : ''
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
