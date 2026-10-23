import { ActionForm } from '@/shared/ui/ActionForm';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { cn } from '@/shared/lib/cn';
import { countLinks, hostOf, type CatalogLink, type CatalogNode } from '../model';
import { deleteAction, hideAction, showAction } from '../server/actions';

const PATH = '/admin/catalog';

/** «Скрыть» / «Показать» и «Удалить» для раздела или ссылки. */
function Actions({
  kind,
  item,
  title,
  deleteText,
}: {
  kind: 'section' | 'link';
  item: { id: number; isVisible: boolean };
  title: string;
  deleteText: string;
}) {
  const noun = kind === 'section' ? 'раздел' : 'ссылку';
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ActionForm action={item.isVisible ? hideAction : showAction} permalink={PATH}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={item.id} />
        <Button type="submit" variant="ghost">
          {item.isVisible ? 'Скрыть' : 'Показать'}
          <span className="sr-only">
            {' '}
            {noun} «{title}»
          </span>
        </Button>
      </ActionForm>
      <ConfirmButton
        label="Удалить"
        title={kind === 'section' ? 'Удалить раздел?' : 'Удалить ссылку?'}
        text={deleteText}
        confirmLabel="Удалить"
        action={deleteAction}
        permalink={PATH}
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={item.id} />
      </ConfirmButton>
    </div>
  );
}

function LinkRow({ link }: { link: CatalogLink }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
      <div className={cn('min-w-0', !link.isVisible && 'opacity-60')}>
        <span className="font-semibold">{link.title}</span>{' '}
        <span className="text-sm text-slate">{hostOf(link.url)}</span>{' '}
        {link.isVisible ? null : <Badge tone="muted">скрыта</Badge>}
      </div>
      <Actions
        kind="link"
        item={link}
        title={link.title}
        deleteText={`Ссылка «${link.title}» будет удалена насовсем.`}
      />
    </li>
  );
}

function SectionBlock({ node, hiddenByParent }: { node: CatalogNode; hiddenByParent: boolean }) {
  const linksInside = countLinks([node]);
  return (
    <li className="grid gap-2 rounded-sm border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className={cn(!node.isVisible && 'opacity-60')}>
          <span className="text-lg font-semibold">{node.title}</span>{' '}
          {node.isVisible ? null : <Badge tone="muted">скрыт вместе с содержимым</Badge>}
          {node.isVisible && hiddenByParent ? <Badge tone="muted">скрыт родителем</Badge> : null}
        </div>
        <Actions
          kind="section"
          item={node}
          title={node.title}
          deleteText={`Раздел «${node.title}» будет удалён насовсем вместе с подразделами и ссылками (${linksInside}).`}
        />
      </div>
      {node.links.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {node.links.map((link) => (
            <LinkRow key={link.id} link={link} />
          ))}
        </ul>
      ) : null}
      {node.children.length > 0 ? (
        <ul className="grid gap-3 pl-4">
          {node.children.map((child) => (
            <SectionBlock
              key={child.id}
              node={child}
              hiddenByParent={hiddenByParent || !node.isVisible}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Весь каталог для администратора — со скрытым и с командами (L1-S11). */
export function AdminTree({ tree }: { tree: CatalogNode[] }) {
  return (
    <ul className="grid gap-4">
      {tree.map((node) => (
        <SectionBlock key={node.id} node={node} hiddenByParent={false} />
      ))}
    </ul>
  );
}
