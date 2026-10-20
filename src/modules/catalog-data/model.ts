import type { aircraftModels, airlines, airports } from './schema';

// Типы выводятся из таблиц Drizzle, а не пишутся руками второй раз (docs/03-architecture.md).
export type Airport = typeof airports.$inferSelect;
export type Airline = typeof airlines.$inferSelect;
export type AircraftModel = typeof aircraftModels.$inferSelect;
