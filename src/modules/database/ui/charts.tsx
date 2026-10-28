'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatRubCompact } from '@/modules/analytics';
import { formatPrice } from '@/shared/lib/format';

/**
 * Графики вкладки «БД» (L3-03). Рисуются в браузере, а точные значения — таблицей рядом,
 * для тех, кто графики не видит. Цвета — токены дизайна (docs/06-design.md).
 */
const AXIS = { fontSize: 13, fill: 'var(--color-slate)' };
const number = new Intl.NumberFormat('ru-RU');

type Unit = 'rub' | 'count';
const formatValue = (unit: Unit, value: number) =>
  unit === 'rub' ? formatPrice(value) : number.format(value);
const formatTick = (unit: Unit, value: number) =>
  unit === 'rub' ? formatRubCompact(value) : number.format(value);

/** Горизонтальные столбцы: подписи — названия авиакомпаний или оценки. */
export function ValueBars({
  data,
  unit,
  name,
}: {
  data: Array<{ label: string; value: number }>;
  unit: Unit;
  /** Что за величина — для всплывающей подсказки. */
  name: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-line)" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS}
          tickFormatter={(value: number) => formatTick(unit, value)}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis type="category" dataKey="label" tick={AXIS} width={120} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--color-mist)' }}
          formatter={(value) => [formatValue(unit, Number(value)), name]}
        />
        <Bar dataKey="value" fill="var(--color-avocado)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Линия по месяцам: выручка или число билетов. */
export function MonthLine({
  data,
  unit,
  name,
}: {
  data: Array<{ label: string; value: number }>;
  unit: Unit;
  name: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} />
        <YAxis
          tick={AXIS}
          tickFormatter={(value: number) => formatTick(unit, value)}
          width={90}
          tickLine={false}
        />
        <Tooltip formatter={(value) => [formatValue(unit, Number(value)), name]} />
        <Line
          type="monotone"
          dataKey="value"
          name={name}
          stroke="var(--color-leaf)"
          strokeWidth={3}
          dot={{ r: 4, fill: 'var(--color-leaf)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
