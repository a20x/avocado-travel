import type { ReactNode } from 'react';
import { BackLink } from '@/shared/ui/BackLink';
import { Card } from '@/shared/ui/Card';

/** Общая рамка страниц входа и регистрации: над карточкой — «← Назад» на предыдущую страницу. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="container-site grid gap-4 py-8 md:py-12">
      <p className="mx-auto w-full max-w-md">
        <BackLink />
      </p>
      <Card className="mx-auto grid w-full max-w-md gap-6 p-6 md:p-8">
        <h1 className="text-2xl">{title}</h1>
        {children}
      </Card>
    </div>
  );
}
