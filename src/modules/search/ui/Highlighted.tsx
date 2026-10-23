import { splitHighlights } from '../model';

/** Текст с отмеченными найденными словами. Всё выводится как текст — без вставки HTML. */
export function Highlighted({ text }: { text: string }) {
  return (
    <>
      {splitHighlights(text).map((part, i) =>
        part.mark ? (
          <mark key={i} className="rounded-xs bg-sage-light px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
