import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type CardProps = HTMLAttributes<HTMLElement> & {
  /** Тег карточки: article — для самостоятельной записи (рейс, заказ), section — для блока страницы. */
  as?: 'div' | 'article' | 'section' | 'aside';
};

/** Белая карточка со скруглением и мягкой тенью — основной блок интерфейса. */
export function Card({ as: Tag = 'div', className, ...props }: CardProps) {
  return <Tag className={cn('rounded-md bg-white shadow-card', className)} {...props} />;
}
