'use client';

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Polyline } from 'leaflet';
import { useEffect, useRef } from 'react';
import { searchUrl } from '@/modules/flights';
import type { MapCity, RouteMapData } from '../model';

type RouteMapProps = {
  data: RouteMapData;
  /** Дата для ссылок на поиск — считается на сервере, чтобы не зависеть от часов браузера. */
  searchDate: string;
};

// Цвета токенов avocado и leaf (docs/06-design.md): в атрибуты SVG, которые ставит Leaflet,
// переменные CSS не подставляются, поэтому значения записаны как есть.
const LINE = { color: '#7fa54a', weight: 1.5, opacity: 0.55 };
const LINE_ACTIVE = { color: '#3f6420', weight: 3, opacity: 0.95 };

/**
 * Карта маршрутов (L1-S08): города сети и линии перелётов поверх OpenStreetMap.
 * Щелчок по городу подсвечивает его маршруты и показывает, куда оттуда летают, —
 * каждый город в списке ведёт на поиск рейсов. Leaflet работает только в браузере,
 * поэтому загружается внутри эффекта.
 */
export function RouteMap({ data, searchDate }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;

    void import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false, minZoom: 2, maxZoom: 9 });
      // Ссылка на Leaflet остаётся в подписи карты — простым текстом, без значка по умолчанию.
      map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>',
      }).addTo(map);

      const at = new Map(data.cities.map((city) => [city.slug, L.latLng(city.lat, city.lon)]));
      const lines: Array<{ a: string; b: string; line: Polyline }> = [];
      for (const { a, b } of data.links) {
        const from = at.get(a);
        const to = at.get(b);
        if (from && to) lines.push({ a, b, line: L.polyline([from, to], LINE).addTo(map) });
      }

      const highlight = (slug: string | null) => {
        for (const { a, b, line } of lines) {
          const active = slug !== null && (a === slug || b === slug);
          line.setStyle(active ? LINE_ACTIVE : LINE);
          if (active) line.bringToFront();
        }
      };

      // Содержимое всплывающего окна собирается через DOM, а не строкой HTML.
      const popup = (city: MapCity) => {
        const root = document.createElement('div');
        const title = document.createElement('p');
        title.className = 'font-semibold text-base';
        title.textContent = `Из города ${city.name}`;
        const list = document.createElement('ul');
        list.className = 'mt-1 grid max-h-48 gap-0.5 overflow-y-auto';
        for (const destination of data.destinations[city.slug] ?? []) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = searchUrl({ from: city.slug, to: destination.slug, date: searchDate });
          link.textContent = destination.name;
          item.append(link);
          list.append(item);
        }
        root.append(title, list);
        return root;
      };

      for (const city of data.cities) {
        L.marker([city.lat, city.lon], {
          title: city.name,
          keyboard: true,
          riseOnHover: true,
          icon: L.divIcon({
            className: 'rounded-full border-2 border-white bg-leaf shadow-card',
            iconSize: [16, 16],
          }),
        })
          .bindPopup(() => popup(city))
          .on('popupopen', () => highlight(city.slug))
          .on('popupclose', () => highlight(null))
          .addTo(map);
      }

      map.fitBounds(L.latLngBounds([...at.values()]), { padding: [24, 24] });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [data, searchDate]);

  return (
    // isolate — слои Leaflet со своими z-index не перекрывают меню сайта.
    // Подпись не нужна: карта стоит внутри раздела с заголовком «Карта маршрутов».
    <div
      ref={container}
      className="isolate h-96 w-full overflow-hidden rounded-md bg-sky shadow-card md:h-[32rem]"
    />
  );
}
