/**
 * Значок RSS со ссылкой на ленту (замечание преподавателя по лабе 4: «чтобы получить
 * объединённые новости в RSS-формате, нужен значок RSS под объединёнными новостями»).
 * Значок — общепринятый оранжевый квадрат с дугами, нарисован здесь, без чужих файлов.
 */
export function RssLink({ href, children }: { href: string; children: string }) {
  return (
    <p>
      <a href={href} className="inline-flex items-center gap-2 font-semibold">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="shrink-0">
          <rect width="24" height="24" rx="5" fill="#F26522" />
          <circle cx="6.5" cy="17.5" r="2" fill="#fff" />
          <path
            d="M4.5 11a8.5 8.5 0 0 1 8.5 8.5M4.5 6A13.5 13.5 0 0 1 18 19.5"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
        {children}
      </a>
    </p>
  );
}
