/**
 * Вход компонентов модуля catalog-data. Отдельно от `index.ts`, чтобы скрипты демо-данных,
 * drizzle-kit и тесты, которым нужны только таблицы и типы, не тянули за собой React и Next.js
 * (ADR-0008). Компоненты к базе не обращаются: данные получают в пропсах.
 */
export { AirlineForm, type AirlineFormValues } from './ui/AirlineForm';
export { AirlineLogo } from './ui/AirlineLogo';
export { CityCard } from './ui/CityCard';
export { CityForm, type CityFormValues } from './ui/CityForm';
export { AirlineTable, CityTable } from './ui/ReferenceTables';
