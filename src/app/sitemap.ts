import type { MetadataRoute } from 'next';
import { getReviewLinkPageCount } from '@/lib/review-link-index';

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
  const reviewPageCount = getReviewLinkPageCount();

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
      url: `${baseUrl}/reviews`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reviews/all`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    ...Array.from({ length: Math.max(0, reviewPageCount - 1) }, (_, index) => ({
      url: `${baseUrl}/reviews/all/page/${index + 2}`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 0.65,
    })),
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
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
