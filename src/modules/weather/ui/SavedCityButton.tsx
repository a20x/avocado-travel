import { ActionForm } from '@/shared/ui/ActionForm';
import { Button } from '@/shared/ui/Button';
import { forgetCityAction, saveCityAction } from '../server/actions';

/**
 * Отметить город или снять отметку. Обычная форма: работает и без JavaScript,
 * а `permalink` — адрес страницы, на которую форма вернётся.
 */
export function SavedCityButton({
  cityId,
  cityName,
  saved,
  permalink,
}: {
  cityId: number;
  cityName: string;
  saved: boolean;
  permalink: string;
}) {
  const label = saved ? 'Убрать из моих городов' : 'В мои города';
  return (
    <ActionForm
      action={saved ? forgetCityAction : saveCityAction}
      permalink={permalink}
      className="grid justify-items-end gap-1"
    >
      <input type="hidden" name="city" value={cityId} />
      {/* Для скринридера — с названием города: «В мои города: Париж». */}
      <Button
        type="submit"
        variant={saved ? 'ghost' : 'secondary'}
        aria-label={`${label}: ${cityName}`}
      >
        <span aria-hidden="true">{saved ? '★' : '☆'}</span>
        {label}
      </Button>
    </ActionForm>
  );
}
