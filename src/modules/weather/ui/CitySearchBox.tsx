'use client';

// Клиентский компонент: подсказки городов приходят, пока посетитель печатает.
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import { Field, fieldControlClasses } from '@/shared/ui/Field';
import { CITY_QUERY_MAX, citySuggestQuery, weatherCityHref } from '../model';

type Suggestion = { id: number; name: string; area: string };

/** Пауза после нажатия клавиши, прежде чем спрашивать подсказки: не на каждую букву. */
const DEBOUNCE_MS = 250;

/**
 * Поле «Город» на странице «Погода» с подсказками городов (docs/02-product.md, «Погода») —
 * по образцу WAI-ARIA «combobox с автодополнением», как поиск по сайту в шапке. Подсказка сразу
 * открывает погоду в городе; Enter без выбранной подсказки — список городов по запросу, как
 * и без JavaScript (поле остаётся обычным полем формы GET).
 */
export function CitySearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const id = 'field-q';
  const listId = useId();
  const [text, setText] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const query = citySuggestQuery(text);
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/weather/cities?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { cities: Suggestion[] };
        setSuggestions(data.cities);
        setActive(-1);
      } catch {
        // Отменённый запрос или нет сети — подсказок нет, кнопка «Найти» работает и так.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text]);

  const items = open && citySuggestQuery(text) ? suggestions : [];
  const expanded = items.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  const go = (city: Suggestion) => {
    setOpen(false);
    setText(city.name);
    router.push(weatherCityHref(city.id));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!expanded) {
      if (event.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // По кругу через само поле: −1 — курсор в поле, ни одна подсказка не выбрана.
      const states = items.length + 1;
      setActive((current) => ((current + 1 + step + states) % states) - 1);
    } else if (event.key === 'Enter' && items[active]) {
      event.preventDefault();
      go(items[active]);
    }
  };

  return (
    <Field id={id} label="Город" className="relative min-w-0 flex-1">
      <input
        id={id}
        name="q"
        type="search"
        placeholder="например, Обнинск"
        maxLength={CITY_QUERY_MAX}
        required
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && items[active] ? optionId(active) : undefined}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={fieldControlClasses}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Подсказки городов"
        hidden={!expanded}
        // Щелчок по подсказке не должен увести фокус из поля раньше, чем сработает переход.
        onPointerDown={(event) => event.preventDefault()}
        className="absolute top-full left-0 z-30 mt-1 grid w-full gap-0.5 rounded-md bg-white p-1.5 shadow-card"
      >
        {items.map((city, index) => (
          <li
            key={city.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            onPointerMove={() => setActive(index)}
            onClick={() => go(city)}
            className={cn(
              'flex cursor-pointer items-baseline justify-between gap-3 rounded-sm px-3 py-2',
              index === active && 'bg-mist',
            )}
          >
            <span className="text-graphite">{city.name}</span>
            <span className="truncate text-sm text-slate">{city.area}</span>
          </li>
        ))}
      </ul>
    </Field>
  );
}
