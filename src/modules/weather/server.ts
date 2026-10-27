/**
 * Серверный вход модуля weather (ADR-0008).
 */
import 'server-only';

export { findCities, getCity, getSavedCities, getWeather } from './server/service';
