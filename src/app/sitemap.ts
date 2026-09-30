import type { MetadataRoute } from 'next';
import { guides, guidePath } from './guides/_lib/guides';

// 정적 빌드(output: 'export')를 위한 설정
export const dynamic = 'force-static';

/**
 * 네이버 SEO 최적화 - 정적 사이트맵 생성
 * https://searchadvisor.naver.com/guide/request-feed
 *
 * Next.js의 sitemap.ts 기능을 활용하여 /sitemap.xml 자동 생성
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://where-kindergarden.vercel.app';
  const currentDate = new Date();
  const guideUrls = [
    '/guides',
    '/guides/kindergarten-selection',
    ...guides.map((guide) => guidePath(guide.slug)),
  ];

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: currentDate,
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/test`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/guides/kindergarten-selection`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...guideUrls
      .filter((path) => path !== '/guides/kindergarten-selection')
      .map((path) => ({
        url: `${baseUrl}${path}`,
        lastModified: currentDate,
        changeFrequency: 'monthly' as const,
        priority: path === '/guides' ? 0.7 : 0.6,
      })),
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
