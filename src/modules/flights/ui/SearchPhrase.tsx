import Form from 'next/form';
import type { City } from '@/modules/catalog-data';
import { cn } from '@/shared/lib/cn';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { inlineFieldClasses } from '@/shared/ui/Field';
import { MAX_PASSENGERS, type SearchQuery } from '../model';

type SearchPhraseProps = {
  cities: Array<Pick<City, 'slug' | 'nameFrom' | 'nameTo'>>;
  /** Что подставить в поля: прошлый запрос или значения по умолчанию. */
  defaults: Pick<SearchQuery, 'from' | 'to' | 'date' | 'passengers' | 'cabinClass'>;
  /** Границы выбора даты: сегодня и через 60 дней. */
  minDate: string;
  maxDate: string;
};

const selectClasses = cn(inlineFieldClasses, 'cursor-pointer appearance-none pr-7');

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

function PhraseSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <span className="relative inline-block max-w-full">
      <label htmlFor={`phrase-${name}`} className="sr-only">
        {label}
      </label>
      <select
        id={`phrase-${name}`}
        name={name}
        defaultValue={defaultValue}
        className={selectClasses}
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

/**
 * Поиск-фраза (docs/06-design.md): «Я лечу из [Москвы] в [Калининград] [14 ноября], нас [2],
 * класс [эконом]». Обычная форма GET: без JavaScript она просто открывает страницу результатов,
 * а с ним <Form> из Next.js переходит туда без перезагрузки.
 */
export function SearchPhrase({ cities, defaults, minDate, maxDate }: SearchPhraseProps) {
  return (
    <Card as="section" aria-labelledby="phrase-title" className="max-w-4xl p-6 md:p-10">
      <h1 id="phrase-title" className="mb-3 text-base font-semibold text-pit">
        Куда летим?
      </h1>
      <Form action="/flights">
        <p className="text-xl leading-[2.2] font-medium sm:text-2xl lg:text-4xl lg:leading-[1.9]">
          Я лечу из{' '}
          <PhraseSelect
            name="from"
            label="Откуда"
            defaultValue={defaults.from}
            options={cities.map((city) => ({ value: city.slug, label: city.nameFrom }))}
          />{' '}
          в{' '}
          <PhraseSelect
            name="to"
            label="Куда"
            defaultValue={defaults.to}
            options={cities.map((city) => ({ value: city.slug, label: city.nameTo }))}
          />{' '}
          <DatePicker
            variant="inline"
            name="date"
            label="Дата вылета"
            defaultValue={defaults.date}
            min={minDate}
            max={maxDate}
            required
          />
          , нас{' '}
          <PhraseSelect
            name="passengers"
            label="Сколько пассажиров"
            defaultValue={String(defaults.passengers)}
            options={Array.from({ length: MAX_PASSENGERS }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
          />
          , класс{' '}
          <PhraseSelect
            name="cabinClass"
            label="Класс"
            defaultValue={defaults.cabinClass}
            options={[
              { value: 'economy', label: 'эконом' },
              { value: 'business', label: 'бизнес' },
            ]}
          />
          .
        </p>
        <button type="submit" className={cn(buttonClasses({ size: 'lg' }), 'mt-6')}>
          Подобрать рейсы →
        </button>
      </Form>
    </Card>
  );
}
