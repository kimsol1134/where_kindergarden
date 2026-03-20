import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

export const metadata: Metadata = {
  title: '우리 아이 성향 테스트 | 우리동네 유치원',
  description:
    '아동심리 전문가 연구 기반! 7가지 질문으로 알아보는 우리 아이 성향과 맞춤 유치원 추천. 유아 MBTI, 아이 성향 분석, 유치원 추천 테스트.',
  keywords: [
    '아이 성향 테스트',
    '유아 성향 분석',
    '유치원 추천 테스트',
    '아이 MBTI',
    '유아 심리 테스트',
    '유치원 선택',
    '어린이집 추천',
    '우리 아이 성향',
  ],
  openGraph: {
    title: '우리 아이 성향 테스트 | 7가지 질문으로 알아보는 맞춤 유치원',
    description:
      '아이 성향에 맞는 유치원 유형은? 아동심리 전문가 연구 기반 테스트로 지금 알아보세요!',
    images: [
      {
        url: '/og-test.png',
        width: 1200,
        height: 630,
        alt: '우리 아이 성향 테스트',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '우리 아이 성향 테스트',
    description:
      '아이 성향에 맞는 유치원 유형은? 지금 테스트해보세요!',
    images: ['/og-test.png'],
  },
};

const quizJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Quiz',
  name: '우리 아이 성향 테스트',
  description:
    '7가지 질문으로 알아보는 아이 성향과 맞춤 유치원 추천',
  educationalLevel: 'preschool',
  about: {
    '@type': 'Thing',
    name: '유아 성향 분석',
  },
  provider: {
    '@type': 'Organization',
    name: '우리동네 유치원',
    url: 'https://where-kindergarden.vercel.app',
  },
};

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Script
        id="quiz-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(quizJsonLd) }}
      />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-60 h-60 bg-emerald-100/40 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 safe-area-top bg-white/70 backdrop-blur-xl border-b border-emerald-100/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
          >
            ← 홈으로
          </Link>
          <h1 className="text-base font-semibold text-gray-800">
            우리 아이 성향 테스트
          </h1>
          <div className="w-12" /> {/* 균형을 위한 스페이서 */}
        </div>
      </header>

      <main className="relative max-w-lg mx-auto px-4 py-8">{children}</main>

      <footer className="relative max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-sm text-gray-400">
          우리동네 유치원 | 아이에게 딱 맞는 유치원을 찾아보세요
        </p>
      </footer>
    </div>
  );
}
