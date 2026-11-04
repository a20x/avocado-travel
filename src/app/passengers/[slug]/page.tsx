import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PASSENGER_PAGES, findPassengerPage, passengerPageHref } from '@/modules/passengers';
import { PassengerArticle } from '@/modules/passengers/ui';
import { pageMetadata } from '@/shared/lib/metadata';

// Страниц ровно столько, сколько в content.ts модуля: другой адрес — 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return PASSENGER_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata(props: PageProps<'/passengers/[slug]'>): Promise<Metadata> {
  const page = findPassengerPage(PASSENGER_PAGES, (await props.params).slug);
  if (!page) return {};
  return pageMetadata({
    title: page.title,
    description: page.description,
    path: passengerPageHref(page.slug),
  });
}

export default async function PassengerPage(props: PageProps<'/passengers/[slug]'>) {
  const page = findPassengerPage(PASSENGER_PAGES, (await props.params).slug);
  if (!page) notFound();
  const related = page.related.flatMap((slug) => findPassengerPage(PASSENGER_PAGES, slug) ?? []);
  return <PassengerArticle page={page} related={related} />;
}
