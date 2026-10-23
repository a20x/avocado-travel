import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/config/site';

/**
 * robots.txt (L1-10): роботам открыт весь сайт, кроме закрытых и служебных адресов —
 * кабинета, брони, админки, API (кроме его документации) и перенаправлений рекламы.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/docs'],
      disallow: ['/admin', '/account', '/booking', '/api/', '/go/', '/dev/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
