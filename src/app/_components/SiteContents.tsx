import Link from 'next/link';
import { SITE_CONTENTS } from '@/shared/config/navigation';

/** Содержание сайта на главной (L1-08): все разделы по группам, с короткими описаниями. */
export function SiteContents() {
  return (
    <nav aria-labelledby="site-contents-title" className="grid gap-5">
      <h2 id="site-contents-title" className="text-2xl">
        Содержание сайта
      </h2>
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {SITE_CONTENTS.map((group, index) => (
          <section
            key={group.title}
            aria-labelledby={`site-contents-${index}`}
            className="grid content-start gap-3"
          >
            <h3
              id={`site-contents-${index}`}
              className="text-sm font-semibold tracking-wide text-slate uppercase"
            >
              {group.title}
            </h3>
            <ul className="grid gap-3">
              {group.items.map((item) => (
                <li key={item.href} className="grid gap-0.5">
                  <Link href={item.href} className="font-semibold">
                    {item.label}
                  </Link>
                  <span className="text-sm text-slate">{item.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
