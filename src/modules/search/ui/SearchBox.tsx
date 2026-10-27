'use client';

// Клиентский компонент: подсказки приходят, пока посетитель печатает.
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import { suggestTerms, type SearchKind, type SearchSuggestion } from '../model';

const KIND_LABELS: Record<SearchKind, string> = {
  page: 'Страница',
  news: 'Новость',
  forum: 'Форум',
};

/** Пауза после нажатия клавиши, прежде чем спрашивать подсказки: не на каждую букву. */
const DEBOUNCE_MS = 150;

/**
 * Поле поиска по сайту с подсказками (docs/02-product.md, «Поиск по сайту»): страницы,
 * новости и темы форума, в заголовке которых есть набранное, — по образцу WAI-ARIA
 * «combobox с автодополнением». Стрелки выбирают подсказку, Enter открывает её, а без выбора
 * — отправляет форму на страницу результатов, как и без JavaScript.
 */
export function SearchBox({ id }: { id: string }) {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!suggestTerms(text)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { suggestions: SearchSuggestion[] };
        setSuggestions(data.suggestions);
        setActive(-1);
      } catch {
        // Отменённый запрос или нет сети — подсказок просто нет, поиск работает и так.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text]);

  // Последний пункт — все результаты на странице поиска.
  const items: SearchSuggestion[] =
    open && suggestTerms(text) && suggestions.length > 0
      ? [...suggestions, { kind: 'page', url: `/search?q=${encodeURIComponent(text)}`, title: '' }]
      : [];
  const expanded = items.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  const go = (item: SearchSuggestion) => {
    setOpen(false);
    router.push(item.url);
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
    <>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Поиск по сайту"
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
        className="w-full min-w-0 bg-transparent text-sm text-graphite placeholder:text-slate focus:outline-none"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Подсказки поиска"
        hidden={!expanded}
        // Щелчок по подсказке не должен увести фокус из поля раньше, чем сработает переход.
        onPointerDown={(event) => event.preventDefault()}
        className="absolute top-full right-0 z-30 mt-2 grid w-full min-w-72 gap-0.5 rounded-md bg-white p-1.5 shadow-card lg:w-96"
      >
        {items.map((item, index) => {
          const isAll = index === items.length - 1;
          return (
            <li
              key={item.url}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onPointerMove={() => setActive(index)}
              onClick={() => go(item)}
              className={cn(
                'flex cursor-pointer items-baseline justify-between gap-3 rounded-sm px-3 py-2 text-sm',
                index === active && 'bg-mist',
                isAll && 'border-t border-line text-leaf',
              )}
            >
              {isAll ? (
                <span>Все результаты по «{text.trim()}»</span>
              ) : (
                <>
                  <span className="text-graphite">{item.title}</span>
                  <span className="shrink-0 text-xs text-slate">{KIND_LABELS[item.kind]}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
