import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import boundaries from 'eslint-plugin-boundaries';

const app = { element: { type: 'app' } };
const shared = { element: { type: 'shared' } };
const server = { element: { type: 'server' } };
const anyModule = { element: { type: 'module' } };
// Чужой модуль виден только через свои входы: index.ts (общее) и server.ts (только сервер), ADR-0008.
const modulePublicApi = { element: { type: 'module', fileInternalPath: '{index,server,ui}.ts' } };

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Границы архитектуры из docs/03-architecture.md.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'module', pattern: 'src/modules/*', capture: ['name'] },
        { type: 'shared', pattern: 'src/shared' },
        { type: 'server', pattern: 'src/server' },
      ],
    },
    rules: {
      // Импорты внутри одного элемента (например, внутри модуля) не проверяются — там можно всё.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: app, allow: { to: [modulePublicApi, shared] } },
            { from: anyModule, allow: { to: [modulePublicApi, shared, server] } },
            { from: server, allow: { to: shared } },
            { from: shared, allow: { to: shared } },
          ],
        },
      ],
    },
  },

  // Последним: отключает правила оформления, которые решает Prettier.
  prettier,

  // docs/design — статические макеты дизайн-концепции, не код сайта.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'docs/design/**']),
]);
