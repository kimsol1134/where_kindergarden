import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BreadcrumbJsonLd, FAQJsonLd } from '@/components/JsonLd';
import { Footer } from '@/components/landing/Footer';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';
import { GuideHeader } from '../GuideHeader';
import { getGuide, guides } from '../guideData';

interface GuidePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    return {};
  }

  const canonical = `/guides/${guide.slug}/`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: `${guide.title} | 우리동네 유치원`,
      description: guide.description,
      url: canonical,
      images: [OG_IMAGE.path],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${guide.title} | 우리동네 유치원`,
      description: guide.description,
      images: [OG_IMAGE.path],
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    notFound();
  }

  const pageUrl = `${SITE_URL}/guides/${guide.slug}/`;
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    inLanguage: 'ko-KR',
    datePublished: '2026-06-28',
    dateModified: '2026-08-04',
    mainEntityOfPage: pageUrl,
    image: `${SITE_URL}${OG_IMAGE.path}`,
    author: {
      '@type': 'Organization',
      name: '우리동네 유치원',
      url: `${SITE_URL}/`,
    },
  };

  return (
    <div className="min-h-screen bg-[var(--brand-page)] text-[var(--brand-ink)]">
      <GuideHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <BreadcrumbJsonLd
          items={[
            { name: '홈', url: `${SITE_URL}/` },
            { name: '유치원 선택 가이드', url: `${SITE_URL}/guides/` },
            { name: guide.title, url: pageUrl },
          ]}
        />
        <FAQJsonLd
          mainEntity={guide.faqs.map((faq) => ({
            questionName: faq.question,
            acceptedAnswerText: faq.answer,
          }))}
        />

        <article>
          <header className="border-b border-[rgba(203,188,174,0.22)] bg-white px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-4xl">
              <nav className="mb-5 text-sm text-[var(--brand-ink-soft)]" aria-label="현재 위치">
                <Link href="/guides/" className="font-semibold hover:text-[var(--brand-leaf)]">
                  유치원 선택 가이드
                </Link>{' '}
                / {guide.category}
              </nav>
              <p className="mb-4 text-sm font-bold text-[var(--brand-leaf)]">{guide.category}</p>
              <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{guide.title}</h1>
              <div className="mt-6 space-y-3 text-lg leading-8 text-[var(--brand-ink-soft)]">
                {guide.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <p className="mt-6 border-l-4 border-[var(--brand-leaf)] pl-4 text-sm font-semibold leading-7">
                자료 확인일: 2026년 8월 4일. 공시 수치, 모집 일정, 운영 시간과 비용은 최신 공식 안내와 기관 상담으로 최종 확인하세요.
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6">
            <section className="rounded-3xl bg-[var(--brand-mist)] p-6">
              <h2 className="text-xl font-bold">바쁘다면 이것만 먼저 보세요</h2>
              <ul className="mt-4 space-y-3">
                {guide.keyPoints.map((point) => (
                  <li key={point} className="flex gap-3 leading-7 text-[var(--brand-ink-soft)]">
                    <span className="font-bold text-[var(--brand-leaf)]">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            {guide.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-bold leading-snug">{section.title}</h2>
                <p className="mt-3 border-l-4 border-[var(--brand-leaf)] pl-4 font-semibold leading-7">
                  {section.summary}
                </p>
                <div className="mt-4 space-y-4 text-base leading-8 text-[var(--brand-ink-soft)]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-3xl border border-[rgba(203,188,174,0.35)] bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-bold">{guide.checklistTitle}</h2>
              <ol className="mt-5 space-y-3">
                {guide.checklist.map((item, index) => (
                  <li key={item} className="flex gap-3 leading-7 text-[var(--brand-ink-soft)]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-mist)] text-sm font-bold text-[var(--brand-leaf-deep)]">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-bold">자주 묻는 질문</h2>
              <div className="mt-5 space-y-4">
                {guide.faqs.map((faq) => (
                  <div key={faq.question} className="rounded-2xl border border-[rgba(203,188,174,0.3)] bg-white p-5">
                    <h3 className="font-bold">{faq.question}</h3>
                    <p className="mt-2 leading-7 text-[var(--brand-ink-soft)]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-[var(--brand-ink)] p-8 text-white">
              <h2 className="text-2xl font-bold">주변 유치원을 실제 조건으로 비교해보세요</h2>
              <p className="mt-3 leading-7 text-white/75">
                현재 위치나 주소를 기준으로 가까운 유치원을 찾고 거리, 정원, 셔틀버스와 급식 정보를 나란히 확인할 수 있습니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/search/?mode=location"
                  className="rounded-full bg-white px-6 py-3 font-bold text-[var(--brand-ink)]"
                >
                  주변 유치원 찾기
                </Link>
                <Link
                  href="/guides/"
                  className="rounded-full border border-white/30 px-6 py-3 font-bold text-white"
                >
                  다른 가이드 보기
                </Link>
              </div>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
