'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPrice } from '@/shared/lib/format';
import { formatRubCompact, type MonthRevenue, type Share } from '../model';

/**
 * Графики отчётов (L3-03) на Recharts. Рисуются в браузере: серверный родитель передаёт
 * готовые данные, а таблица с теми же цифрами лежит рядом для тех, кто графики не видит.
 * Цвета — токены дизайна (docs/06-design.md).
 */
const COLORS = [
  'var(--color-leaf)',
  'var(--color-pit)',
  'var(--color-avocado)',
  'var(--color-slate)',
];
const AXIS = { fontSize: 13, fill: 'var(--color-slate)' };
const number = new Intl.NumberFormat('ru-RU');

export function RevenueLineChart({ data }: { data: MonthRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="short" tick={AXIS} tickLine={false} />
        <YAxis tick={AXIS} tickFormatter={formatRubCompact} width={90} tickLine={false} />
        <Tooltip
          formatter={(value) => [formatPrice(Number(value)), 'Выручка']}
          labelFormatter={(_, payload) => payload[0]?.payload.label ?? ''}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Выручка"
          stroke="var(--color-leaf)"
          strokeWidth={3}
          dot={{ r: 4, fill: 'var(--color-leaf)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Горизонтальные столбцы: подписи длинные (города, модели самолётов) — так они читаются. */
export function HorizontalBars({
  data,
  unit,
}: {
  data: Array<{ label: string; value: number }>;
  unit: 'tickets' | 'percent';
}) {
  const format = (value: number) =>
    unit === 'percent' ? `${value.toLocaleString('ru-RU')}%` : number.format(value);
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-line)" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickFormatter={format} tickLine={false} />
        <YAxis type="category" dataKey="label" tick={AXIS} width={150} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--color-mist)' }}
          formatter={(value) => [
            format(Number(value)),
            unit === 'percent' ? 'Заполняемость' : 'Билетов',
          ]}
        />
        <Bar dataKey="value" fill="var(--color-avocado)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Круговая диаграмма долей с процентами в легенде. */
export function SharePie({ data }: { data: Share[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="45%"
          outerRadius="80%"
          paddingAngle={1}
        >
          {data.map((share, index) => (
            <Cell key={share.key} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [number.format(Number(value)), name]} />
        {/* Проценты — в легенде: подписи вокруг круга на узком экране обрезаются. */}
        <Legend
          formatter={(_, entry) => {
            const share = entry.payload as Share | undefined;
            return share ? `${share.label} — ${share.percent.toLocaleString('ru-RU')}%` : '';
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
