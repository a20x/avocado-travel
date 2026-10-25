import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Для Docker: сборка кладёт в .next/standalone сервер и только нужные ему пакеты (docs/09-deploy.md).
  output: 'standalone',
  // Заголовок X-Powered-By сообщает всем, на чём сделан сайт, — лишняя подсказка атакующему.
  poweredByHeader: false,
  // Не создавать AGENTS.md: правила для ИИ-ассистента живут в CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
