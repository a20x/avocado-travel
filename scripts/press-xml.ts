import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parsePressFile, pressToXml } from '@/modules/press';
import pressFile from '../content/press/press-releases.json';

// Пресс-релизы в XML для вкладки «XML» (лаба 2): файл собирается из JSON, чтобы данные
// не расходились. Запуск — `pnpm press:xml` после правки press-releases.json;
// забыть нельзя — совпадение файлов проверяет тест src/modules/press/xml.test.ts.
const target = new URL('../content/press/press-releases.xml', import.meta.url);
writeFileSync(target, pressToXml(parsePressFile(pressFile)));
console.log(`Записан ${fileURLToPath(target)}`);
