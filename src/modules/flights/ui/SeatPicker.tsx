'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CabinClass } from '@/modules/catalog-data';
import { cn } from '@/shared/lib/cn';
import { formatPrice, plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import type { SeatInfo, SeatMapRow } from '../seat-map';
import { EXTRA_LEGROOM_PRICE, selectionTotal, toggleSeat } from '../seat-selection';

type SeatPickerProps = {
  flightId: string;
  cabinClass: CabinClass;
  passengers: number;
  seatMap: SeatMapRow[];
  /** Ссылка на эту же страницу с другим классом — места другого класса здесь не выбираются. */
  otherClass: { label: string; href: string };
};

const CLASS_TITLE: Record<CabinClass, string> = { business: 'Бизнес', economy: 'Эконом' };

const seatBase =
  'flex items-center justify-center rounded-t-lg rounded-b border-2 transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf';

function seatState(seat: SeatInfo, selected: boolean, extra: boolean, available: boolean) {
  if (seat.taken) return 'border-line bg-line text-transparent';
  if (selected) return 'border-leaf bg-leaf font-semibold text-white';
  if (!available) return 'border-line-strong bg-white text-slate opacity-40';
  return cn(
    'cursor-pointer bg-white text-slate hover:border-graphite',
    extra ? 'border-pit' : 'border-line-strong',
  );
}

/** Образец кресла для легенды. */
function LegendSeat({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={cn('size-5 rounded-t-md rounded-b border-2', className)} />
  );
}

/**
 * Схема салона с выбором мест (docs/06-design.md). Кресла — флажки обычной формы GET:
 * выбранные места уходят на оформление брони адресом `/booking?flight=…&seats=7D&seats=7E`.
 * Клиентский компонент нужен, чтобы следить за числом мест и сразу показывать сумму.
 */
export function SeatPicker({
  flightId,
  cabinClass,
  passengers,
  seatMap,
  otherClass,
}: SeatPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const prices = new Map(seatMap.flatMap((row) => row.groups.flat().map((s) => [s.id, s.price])));
  const total = selectionTotal(selected, prices);
  const missing = passengers - selected.length;

  return (
    <form action="/booking" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <input type="hidden" name="flight" value={flightId} />
      <input type="hidden" name="cabinClass" value={cabinClass} />

      <Card as="section" aria-labelledby="cabin-title" className="grid gap-5 p-4 md:p-6">
        <div className="grid gap-2">
          <h2 id="cabin-title" className="text-xl">
            Выберите{' '}
            {passengers === 1
              ? 'место'
              : `${passengers} ${plural(passengers, ['место', 'места', 'мест'])}`}
          </h2>
          <p className="text-sm text-slate">
            Класс — {CLASS_TITLE[cabinClass].toLowerCase()}.{' '}
            <Link href={otherClass.href}>{otherClass.label}</Link>
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li className="flex items-center gap-2">
            <LegendSeat className="border-line-strong bg-white" /> свободно
          </li>
          <li className="flex items-center gap-2">
            <LegendSeat className="border-pit bg-white" /> больше места для ног, +
            {formatPrice(EXTRA_LEGROOM_PRICE)}
          </li>
          <li className="flex items-center gap-2">
            <LegendSeat className="border-line bg-line" /> занято
          </li>
          <li className="flex items-center gap-2">
            <LegendSeat className="border-leaf bg-leaf" /> ваш выбор
          </li>
        </ul>

        {/* Нос самолёта — скругление сверху. Широкий салон на телефоне прокручивается вбок внутри схемы. */}
        <div className="mx-auto w-full max-w-md rounded-t-[10rem] rounded-b-3xl border-2 border-line bg-mist px-2 pt-16 pb-6 sm:px-4">
          <div className="overflow-x-auto">
            {(['business', 'economy'] as const).map((cls) => {
              const rows = seatMap.filter((row) => row.cabinClass === cls);
              if (rows.length === 0) return null;
              const available = cls === cabinClass;
              const size =
                cls === 'business' ? 'size-10 text-xs' : 'size-8 text-[10px] sm:size-9 sm:text-xs';
              return (
                <fieldset key={cls} className="mx-auto mb-2 w-max" disabled={!available}>
                  <legend className="mx-auto my-2 text-sm text-slate">{CLASS_TITLE[cls]}</legend>
                  {rows.map((row) => (
                    <div
                      key={row.number}
                      role="group"
                      aria-label={`Ряд ${row.number}`}
                      className={cn(
                        'mb-1.5 flex items-center justify-center',
                        cls === 'business' ? 'gap-2.5' : 'gap-1.5',
                      )}
                    >
                      {row.groups.map((group, groupIndex) => (
                        <div key={groupIndex} className="contents">
                          {groupIndex > 0 ? (
                            <span aria-hidden="true" className="w-6 text-center text-xs text-slate">
                              {groupIndex === 1 ? row.number : ''}
                            </span>
                          ) : null}
                          {group.map((seat) => {
                            const isSelected = selected.includes(seat.id);
                            const label = [
                              `Место ${seat.id}`,
                              row.extraLegroom ? 'больше места для ног' : null,
                              seat.taken ? 'занято' : formatPrice(seat.price),
                            ]
                              .filter(Boolean)
                              .join(', ');
                            return (
                              <label key={seat.id} className="relative">
                                <input
                                  type="checkbox"
                                  name="seats"
                                  value={seat.id}
                                  checked={isSelected}
                                  disabled={seat.taken || !available}
                                  onChange={() =>
                                    setSelected((current) =>
                                      toggleSeat(current, seat.id, passengers),
                                    )
                                  }
                                  aria-label={label}
                                  className="peer sr-only"
                                />
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    seatBase,
                                    size,
                                    seatState(seat, isSelected, row.extraLegroom, available),
                                  )}
                                >
                                  {seat.taken ? '' : seat.id}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </fieldset>
              );
            })}
          </div>
        </div>
      </Card>

      {/* На телефоне — панель внизу экрана: итог и кнопка, схема остаётся видна. */}
      <Card
        as="aside"
        aria-label="Ваш выбор"
        className="sticky bottom-0 z-10 flex items-center gap-3 rounded-b-none px-4 py-3 shadow-[0_-4px_16px_rgb(42_46_51/0.12)] lg:top-4 lg:bottom-auto lg:block lg:rounded-md lg:p-6 lg:shadow-card"
      >
        <h3 className="hidden text-lg lg:block">Ваш выбор</h3>
        <ul className="hidden lg:mt-2 lg:block">
          {Array.from({ length: passengers }, (_, i) => (
            <li key={i} className="flex items-center justify-between border-b border-line py-3">
              <span>Пассажир {i + 1}</span>
              {selected[i] ? (
                <Badge tone="success">место {selected[i]}</Badge>
              ) : (
                <Badge tone="muted">не выбрано</Badge>
              )}
            </li>
          ))}
        </ul>
        <p className="grid leading-tight lg:my-4 lg:flex lg:items-baseline lg:justify-between">
          <span className="text-sm text-slate lg:text-base lg:font-semibold lg:text-graphite">
            Итого
          </span>
          <output className="text-lg font-semibold whitespace-nowrap lg:text-xl" aria-live="polite">
            {formatPrice(total)}
          </output>
        </p>
        <p className="hidden text-sm text-slate lg:mb-4 lg:block">
          {missing > 0
            ? `Осталось выбрать ${missing} ${plural(missing, ['место', 'места', 'мест'])}.`
            : 'Места держатся за вами 15 минут после перехода к оформлению.'}
        </p>
        <button
          type="submit"
          disabled={missing > 0}
          className={cn(buttonClasses({ fullWidth: true }), 'flex-1')}
        >
          {missing > 0 ? `Выберите ещё ${missing}` : 'Перейти к оформлению'}
        </button>
      </Card>
    </form>
  );
}
