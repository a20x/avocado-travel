'use client';

// Клиентский компонент: свой выпадающий список работает только с JavaScript.
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { inlineFieldClasses } from '@/shared/ui/Field';

export type PhraseOption = { value: string; label: string };

type PhraseSelectProps = {
  name: string;
  label: string;
  /** Начальное значение, если поле само хранит выбор. */
  defaultValue?: string;
  /** Значение снаружи — когда выбор в поле зависит от других полей фразы (связанные списки). */
  value?: string;
  onChange?: (value: string) => void;
  options: PhraseOption[];
};

const fieldClasses = cn(inlineFieldClasses, 'cursor-pointer appearance-none pr-7');

/** Стрелка списка: рисуется поверх поля, клики проходят насквозь. */
function Chevron() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[0.5em] text-slate"
    >
      ▾
    </span>
  );
}

// Есть ли мышь или тачпад. На телефоне стандартный список удобнее — системное колесо или
// окно выбора, а на сервере и без JavaScript другого и нет.
const FINE_POINTER = '(pointer: fine)';
function subscribePointer(onChange: () => void) {
  const query = window.matchMedia(FINE_POINTER);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const hasFinePointer = () => window.matchMedia(FINE_POINTER).matches;

/**
 * Поле фразы-поиска со списком. Стандартный <select> браузер раскрывает шрифтом самого поля,
 * а во фразе он крупный — меню городов выходило на весь экран. Поэтому с мышью список свой,
 * обычного размера с прокруткой, по образцу WAI-ARIA «combobox со списком»: стрелки, Home/End,
 * Enter, Escape и поиск по первым буквам. Значение уходит в форму через скрытое поле.
 */
export function PhraseSelect({
  name,
  label,
  defaultValue = '',
  value: outerValue,
  onChange,
  options,
}: PhraseSelectProps) {
  const enhanced = useSyncExternalStore(subscribePointer, hasFinePointer, () => false);
  const id = `phrase-${name}`;
  const listId = useId();
  const labelId = `${id}-label`;

  const [ownValue, setOwnValue] = useState(defaultValue);
  const value = outerValue ?? ownValue;
  const setValue = (next: string) => {
    setOwnValue(next);
    onChange?.(next);
  };
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLSpanElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  // Щелчок мимо закрывает список.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Активный пункт всегда виден в прокручиваемом списке.
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  if (!enhanced) {
    return (
      <span className="relative inline-block max-w-full">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <select
          id={id}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={fieldClasses}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Chevron />
      </span>
    );
  }

  const openList = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option) setValue(option.value);
    setOpen(false);
  };

  /** Поиск по первым буквам: «к», «ка» — к «Казани»; пауза больше секунды начинает заново. */
  const typeAhead = (key: string) => {
    const now = Date.now();
    const text = (now - typed.current.at > 1000 ? '' : typed.current.text) + key.toLowerCase();
    typed.current = { text, at: now };
    const from = open ? active : selectedIndex;
    const order = [...options.keys()].map(
      (i) => (from + (text.length === 1 ? 1 : 0) + i) % options.length,
    );
    const found = order.find((i) => options[i]?.label.toLowerCase().startsWith(text));
    if (found !== undefined) openList(found);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
      PageDown: Math.min(active + 10, last),
      PageUp: Math.max(active - 10, 0),
    };
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        openList(event.key === 'Home' ? 0 : event.key === 'End' ? last : selectedIndex);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        typeAhead(event.key);
      }
      return;
    }
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key] ?? active);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      choose(active);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      typeAhead(event.key);
    }
  };

  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <span ref={root} className="relative inline-block max-w-full">
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <span
        id={id}
        role="combobox"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(fieldClasses, 'whitespace-nowrap select-none', open && 'border-leaf')}
      >
        {options[selectedIndex]?.label}
      </span>
      <Chevron />
      {/* Фраза — абзац <p>, а список <ul> в абзаце не допускается: элементы строчные, с ролями. */}
      <span
        ref={list}
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        hidden={!open}
        className="absolute top-full left-0 z-30 mt-1 block max-h-72 w-max min-w-full overflow-y-auto rounded-md bg-white p-1 text-base leading-normal font-normal shadow-card"
      >
        {options.map((option, index) => (
          <span
            key={option.value}
            id={optionId(index)}
            data-value={option.value}
            role="option"
            aria-selected={index === selectedIndex}
            onPointerMove={() => setActive(index)}
            onClick={() => choose(index)}
            className={cn(
              'block cursor-pointer rounded-sm px-3 py-1.5 whitespace-nowrap text-graphite',
              index === active && 'bg-mist',
              index === selectedIndex && 'font-semibold text-leaf',
            )}
          >
            {option.label}
          </span>
        ))}
      </span>
    </span>
  );
}
