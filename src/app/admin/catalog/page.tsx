import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { countLinks, flattenSections } from '@/modules/catalog';
import { getCatalogForAdmin } from '@/modules/catalog/server';
import { AddLinkForm, AddSectionForm, AdminTree } from '@/modules/catalog/ui';

export const metadata: Metadata = { title: 'Каталог ресурсов', robots: { index: false } };

export default async function AdminCatalogPage() {
  await requireAdmin('/admin/catalog');
  const tree = await getCatalogForAdmin();
  const sections = flattenSections(tree);

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <header className="grid gap-1">
        <h1 className="text-3xl">Каталог ресурсов</h1>
        <p className="text-slate">
          {sections.length} разделов, {countLinks(tree)} ссылок. Скрытый раздел не виден посетителям
          вместе со всем содержимым. Посмотреть, как видят посетители, —{' '}
          <Link href="/links">«Полезные ссылки»</Link>.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="tree-title" className="grid gap-3">
          <h2 id="tree-title" className="sr-only">
            Разделы и ссылки
          </h2>
          <AdminTree tree={tree} />
        </section>
        <div className="grid gap-6 lg:sticky lg:top-4">
          <AddSectionForm sections={sections} />
          <AddLinkForm sections={sections} />
        </div>
      </div>
    </div>
  );
}
