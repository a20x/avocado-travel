import { cn } from '@/shared/lib/cn';

/** Звезда; `fill` от 0 до 1 — какая часть закрашена слева направо. */
export function Star({ fill = 1, className }: { fill?: number; className?: string }) {
  const path = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
  return (
    <span aria-hidden="true" className={cn('relative inline-block size-6', className)}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full text-line-strong">
        <path d={path} fill="currentColor" />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg viewBox="0 0 24 24" className="h-full w-auto max-w-none text-pit">
          <path d={path} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}
