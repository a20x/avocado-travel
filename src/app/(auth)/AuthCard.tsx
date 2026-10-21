import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';

/** Общая рамка страниц входа и регистрации. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="container-site py-10 md:py-16">
      <Card className="mx-auto grid max-w-md gap-6 p-6 md:p-8">
        <h1 className="text-2xl">{title}</h1>
        {children}
      </Card>
    </div>
  );
}
