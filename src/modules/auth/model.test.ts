import { describe, expect, it } from 'vitest';
import {
  afterSignIn,
  explicitReturnPath,
  homeFor,
  isRole,
  safeReturnPath,
  signInSchema,
  signUpSchema,
} from './model';

describe('адрес возврата после входа', () => {
  it('пропускает внутренние пути вместе с параметрами', () => {
    expect(safeReturnPath('/booking?flight=1&seats=7D')).toBe('/booking?flight=1&seats=7D');
    expect(safeReturnPath('/admin')).toBe('/admin');
  });

  it('не уводит на чужой сайт', () => {
    expect(safeReturnPath('https://evil.example')).toBe('/account');
    expect(safeReturnPath('//evil.example')).toBe('/account');
    expect(safeReturnPath('/\\evil.example')).toBe('/account');
    expect(safeReturnPath(undefined)).toBe('/account');
    expect(safeReturnPath(['/a', '/b'])).toBe('/account');
  });
});

describe('куда вести после входа', () => {
  it('без адреса возврата — в раздел пользователя: администратора в админку', () => {
    expect(homeFor('admin')).toBe('/admin');
    expect(homeFor('customer')).toBe('/account');
    expect(afterSignIn(undefined, 'admin')).toBe('/admin');
    expect(afterSignIn(null, 'customer')).toBe('/account');
  });

  it('явный адрес возврата важнее роли: администратор возвращается, откуда пришёл', () => {
    expect(afterSignIn('/rss', 'admin')).toBe('/rss');
    expect(afterSignIn('/booking?flight=1', 'customer')).toBe('/booking?flight=1');
  });

  it('чужой сайт в адресе возврата не считается адресом', () => {
    expect(explicitReturnPath('//evil.example')).toBeNull();
    expect(afterSignIn('https://evil.example', 'admin')).toBe('/admin');
  });
});

describe('формы входа и регистрации', () => {
  it('приводит почту к нижнему регистру и убирает пробелы', () => {
    const parsed = signInSchema.parse({ email: '  Anna@Example.RU ', password: 'x' });
    expect(parsed.email).toBe('anna@example.ru');
  });

  it('требует имя от 2 символов и пароль от 8', () => {
    const result = signUpSchema.safeParse({ name: 'А', email: 'a@b.ru', password: '1234567' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(['name', 'password']);
  });

  it('знает только свои роли', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('root')).toBe(false);
  });
});
