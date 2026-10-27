import Form from 'next/form';
import type { City } from '@/modules/catalog-data';
import { cn } from '@/shared/lib/cn';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { MAX_PASSENGERS, type SearchQuery } from '../model';
import { PhraseSelect } from './PhraseSelect';

type SearchPhraseProps = {
  cities: Array<Pick<City, 'slug' | 'nameFrom' | 'nameTo'>>;
  /** Что подставить в поля: прошлый запрос или значения по умолчанию. */
  defaults: Pick<SearchQuery, 'from' | 'to' | 'date' | 'passengers' | 'cabinClass'>;
  /** Границы выбора даты: сегодня и через 60 дней. */
  minDate: string;
  maxDate: string;
};

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
