'use client';

import { useState } from 'react';
import { formatPrice } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Table } from '@/shared/ui/Table';
import { convert, formatMoney, parseAmount, type Rates } from '../model';

type ConverterProps = {
  rates: Rates;
  /** Сумма из адреса `?amount=` — например, со страницы оплаты брони. */
  initialAmount: number | null;
};

/**
 * Конвертер валют (L1-S07): рубли → валюты по курсу ЦБ. Пересчитывает сразу при вводе;
 * без JavaScript работает как обычная форма GET — сумма уходит в адрес, сервер считает сам.
 */
export function Converter({ rates, initialAmount }: ConverterProps) {
  const [text, setText] = useState(initialAmount ? String(initialAmount) : '10000');
  const amount = parseAmount(text);

  return (
    <div className="grid gap-4">
      <form action="/services#converter" className="flex flex-wrap items-end gap-3">
        <Input
          name="amount"
          label="Сумма в рублях"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          error={amount === null && text.trim() !== '' ? 'Введите сумму больше нуля' : undefined}
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Пересчитать
        </Button>
      </form>
      <Table caption={`${amount ? formatPrice(Math.round(amount * 100)) : 'Сумма'} по курсу ЦБ`}>
        <thead>
          <tr>
            <th scope="col">Валюта</th>
            {/* На телефоне курс скрыт: главное — сумма, а таблица должна помещаться в экран. */}
            <th scope="col" className="hidden sm:table-cell">
              Курс
            </th>
            <th scope="col">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {rates.rates.map((rate) => (
            <tr key={rate.code}>
              <td>
                {rate.name} <span className="text-sm text-slate">{rate.code}</span>
              </td>
              <td className="hidden whitespace-nowrap tabular-nums sm:table-cell">
                {rate.rubles.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ₽
              </td>
              <td className="font-semibold whitespace-nowrap tabular-nums">
                {amount ? formatMoney(convert(amount, rate), rate.code) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
