import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateInZone,
  daysBetween,
  timeInZone,
  utcOffsetLabel,
  zonedDayRange,
  zonedTimeToUtc,
} from './time';

describe('местное время городов', () => {
  it('переводит местное время в UTC с учётом пояса', () => {
    expect(zonedTimeToUtc('2026-11-14', '08:40', 'Europe/Moscow').toISOString()).toBe(
      '2026-11-14T05:40:00.000Z',
    );
    expect(zonedTimeToUtc('2026-11-14', '09:05', 'Europe/Kaliningrad').toISOString()).toBe(
      '2026-11-14T07:05:00.000Z',
    );
    // Полночь во Владивостоке (UTC+10) — это ещё вчерашний день по UTC.
    expect(zonedTimeToUtc('2026-11-14', '00:00', 'Asia/Vladivostok').toISOString()).toBe(
      '2026-11-13T14:00:00.000Z',
    );
  });

  it('учитывает переход на летнее время там, где он есть', () => {
    // В Нью-Йорке летом UTC−4, зимой UTC−5.
    expect(zonedTimeToUtc('2026-07-01', '12:00', 'America/New_York').toISOString()).toBe(
      '2026-07-01T16:00:00.000Z',
    );
    expect(zonedTimeToUtc('2026-12-01', '12:00', 'America/New_York').toISOString()).toBe(
      '2026-12-01T17:00:00.000Z',
    );
  });

  it('определяет местную дату и время', () => {
    const at = new Date('2026-11-13T22:30:00Z');
    expect(dateInZone(at, 'Europe/Moscow')).toBe('2026-11-14');
    expect(dateInZone(at, 'Europe/Kaliningrad')).toBe('2026-11-14');
    expect(timeInZone(at, 'Europe/Moscow')).toBe('01:30');
  });

  it('сутки в городе — промежуток от местной полуночи до следующей', () => {
    const { start, end } = zonedDayRange('2026-11-14', 'Europe/Moscow');
    expect(start.toISOString()).toBe('2026-11-13T21:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-14T21:00:00.000Z');
  });

  it('считает даты через границы месяца и года', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-14', '2027-01-13')).toBe(60);
  });

  it('отвергает неверный формат', () => {
    expect(() => addDays('14.11.2026', 1)).toThrow();
    expect(() => zonedTimeToUtc('2026-11-14', '8:40', 'Europe/Moscow')).toThrow();
  });

  it('подписывает смещение пояса от UTC', () => {
    const winter = new Date('2026-12-01T12:00:00Z');
    expect(utcOffsetLabel('Europe/Moscow', winter)).toBe('UTC+3');
    expect(utcOffsetLabel('Asia/Vladivostok', winter)).toBe('UTC+10');
    expect(utcOffsetLabel('Asia/Kolkata', winter)).toBe('UTC+5:30');
    expect(utcOffsetLabel('UTC', winter)).toBe('UTC');
    expect(utcOffsetLabel('America/New_York', winter)).toBe('UTC−5');
  });
});
