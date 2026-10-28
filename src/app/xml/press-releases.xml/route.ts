import { handlePressXmlFile } from '@/modules/press/server';

// Исходные данные вкладки «XML» (лаба 2): XML-файл пресс-релизов.
export function GET() {
  return handlePressXmlFile('xml');
}
