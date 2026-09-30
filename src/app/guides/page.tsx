import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';
import { GuideHeader } from './GuideHeader';
import { guides } from './guideData';

const DESCRIPTION =
  '어린이집과 유치원 차이, 국공립·사립 비교, 유치원 입학 준비, 통학버스 확인법까지 부모 입장에서 정리한 가이드 모음입니다.';

export const metadata: Metadata = {
  title: '유치원 고르는 법과 입학 준비 가이드 모음',
  description: DESCRIPTION,
  alternates: {
    canonical: '/guides/',
  },
  openGraph: {
    title: '유치원 고르는 법과 입학 준비 가이드 모음 | 우리동네 유치원',
    description: DESCRIPTION,
    url: '/guides/',
    images: [OG_IMAGE.path],
  },
  twitter: {
    card: 'summary_large_image',
    title: '유치원 고르는 법과 입학 준비 가이드 모음 | 우리동네 유치원',
    description: DESCRIPTION,
    images: [OG_IMAGE.path],
  },
};

export default function GuidesPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '유치원 고르는 법과 입학 준비 가이드',
    itemListElement: guides.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: guide.title,
      url: `${SITE_URL}/guides/${guide.slug}/`,
    })),
  };

  return (
    <div className="min-h-screen bg-[var(--brand-page)] text-[var(--brand-ink)]">
      <GuideHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
        <section className="border-b border-[rgba(203,188,174,0.22)] bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="mb-4 text-sm font-bold text-[var(--brand-leaf)]">부모를 위한 유치원 선택 가이드</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
              유치원 고르는 법 전체 가이드: 어린이집 차이부터 입학 준비까지
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--brand-ink-soft)]">
              거리, 비용, 입학 일정, 통학버스처럼 가족이 매일 체감하는 조건부터 확인할 수 있도록 정리했습니다.
              공식 공시 정보로 후보를 좁힌 뒤 실제 운영은 각 기관에 다시 확인하세요.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}/`}
                className="group rounded-3xl border border-[rgba(203,188,174,0.3)] bg-white p-6 shadow-[0_10px_30px_rgba(129,136,97,0.06)] transition hover:border-[var(--brand-leaf)] hover:shadow-[0_14px_34px_rgba(129,136,97,0.1)]"
              >
                <p className="text-sm font-bold text-[var(--brand-leaf)]">{guide.category}</p>
                <h2 className="mt-2 text-xl font-bold leading-snug group-hover:text-[var(--brand-leaf-deep)]">
                  {guide.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--brand-ink-soft)]">{guide.description}</p>
                <span className="mt-5 inline-flex text-sm font-bold text-[var(--brand-leaf-deep)]">가이드 읽기 →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 rounded-3xl bg-[var(--brand-ink)] p-8 text-white sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold">가이드에서 기준을 정했다면</h2>
              <p className="mt-2 leading-7 text-white/75">현재 위치나 주소로 주변 유치원을 찾고 후보를 나란히 비교해보세요.</p>
            </div>
            <Link
              href="/search/?mode=location"
              className="shrink-0 rounded-full bg-white px-6 py-3 font-bold text-[var(--brand-ink)]"
            >
              주변 유치원 찾기
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
