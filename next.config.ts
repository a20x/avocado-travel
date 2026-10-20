import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Заголовок X-Powered-By сообщает всем, на чём сделан сайт, — лишняя подсказка атакующему.
  poweredByHeader: false,
  // Не создавать AGENTS.md: правила для ИИ-ассистента живут в CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
