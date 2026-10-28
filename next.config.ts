import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Для Docker: сборка кладёт в .next/standalone сервер и только нужные ему пакеты (docs/09-deploy.md).
  output: 'standalone',
  // Файлы лабы 2 сервер читает с диска (src/modules/press/server/xml.ts) — их нужно положить
  // в сборку явно: по коду Next.js не видит, что они нужны.
  outputFileTracingIncludes: {
    '/xml': ['./content/press/press-releases.{xml,xsd,xsl}'],
    '/xml/**': ['./content/press/press-releases.{xml,xsd,xsl}'],
  },
  // Заголовок X-Powered-By сообщает всем, на чём сделан сайт, — лишняя подсказка атакующему.
  poweredByHeader: false,
  // Не создавать AGENTS.md: правила для ИИ-ассистента живут в CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
