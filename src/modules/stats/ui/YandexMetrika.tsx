import Script from 'next/script';

/**
 * Код Яндекс.Метрики (L1-S01) — стандартный фрагмент из кабинета Метрики.
 * Номер счётчика проверен при старте (только цифры), поэтому его можно вставить в код как есть.
 * Вебвизор не включаем: записывать действия посетителей учебному сайту незачем.
 */
export function YandexMetrika({ id }: { id: string }) {
  return (
    <Script id="yandex-metrika" strategy="afterInteractive">
      {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${id}, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });`}
    </Script>
  );
}
