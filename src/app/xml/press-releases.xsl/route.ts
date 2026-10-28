import { handlePressXmlFile } from '@/modules/press/server';

// Преобразование XSL XML-файла пресс-релизов в HTML (лаба 2).
export function GET() {
  return handlePressXmlFile('xsl');
}
