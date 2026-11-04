import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/shared/ui/Card';
import { Table } from '@/shared/ui/Table';
import {
  PASSENGERS_PATH,
  passengerImageSrc,
  passengerPageHref,
  type PassengerBlock,
  type PassengerPage,
} from '../model';
import { PassengerDisclaimer } from './PassengerDisclaimer';

function Block({ block }: { block: PassengerBlock }) {
  switch (block.kind) {
    case 'text':
      return <p>{block.text}</p>;
    case 'tip':
      return (
        <p className="rounded-sm border-l-4 border-avocado bg-sage-light px-4 py-3">
          <strong>Обратите внимание. </strong>
          {block.text}
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`grid gap-1.5 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Tag>
      );
    }
    case 'table':
      return (
        <Table caption={block.caption}>
          <thead>
            <tr>
              {block.head.map((cell, index) => (
                <th key={index} scope="col">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join('|')}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    // Заголовок строки: как обычная ячейка, но жирным — общий стиль <th> рассчитан на шапку.
                    <th
                      key={index}
                      scope="row"
                      className="border-t border-line bg-white! text-base! font-semibold! whitespace-normal! text-graphite!"
                    >
                      {cell}
                    </th>
                  ) : (
                    <td key={index}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      );
  }
}

/**
 * Статическая страница раздела «Пассажирам»: заголовок с иллюстрацией, оглавление
 * со ссылками-якорями на разделы этой же страницы, разделы, «Читайте также» и пометка,
 * что правила выдуманы.
 */
export function PassengerArticle({
  page,
  related,
}: {
  page: PassengerPage;
  related: PassengerPage[];
}) {
  return (
    <div className="container-site grid gap-8 py-8">
      <nav aria-label="Путь к странице" className="text-sm">
        <Link href={PASSENGERS_PATH}>Пассажирам</Link>
        <span className="text-slate"> / {page.title}</span>
      </nav>

      <header className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="grid max-w-2xl gap-3">
          <h1 className="text-3xl">{page.title}</h1>
          <p className="text-lg text-slate">{page.lead}</p>
        </div>
        <Image
          src={passengerImageSrc(page.slug)}
          alt={page.imageAlt}
          width={224}
          height={168}
          className="hidden md:block"
        />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav
          id="contents"
          aria-labelledby="contents-title"
          className="scroll-mt-4 lg:sticky lg:top-4"
        >
          <Card className="p-4">
            <h2 id="contents-title" className="mb-2 text-sm font-semibold text-slate">
              На этой странице
            </h2>
            <ol className="grid gap-2">
              {page.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </Card>
        </nav>

        <div className="grid gap-6">
          {page.sections.map((section) => (
            <Card
              key={section.id}
              as="section"
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="grid scroll-mt-4 gap-4 p-5 target:ring-2 target:ring-sage md:p-6"
            >
              <h2 id={`${section.id}-title`} className="text-xl">
                {section.title}
              </h2>
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} />
              ))}
              <p className="text-sm">
                <a href="#contents">↑ К оглавлению страницы</a>
              </p>
            </Card>
          ))}

          {page.links ? (
            <p>
              <span className="text-slate">На сайте: </span>
              {page.links.map((link, index) => (
                <span key={link.href}>
                  {index > 0 ? ' · ' : null}
                  <Link href={link.href}>{link.label}</Link>
                </span>
              ))}
            </p>
          ) : null}

          {related.length > 0 ? (
            <section aria-labelledby="related-title" className="grid gap-3">
              <h2 id="related-title" className="text-xl">
                Читайте также
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Card className="grid h-full content-start gap-1 p-4">
                      <Link href={passengerPageHref(item.slug)} className="font-semibold">
                        {item.title}
                      </Link>
                      <span className="text-sm text-slate">{item.description}</span>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <PassengerDisclaimer />
    </div>
  );
}
