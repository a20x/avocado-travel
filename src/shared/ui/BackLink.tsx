'use client';

// Клиентский компонент: предыдущую страницу знает только браузер.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type MouseEvent } from 'react';

/**
 * Предыдущая страница этого сайта. При переходах внутри сайта Next.js не перезагружает страницу
 * и не меняет `document.referrer`, поэтому адреса запоминает `NavigationHistory` в общем макете.
 * Хранится в памяти вкладки: после перезагрузки страницы предыдущей нет.
 */
let currentPath: string | null = null;
let previousPath: string | null = null;

/** Запоминает адрес каждой открытой страницы. Ставится один раз — в корневой макет. */
export function NavigationHistory() {
  const pathname = usePathname();
  useEffect(() => {
    const path = `${window.location.pathname}${window.location.search}`;
    if (path !== currentPath) {
      previousPath = currentPath;
      currentPath = path;
    }
  }, [pathname]);
  return null;
}

/**
 * «← Назад» — на предыдущую страницу этого сайта. Если её нет (страницу открыли по прямой
 * ссылке или пришли с другого сайта) или без JavaScript — на `fallback`, по умолчанию главную.
 * Нужна там, где обычная ссылка назад не годится: на вход приходят с разных страниц.
 */
export function BackLink({
  fallback = '/',
  label = 'Назад',
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Щелчок с Ctrl или Cmd — открыть в новой вкладке, как обычную ссылку.
    if (event.metaKey || event.ctrlKey || event.shiftKey || !previousPath) return;
    event.preventDefault();
    router.push(previousPath);
  };
  return (
    <Link href={fallback} onClick={onClick}>
      ← {label}
    </Link>
  );
}
