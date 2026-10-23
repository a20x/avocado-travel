import { Card } from '@/shared/ui/Card';
import type { HelpSection } from '../model';

/**
 * Оглавление справки: ссылки-якоря на разделы и вопросы этой же страницы (L1-06).
 * У оглавления свой якорь `#contents` — к нему ведут ссылки «К оглавлению».
 */
export function HelpContents({ sections }: { sections: HelpSection[] }) {
  return (
    <nav id="contents" aria-labelledby="contents-title" className="scroll-mt-4 lg:sticky lg:top-4">
      <Card className="p-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        <h2 id="contents-title" className="mb-2 text-sm font-semibold text-slate">
          Оглавление
        </h2>
        <ol className="grid gap-3">
          {sections.map((section) => (
            <li key={section.id} className="grid gap-1">
              <a href={`#${section.id}`} className="font-semibold">
                {section.title}
              </a>
              <ul className="grid gap-1 border-l-2 border-line pl-3 text-sm">
                {section.questions.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.question}</a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Card>
    </nav>
  );
}
