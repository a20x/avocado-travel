import { Card } from '@/shared/ui/Card';
import { hostOf, type CatalogNode } from '../model';

function LinkList({ node }: { node: CatalogNode }) {
  if (node.links.length === 0) return null;
  return (
    <ul className="grid gap-3">
      {node.links.map((link) => (
        <li key={link.id} className="grid gap-0.5">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold">
            {link.title}
            <span className="sr-only"> (откроется в новой вкладке)</span>
          </a>
          {link.description ? <span className="text-sm">{link.description}</span> : null}
          <span className="text-xs text-slate">{hostOf(link.url)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Подраздел с заголовком на уровень ниже родителя. */
function Subsection({ node, level }: { node: CatalogNode; level: 3 | 4 }) {
  const Heading = level === 3 ? 'h3' : 'h4';
  return (
    <section
      aria-labelledby={`catalog-${node.id}`}
      className="grid gap-3 border-l-2 border-line pl-4"
    >
      <Heading id={`catalog-${node.id}`} className="text-lg">
        {node.title}
      </Heading>
      <LinkList node={node} />
      {node.children.map((child) => (
        <Subsection key={child.id} node={child} level={4} />
      ))}
    </section>
  );
}

/**
 * Каталог ресурсов для посетителей (L1-07, L1-S11): оглавление со ссылками-якорями
 * и разделы с подразделами. Внешние ссылки открываются в новой вкладке.
 */
export function LinksCatalog({ tree }: { tree: CatalogNode[] }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Разделы каталога" className="lg:sticky lg:top-4">
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate">Разделы</h2>
          <ul className="grid gap-1">
            {tree.map((node) => (
              <li key={node.id}>
                <a href={`#catalog-${node.id}`}>{node.title}</a>
              </li>
            ))}
          </ul>
        </Card>
      </nav>
      <div className="grid gap-6">
        {tree.map((node) => (
          <Card
            key={node.id}
            as="section"
            aria-labelledby={`catalog-${node.id}`}
            className="grid scroll-mt-4 gap-4 p-5 md:p-6"
          >
            <h2 id={`catalog-${node.id}`} className="text-xl">
              {node.title}
            </h2>
            <LinkList node={node} />
            {node.children.map((child) => (
              <Subsection key={child.id} node={child} level={3} />
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
