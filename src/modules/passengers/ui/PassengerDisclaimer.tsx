import { PASSENGER_DISCLAIMER } from '../model';

/** Пометка внизу каждой страницы раздела: компания и правила выдуманы. */
export function PassengerDisclaimer() {
  return (
    <p className="max-w-3xl border-t border-line pt-4 text-sm text-slate">{PASSENGER_DISCLAIMER}</p>
  );
}
