import Link from 'next/link';
import { Card } from '@/shared/ui/Card';
import type { HelpQuestion, HelpSection } from '../model';

function Question({ item }: { item: HelpQuestion }) {
  return (
    // Вопрос, к которому перешли по якорю, подсвечивается (:target).
    <article
      id={item.id}
      aria-labelledby={`${item.id}-title`}
      className="-mx-3 grid scroll-mt-4 gap-2 rounded-sm px-3 py-2 target:bg-sage-light"
    >
      <h3 id={`${item.id}-title`} className="text-lg">
        {item.question}
      </h3>
      {item.answer.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {item.links ? (
        <p className="text-sm">
          <span className="text-slate">Смотрите также: </span>
          {item.links.map((link, index) => (
            <span key={link.href}>
              {index > 0 ? ', ' : null}
              <Link href={link.href}>{link.label}</Link>
            </span>
          ))}
        </p>
      ) : null}
    </article>
  );
}

/** Разделы справки с вопросами; у каждого раздела и вопроса свой якорь. */
export function HelpArticle({ sections }: { sections: HelpSection[] }) {
  return (
    <div className="grid gap-6">
      {sections.map((section) => (
        <Card
          key={section.id}
          as="section"
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="grid scroll-mt-4 gap-4 p-5 md:p-6"
        >
          <h2 id={`${section.id}-title`} className="text-xl">
            {section.title}
          </h2>
          {section.questions.map((item) => (
            <Question key={item.id} item={item} />
          ))}
          <p className="text-sm">
            <a href="#contents">↑ К оглавлению</a>
          </p>
        </Card>
      ))}
    </div>
  );
}
