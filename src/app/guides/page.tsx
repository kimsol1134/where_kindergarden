import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/common/BrandMark';
import { Footer } from '@/components/landing/Footer';
import { guides, guidePath } from './_lib/guides';

const featuredGuide = {
  slug: 'kindergarten-selection',
  title: '유치원 고르는 법: 선택 기준 7가지와 상담 질문 체크리스트',
  description:
    '처음 유치원을 알아보는 부모 입장에서 거리, 통학버스, 정원, 교사 비율, 급식, 방과후, 후기와 상담 질문을 어떤 순서로 확인하면 좋은지 정리했습니다.',
  category: '유치원 입학 준비',
  image: '/images/guides/kindergarten-selection-map.jpg',
  alt: '우리동네 지도 위에서 주변 유치원 후보를 비교하는 이미지',
};

const guideCards = [
  featuredGuide,
  ...guides.map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    description: guide.description,
    category: guide.category,
    image: guide.heroImage,
    alt: guide.heroAlt,
  })),
];

const readingRoutes = [
  {
    label: '어린이집과 유치원 중 고민 중',
    href: '/guides/daycare-vs-kindergarten',
    detail: '맞벌이, 아이 나이, 돌봄 시간 기준으로 먼저 비교하세요.',
  },
  {
    label: '국공립과 사립 중 고민 중',
    href: '/guides/public-vs-private-kindergarten',
    detail: '비용뿐 아니라 방과후, 통학, 모집 가능성을 같이 봅니다.',
  },
  {
    label: '모집철 준비가 막막함',
    href: '/guides/kindergarten-admission-prep',
    detail: '일정 전에 후보와 상담 질문을 먼저 정리하세요.',
  },
  {
    label: '통학버스가 꼭 필요함',
    href: '/guides/kindergarten-bus-route',
    detail: '버스 여부보다 정류장, 하원 시간, 방과후 버스를 확인하세요.',
  },
];

export const metadata: Metadata = {
  title: '유치원 고르는 법과 입학 준비 가이드 모음',
  description:
    '어린이집과 유치원 차이, 국공립·사립 비교, 유치원 입학 준비, 통학버스 확인법까지 부모 입장에서 정리한 가이드 모음입니다.',
  alternates: {
    canonical: '/guides',
  },
  openGraph: {
    title: '유치원 고르는 법과 입학 준비 가이드 모음',
    description:
      '처음 유치원을 알아보는 부모를 위해 실제 비교 순서와 상담 질문을 정리했습니다.',
    url: '/guides',
    images: [
      {
        url: featuredGuide.image,
        width: 1200,
        height: 630,
        alt: featuredGuide.alt,
      },
    ],
  },
};

export default function GuidesPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '유치원 고르는 법과 입학 준비 가이드',
    itemListElement: guideCards.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: guide.title,
      url: `https://where-kindergarden.vercel.app${guidePath(guide.slug)}`,
    })),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '홈',
        item: 'https://where-kindergarden.vercel.app/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '가이드',
        item: 'https://where-kindergarden.vercel.app/guides/',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--brand-page)] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <header className="border-b border-[rgba(203,188,174,0.18)] bg-[var(--brand-page)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" aria-label="우리동네 유치원 홈">
            <BrandMark compact />
          </Link>
          <Link
            href="/search?utm_source=seo&utm_medium=guide_index&utm_campaign=guides"
            className="rounded-full bg-[var(--brand-leaf)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-leaf-deep)]"
          >
            주변 유치원 찾기
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <nav className="mb-8 text-sm text-[var(--brand-ink-soft)]">
            <Link href="/" className="hover:text-[var(--brand-leaf)]">
              홈
            </Link>
            <span className="mx-2">/</span>
            <span>가이드</span>
          </nav>

          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold text-[var(--brand-leaf)]">
              부모를 위한 유치원 선택 가이드
            </p>
            <h1 className="text-3xl font-bold leading-tight text-[var(--brand-ink)] sm:text-5xl">
              유치원 고르는 법 전체 가이드: 어린이집 차이부터 입학 준비까지
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--brand-ink-soft)]">
              유치원과 어린이집을 알아볼 때는 정보가 많아서 오히려 판단이
              어려워집니다. 아래 글은 거리, 비용, 입학 일정, 통학버스처럼 실제
              부모가 매일 체감하는 기준부터 볼 수 있게 정리했습니다.
            </p>
          </div>

          <section className="mt-10 bg-white px-5 py-7 shadow-[0_0_0_1px_rgba(203,188,174,0.24)] sm:px-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">
              내 상황별로 먼저 읽을 글
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {readingRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="border border-[rgba(203,188,174,0.24)] px-4 py-4 transition-colors hover:border-[var(--brand-leaf)]"
                >
                  <h3 className="font-bold leading-6 text-[var(--brand-ink)]">
                    {route.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--brand-ink-soft)]">
                    {route.detail}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {guideCards.map((guide) => (
              <Link
                key={guide.slug}
                href={guidePath(guide.slug)}
                className="group overflow-hidden border border-[rgba(203,188,174,0.24)] bg-white transition-colors hover:border-[var(--brand-leaf)]"
              >
                <div className="relative aspect-[1200/630] w-full bg-[var(--brand-mist)]">
                  <Image
                    src={guide.image}
                    alt={guide.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5 sm:p-6">
                  <p className="text-sm font-bold text-[var(--brand-leaf)]">
                    {guide.category}
                  </p>
                  <h2 className="mt-2 text-xl font-bold leading-snug text-[var(--brand-ink)] group-hover:text-[var(--brand-leaf)]">
                    {guide.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--brand-ink-soft)]">
                    {guide.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
