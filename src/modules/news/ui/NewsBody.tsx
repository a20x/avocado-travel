import { splitParagraphs } from '../model';

/**
 * Текст новости по абзацам. Текст выводится как текст, без HTML: React экранирует его,
 * поэтому санитайзер не нужен (docs/03-architecture.md, «Безопасность»).
 */
export function NewsBody({ body }: { body: string }) {
  return (
    <div className="grid max-w-3xl gap-4 text-lg leading-relaxed">
      {splitParagraphs(body).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}
