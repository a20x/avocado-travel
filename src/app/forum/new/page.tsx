import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/modules/auth/server';
import { TopicForm } from '@/modules/forum/ui';

export const metadata: Metadata = { title: 'Новая тема', robots: { index: false } };

export default async function NewTopicPage() {
  await requireUser('/forum/new');

  return (
    <div className="container-site grid max-w-3xl gap-6 py-8">
      <p>
        <Link href="/forum">← Все темы</Link>
      </p>
      <h1 className="text-3xl">Новая тема</h1>
      <TopicForm />
    </div>
  );
}
