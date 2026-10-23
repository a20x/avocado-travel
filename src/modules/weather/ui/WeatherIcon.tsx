import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { WeatherKind } from '../model';

const SUN = (
  <g className="text-warning" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.2" fill="currentColor" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
      <line key={angle} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${angle} 12 12)`} />
    ))}
  </g>
);

const CLOUD = 'M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.6 4.5 4.5 0 0 0 7 18.5z';

function Cloud({ small = false }: { small?: boolean }) {
  return (
    <path
      d={CLOUD}
      transform={small ? 'translate(4 2) scale(0.8)' : 'translate(0 -2)'}
      className="text-slate"
      fill="var(--color-white)"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  );
}

const DROPS = (
  <g className="text-leaf" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="8" y1="19" x2="7" y2="22" />
    <line x1="12" y1="19" x2="11" y2="22" />
    <line x1="16" y1="19" x2="15" y2="22" />
  </g>
);

const FLAKES = (
  <g className="text-slate" fill="currentColor">
    <circle cx="8" cy="20.5" r="1.1" />
    <circle cx="12" cy="21.5" r="1.1" />
    <circle cx="16" cy="20.5" r="1.1" />
  </g>
);

const ICONS: Record<WeatherKind, ReactNode> = {
  clear: SUN,
  partly: (
    <>
      <g transform="translate(-3 -3) scale(0.85)">{SUN}</g>
      <Cloud small />
    </>
  ),
  cloudy: <Cloud />,
  fog: (
    <g className="text-slate" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="6" y1="13" x2="18" y2="13" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </g>
  ),
  rain: (
    <>
      <Cloud />
      {DROPS}
    </>
  ),
  snow: (
    <>
      <Cloud />
      {FLAKES}
    </>
  ),
  storm: (
    <>
      <Cloud />
      <path
        d="M12.5 15.5l-2.5 4h3l-2 3.5"
        className="text-warning"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

/** Значок погоды. Описание словами всегда рядом, поэтому значок скрыт от экранного диктора. */
export function WeatherIcon({ kind, className }: { kind: WeatherKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-10 shrink-0', className)}>
      {ICONS[kind]}
    </svg>
  );
}
