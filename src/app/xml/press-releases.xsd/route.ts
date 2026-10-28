import { handlePressXmlFile } from '@/modules/press/server';

// Схема XSD XML-файла пресс-релизов (лаба 2).
export function GET() {
  return handlePressXmlFile('xsd');
}
