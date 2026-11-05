import { describe, expect, it } from 'vitest';
import { returnPath, withBack, withParams } from './return-path';

describe('возврат на страницу, откуда пришли', () => {
  it('принимает свои страницы с параметрами', () => {
    expect(returnPath('/database?report=input')).toBe('/database?report=input');
    expect(returnPath('/admin/cities')).toBe('/admin/cities');
  });

  it('не принимает чужой сайт и другие страницы', () => {
    for (const value of ['//evil.example', '/\\evil.example', 'https://evil.example', '/news']) {
      expect(returnPath(value)).toBeUndefined();
    }
    expect(returnPath(undefined)).toBeUndefined();
    expect(returnPath(['/admin'])).toBeUndefined();
    expect(returnPath(`/admin?x=${'a'.repeat(600)}`)).toBeUndefined();
  });

  it('убирает прошлые уведомления, чтобы они не показывались снова', () => {
    expect(returnPath('/database?report=input&saved=kazan&created=4')).toBe(
      '/database?report=input',
    );
  });

  it('цепочка: форма → список → вкладка БД', () => {
    const list = withBack('/admin/cities', '/database?report=input');
    const form = withBack('/admin/cities/new', list);
    const back = new URL(form, 'http://local').searchParams.get('back');
    expect(returnPath(back)).toBe(list);
    expect(new URL(list, 'http://local').searchParams.get('back')).toBe('/database?report=input');
  });

  it('без адреса возврата страница обычная; уведомление дополняет адрес', () => {
    expect(withBack('/admin/flights/new', undefined)).toBe('/admin/flights/new');
    expect(withParams('/database?report=input', { created: 4 })).toBe(
      '/database?report=input&created=4',
    );
  });
});
