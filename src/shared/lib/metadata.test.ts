import { describe, expect, it } from 'vitest';
import { OG_IMAGE, pageMetadata } from './metadata';

describe('pageMetadata', () => {
  it('повторяет заголовок и описание в Open Graph и добавляет общие поля', () => {
    const metadata = pageMetadata({ title: 'Справка', description: 'Ответы', path: '/help' });
    expect(metadata).toMatchObject({
      title: 'Справка',
      description: 'Ответы',
      openGraph: {
        title: 'Справка',
        description: 'Ответы',
        url: '/help',
        type: 'website',
        locale: 'ru_RU',
        siteName: 'Avocado Travel',
        images: [OG_IMAGE],
      },
    });
  });

  it('ключевые слова — только если переданы', () => {
    expect(pageMetadata({ title: 'А', description: 'Б', path: '/' }).keywords).toBeUndefined();
    expect(
      pageMetadata({ title: 'А', description: 'Б', path: '/', keywords: ['билеты'] }).keywords,
    ).toEqual(['билеты']);
  });
});
