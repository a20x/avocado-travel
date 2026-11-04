import { permanentRedirect } from 'next/navigation';
import { PRESS_CATEGORIES } from '@/modules/press';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Бывший «Пресс-центр» (Этап 12): те же пресс-релизы — на вкладке «XML», без дубля. Старые
 * ссылки и закладки ведут туда с той же категорией и автором; якорь релиза (`#pr-007`) браузер
 * переносит сам — открывается его строка в таблице.
 */
export default async function PressPage(props: PageProps<'/press'>) {
  const params = await props.searchParams;
  const target = new URLSearchParams();
  const category = first(params.category);
  if (category && Object.hasOwn(PRESS_CATEGORIES, category)) target.set('category', category);
  const author = first(params.author)?.trim();
  if (author && author.length <= 60) target.set('author', author);
  permanentRedirect(target.size > 0 ? `/xml?${target}` : '/xml');
}
