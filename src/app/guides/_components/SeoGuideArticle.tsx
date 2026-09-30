import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/common/BrandMark';
import { Footer } from '@/components/landing/Footer';
import type { Guide } from '../_lib/guides';
import { guides, guidePath } from '../_lib/guides';

type SeoGuideArticleProps = {
  guide: Guide;
};

export function SeoGuideArticle({ guide }: SeoGuideArticleProps) {
  const canonicalUrl = `https://where-kindergarden.vercel.app${guidePath(guide.slug)}`;
  const selectionGuide = {
    slug: 'kindergarten-selection',
    title: '유치원 고르는 법: 선택 기준 7가지와 상담 질문 체크리스트',
    description:
      '거리, 통학버스, 정원, 교사 비율, 급식, 방과후, 후기와 상담 질문을 어떤 순서로 확인하면 좋은지 정리했습니다.',
    category: '유치원 입학 준비',
  };
  const relatedGuides = [
    selectionGuide,
    ...guides.filter((item) => item.slug !== guide.slug),
  ].slice(0, 3);
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    image: `https://where-kindergarden.vercel.app${guide.heroImage}`,
    datePublished: '2026-06-28',
    dateModified: '2026-06-28',
    inLanguage: 'ko-KR',
    author: {
      '@type': 'Organization',
      name: '우리동네 유치원',
    },
    publisher: {
      '@type': 'Organization',
      name: '우리동네 유치원',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
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
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--brand-page)] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <header className="border-b border-[rgba(203,188,174,0.18)] bg-[var(--brand-page)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" aria-label="우리동네 유치원 홈">
            <BrandMark compact />
          </Link>
          <Link
            href={`/search?utm_source=seo&utm_medium=guide_header&utm_campaign=${guide.slug}`}
            className="rounded-full bg-[var(--brand-leaf)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-leaf-deep)]"
          >
            주변 유치원 찾기
          </Link>
        </div>
      </header>

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <nav className="mb-8 text-sm text-[var(--brand-ink-soft)]">
            <Link href="/" className="hover:text-[var(--brand-leaf)]">
              홈
            </Link>
            <span className="mx-2">/</span>
            <Link href="/guides" className="hover:text-[var(--brand-leaf)]">
              가이드
            </Link>
            <span className="mx-2">/</span>
            <span>{guide.category}</span>
          </nav>

          <p className="mb-4 text-sm font-bold text-[var(--brand-leaf)]">{guide.category}</p>
          <h1 className="text-3xl font-bold leading-tight text-[var(--brand-ink)] sm:text-5xl">
            {guide.title}
          </h1>
          {guide.opening.map((paragraph) => (
            <p key={paragraph} className="mt-5 text-lg leading-8 text-[var(--brand-ink-soft)]">
              {paragraph}
            </p>
          ))}
          <p className="mt-5 border-l-4 border-[var(--brand-leaf)] pl-4 text-base font-semibold leading-7 text-[var(--brand-ink)]">
            {guide.searchIntent}
          </p>
          <p className="mt-4 text-sm font-semibold leading-7 text-[var(--brand-ink-soft)]">
            자료 기준일: 2026년 6월 28일 / 공식 확인처:{' '}
            {guide.references.map((reference) => reference.source).join(', ')} / 기관별
            운영 시간과 비용은 상담으로 최종 확인하세요.
          </p>

          <section className="mt-8 bg-[var(--brand-mist)] px-5 py-6 sm:px-7">
            <h2 className="text-lg font-bold text-[var(--brand-ink)]">
              바쁘다면 이것만 먼저 보세요
            </h2>
            <ul className="mt-4 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              {guide.quickSummary.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-leaf)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <figure className="mt-10">
            <div className="overflow-hidden border border-[rgba(203,188,174,0.24)] bg-white">
              <Image
                src={guide.heroImage}
                alt={guide.heroAlt}
                width={1200}
                height={630}
                sizes="(min-width: 768px) 720px, 100vw"
                priority
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-3 text-sm leading-6 text-[var(--brand-ink-soft)]">
              {guide.heroCaption}
            </figcaption>
          </figure>

          <section className="mt-12 space-y-12">
            {guide.sections.map((item, index) => (
              <section key={item.heading}>
                <h2 className="text-2xl font-bold leading-snug text-[var(--brand-ink)]">
                  {index + 1}. {item.heading}
                </h2>
                <p className="mt-3 border-l-4 border-[var(--brand-leaf)] pl-4 text-base font-semibold leading-7 text-[var(--brand-ink)]">
                  {item.summary}
                </p>
                <div className="mt-4 space-y-4">
                  {item.body.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-base leading-8 text-[var(--brand-ink-soft)]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </section>

          <section className="mt-14 bg-white px-5 py-7 shadow-[0_0_0_1px_rgba(203,188,174,0.24)] sm:px-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">
              {guide.decisionTool.title}
            </h2>
            <p className="mt-3 leading-8 text-[var(--brand-ink-soft)]">
              {guide.decisionTool.intro}
            </p>
            <div className="mt-5 divide-y divide-[rgba(203,188,174,0.24)]">
              {guide.decisionTool.items.map((item) => (
                <section key={item.label} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="font-bold text-[var(--brand-ink)]">{item.label}</h3>
                  <p className="mt-2 leading-7 text-[var(--brand-ink-soft)]">
                    {item.detail}
                  </p>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-14 bg-[var(--brand-mist)] px-5 py-7 sm:px-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">{guide.planTitle}</h2>
            <p className="mt-3 leading-8 text-[var(--brand-ink-soft)]">{guide.planIntro}</p>
            <ol className="mt-5 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              {guide.planItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              {guide.questionsTitle}
            </h2>
            <p className="mt-4 leading-8 text-[var(--brand-ink-soft)]">
              {guide.questionsIntro}
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              {guide.questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-14 bg-white px-5 py-7 shadow-[0_0_0_1px_rgba(203,188,174,0.24)] sm:px-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">{guide.cautionTitle}</h2>
            <p className="mt-3 leading-8 text-[var(--brand-ink-soft)]">
              아래 항목 중 하나라도 해당되면 바로 결정하지 말고 한 번 더
              상담하거나 다른 후보와 비교해보는 편이 좋습니다.
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              {guide.cautions.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-leaf)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14 border-y border-[rgba(203,188,174,0.24)] py-8">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              참고한 공식 자료
            </h2>
            <p className="mt-4 leading-8 text-[var(--brand-ink-soft)]">
              아래 자료들은 실제 일정, 공시 정보, 비용 지원 여부를 확인할 때
              같이 보는 것이 좋습니다. 주변 이야기는 분위기를 이해하는 데 도움이
              되지만, 최종 확인은 공식 자료와 기관 상담으로 다시 맞춰보는 편이
              안전합니다.
            </p>
            <ul className="mt-6 space-y-5">
              {guide.references.map((reference) => (
                <li key={reference.href}>
                  <a
                    href={reference.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[var(--brand-ink)] underline decoration-[rgba(78,169,109,0.35)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--brand-leaf)]"
                  >
                    {reference.title}
                  </a>
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-leaf)]">
                    {reference.source}
                  </p>
                  <p className="mt-2 leading-7 text-[var(--brand-ink-soft)]">
                    {reference.note}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {relatedGuides.length > 0 ? (
            <section className="mt-14">
              <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
                같이 보면 결정이 쉬운 글
              </h2>
              <div className="mt-5 grid gap-3">
                {relatedGuides.map((item) => (
                  <Link
                    key={item.slug}
                    href={guidePath(item.slug)}
                    className="block border border-[rgba(203,188,174,0.24)] bg-white px-5 py-4 transition-colors hover:border-[var(--brand-leaf)]"
                  >
                    <p className="text-sm font-bold text-[var(--brand-leaf)]">{item.category}</p>
                    <h3 className="mt-1 font-bold leading-6 text-[var(--brand-ink)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--brand-ink-soft)]">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">자주 묻는 질문</h2>
            <div className="mt-5 divide-y divide-[rgba(203,188,174,0.24)]">
              {guide.faq.map((item) => (
                <section key={item.question} className="py-5">
                  <h3 className="font-bold text-[var(--brand-ink)]">{item.question}</h3>
                  <p className="mt-2 leading-7 text-[var(--brand-ink-soft)]">
                    {item.answer}
                  </p>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-14 border-t border-[rgba(203,188,174,0.24)] pt-8">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              주변 기관을 바로 비교해보세요
            </h2>
            <p className="mt-3 leading-8 text-[var(--brand-ink-soft)]">
              우리동네 유치원에서는 위치 기반으로 주변 유치원을 찾고, 관심 있는
              2~3곳을 비교표로 정리할 수 있습니다. 혼자 정리하지 말고 가족에게
              링크로 보내 같이 확인해보세요.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/search?utm_source=seo&utm_medium=guide&utm_campaign=${guide.slug}`}
                className="inline-flex justify-center rounded-full bg-[var(--brand-leaf)] px-6 py-3 font-bold text-white transition-colors hover:bg-[var(--brand-leaf-deep)]"
              >
                주변 유치원 찾기
              </Link>
              <Link
                href={`/compare?utm_source=seo&utm_medium=guide&utm_campaign=${guide.slug}`}
                className="inline-flex justify-center rounded-full border border-[rgba(203,188,174,0.55)] px-6 py-3 font-bold text-[var(--brand-ink)] transition-colors hover:border-[var(--brand-leaf)]"
              >
                비교표 보기
              </Link>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
