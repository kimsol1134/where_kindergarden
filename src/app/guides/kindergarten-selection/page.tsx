import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/common/BrandMark';
import { Footer } from '@/components/landing/Footer';
import { guides, guidePath } from '../_lib/guides';

const title = '유치원 고르는 법: 선택 기준 7가지와 상담 질문 체크리스트';
const description =
  '처음 유치원을 알아보는 부모 입장에서 거리, 통학버스, 정원, 교사 비율, 급식, 방과후, 후기와 상담 질문을 어떤 순서로 확인하면 좋은지 정리했습니다.';
const canonicalPath = '/guides/kindergarten-selection';
const canonicalUrl = `https://where-kindergarden.vercel.app${canonicalPath}`;
const ogImage = '/images/guides/kindergarten-selection-map.jpg';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    '유치원 선택 기준',
    '유치원 고르는 법',
    '유치원 입학 준비',
    '유치원 비교',
    '어린이집 유치원 차이',
    '처음학교로',
    '유치원 상담 질문',
  ],
  alternates: {
    canonical: canonicalPath,
  },
  openGraph: {
    title,
    description,
    type: 'article',
    url: canonicalPath,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: '우리동네 유치원에서 주변 유치원을 검색하고 비교하는 화면',
      },
    ],
  },
};

const criteria = [
  {
    heading: '집에서 가까운 곳부터 보는 게 맞습니다',
    summary: '매일 반복되는 등원은 좋은 프로그램보다 먼저 체감됩니다.',
    body: [
      '처음에는 교육 철학이나 프로그램부터 보고 싶습니다. 그런데 실제 등원 생활에서는 거리가 먼저 발목을 잡는 경우가 많습니다. 비 오는 날, 아이가 피곤한 날, 부모가 출근 준비로 바쁜 날에도 매일 갈 수 있어야 하니까요.',
      '지도에서 1km 안쪽을 먼저 보고, 후보가 너무 적으면 2km까지 넓혀보세요. 차량 등원을 생각한다면 거리보다 아침 동선이 더 중요합니다. 집에서 원으로 갔다가 다시 회사 방향으로 돌아 나와야 한다면 가까워도 부담이 됩니다.',
    ],
  },
  {
    heading: '통학버스는 “있다/없다”보다 노선이 중요합니다',
    summary: '버스가 있어도 우리 집 앞을 지나지 않으면 생활에 큰 도움이 되지 않습니다.',
    body: [
      '통학버스가 있다고 적혀 있어도 우리 집 앞을 지나는지는 별도 문제입니다. 실제로는 정류장 위치, 등원 시간, 하원 시간, 보호자 대기 장소까지 확인해야 합니다.',
      '맞벌이 가정이라면 통학버스는 선택 기준이 아니라 생활 조건에 가깝습니다. 후보를 줄일 때 “통학버스 운영 여부”를 먼저 걸러두면 상담할 곳이 훨씬 줄어듭니다.',
    ],
  },
  {
    heading: '정원과 현원은 입학 가능성과 분위기를 같이 보여줍니다',
    summary: '정원이 꽉 찬 곳은 인기 신호일 수 있지만, 입학 가능성은 따로 봐야 합니다.',
    body: [
      '정원이 꽉 찬 곳은 인기가 있다는 신호일 수 있지만, 입학 가능성은 낮을 수 있습니다. 반대로 현원이 적은 곳은 여유가 있어 보이지만, 왜 여유가 있는지도 궁금해집니다.',
      '정원과 현원은 단독으로 판단하지 말고 후기, 거리, 시설, 상담 인상과 함께 봐야 합니다. 처음에는 “갈 수 있는 곳인지”를 확인하고, 그 다음에 “보내고 싶은 곳인지”를 판단하는 순서가 편합니다.',
    ],
  },
  {
    heading: '교사 대 아동 비율은 숫자로 비교해볼 만합니다',
    summary: '아이가 아직 어릴수록 교사 한 명이 돌보는 아이 수가 더 중요하게 느껴집니다.',
    body: [
      '교사 수는 부모가 체감하기 어려운 항목이지만, 막상 비교표에 놓고 보면 차이가 분명합니다. 아이가 아직 낯가림이 있거나 생활 습관 지도가 필요한 시기라면 더 중요하게 볼 수 있습니다.',
      '단순히 교사가 몇 명인지보다 현재 원아 수 대비 교사 수를 같이 보세요. 같은 교사 수라도 현원이 많은 곳과 적은 곳의 체감은 다릅니다.',
    ],
  },
  {
    heading: '급식은 운영 방식과 공개 습관을 봅니다',
    summary: '식단표를 꾸준히 공개하는지, 알레르기 대응이 가능한지까지 확인하세요.',
    body: [
      '직영 급식인지, 위탁 급식인지도 중요하지만 식단표가 정기적으로 공개되는지, 알레르기나 편식 상담을 어떻게 하는지도 같이 확인하면 좋습니다.',
      '상담 때는 “식단표는 어디서 확인하나요?”, “알레르기 있는 아이는 어떻게 관리하나요?”처럼 구체적으로 물어보는 편이 답을 듣기 쉽습니다.',
    ],
  },
  {
    heading: '방과후 과정은 부모의 퇴근 시간과 맞춰 봐야 합니다',
    summary: '하원 시간이 맞지 않으면 좋은 기관이어도 매일의 부담이 커집니다.',
    body: [
      '방과후 과정은 프로그램 이름보다 실제 운영 시간이 중요합니다. 하원 시간이 조금만 어긋나도 매일 조부모 도움이나 돌봄 공백을 고민하게 됩니다.',
      '방학 중 운영 여부, 추가 비용, 간식 제공 여부도 같이 확인하세요. 평소에는 괜찮아 보여도 방학 때 운영 방식이 달라지면 체감 부담이 커질 수 있습니다.',
    ],
  },
  {
    heading: '월 총비용은 기본 비용보다 넓게 봐야 합니다',
    summary: '차량비, 방과후, 특성화 활동비, 방학 비용까지 합쳐야 실제 부담이 보입니다.',
    body: [
      '유치원 비용을 볼 때 기본 교육비만 보면 실제 부담을 놓치기 쉽습니다. 차량비, 방과후 과정, 특성화 활동비, 현장학습비, 방학 중 추가 비용처럼 매달 반복되거나 계절별로 생기는 비용을 함께 물어봐야 합니다.',
      '상담 때는 항목별 설명을 듣기 전에 “평균적으로 한 달에 총 얼마 정도를 예상하면 되나요?”라고 먼저 물어보세요. 그 다음 차량비, 방과후, 활동비가 포함된 금액인지 확인하는 편이 실제 생활비에 가깝습니다.',
    ],
  },
];

const quickSummary = [
  '처음에는 좋은 유치원을 찾기보다 매일 보낼 수 없는 곳을 먼저 제외합니다.',
  '거리, 하원 시간, 월 총비용, 모집 가능성이 맞지 않으면 오래 유지하기 어렵습니다.',
  '후기는 마지막에 분위기와 상담 질문을 찾는 용도로 확인합니다.',
];

const familyCases = [
  {
    situation: '맞벌이 가정',
    focus: '하원 시간, 방과후 과정, 방학 중 운영, 통학버스 시간을 먼저 확인합니다.',
  },
  {
    situation: '조부모 도움을 받을 수 있는 가정',
    focus: '정류장 위치, 보호자 대기 장소, 아이가 아플 때 데리러 갈 수 있는 거리를 봅니다.',
  },
  {
    situation: '아이가 낯가림이 있는 경우',
    focus: '교사 대 아동 비율, 적응 기간, 부모 소통 방식, 낮잠·식사 지도를 물어봅니다.',
  },
  {
    situation: '비용이 가장 걱정되는 경우',
    focus: '기본 비용이 아니라 차량비, 방과후, 특성화 활동비를 포함한 월 총액을 확인합니다.',
  },
];

const nightPlan = [
  '1단계: 집 주소 기준으로 주변 유치원을 넓게 검색합니다.',
  '2단계: 통학 거리와 통학버스 조건으로 5곳 안팎까지 줄입니다.',
  '3단계: 정원, 현원, 교사 수, 급식, 방과후, 월 총비용을 나란히 비교합니다.',
  '4단계: 후기를 읽으며 상담 때 물어볼 질문을 적습니다.',
  '5단계: 최종 2~3곳은 전화나 방문 상담으로 확인합니다.',
];

const reviewGuide = {
  heading: '후기는 마지막에 봐야 덜 흔들립니다',
  summary: '후기는 분위기와 상담 포인트를 찾는 자료로 쓰는 편이 안전합니다.',
  body: [
    '후기는 실제 분위기를 알 수 있어서 유용합니다. 다만 강한 불만 하나, 좋은 후기 하나만 보고 마음이 크게 움직이면 후보를 잘못 줄일 수 있습니다.',
    '거리, 통학, 비용, 운영 시간처럼 바뀌기 어려운 조건을 먼저 본 뒤 후기를 읽어보세요. 그때부터 후기는 “이 원은 어떤 질문을 더 해봐야 할까?”를 찾는 데 도움이 됩니다.',
  ],
};

const faq = [
  {
    question: '유치원은 언제부터 알아보는 게 좋나요?',
    answer:
      '모집 일정 직전에 급하게 보면 선택지가 좁아집니다. 가능하면 모집철 한두 달 전부터 집 주변 기관을 넓게 보고, 최종 후보만 상담하는 방식이 좋습니다.',
  },
  {
    question: '국공립 유치원과 사립 유치원 중 어디가 더 좋은가요?',
    answer:
      '한쪽이 항상 좋다고 보기는 어렵습니다. 비용, 거리, 방과후 과정, 통학버스, 교사 비율, 아이 성향을 함께 비교해야 합니다.',
  },
  {
    question: '유치원 후기는 얼마나 믿어도 되나요?',
    answer:
      '후기는 분위기를 파악하는 데 도움이 되지만 최종 판단 근거로만 쓰기는 어렵습니다. 공식 공시 정보와 상담 내용을 함께 확인하는 것이 안전합니다.',
  },
  {
    question: '처음 알아볼 때 몇 곳을 비교하면 좋나요?',
    answer:
      '처음에는 5~10곳을 넓게 보고, 실제 상담 후보는 2~3곳으로 줄이는 것이 부담이 적습니다.',
  },
];

const references = [
  {
    title: '유치원알리미 유치원·어린이집 조회',
    source: '교육부',
    href: 'https://e-childschoolinfo.moe.go.kr/kinderMt/combineFind.do',
    note: '전국 유치원·어린이집의 기본정보, 운영 정보, 공시 지표를 확인할 때 참고했습니다.',
  },
  {
    title: '유치원입학 서비스 소개',
    source: '유치원입학',
    href: 'https://www.go-firstschool.go.kr/PAMS_SS/preschAdmnSys.do',
    note: '유치원 입학 신청과 선발 절차를 이해하기 위해 참고했습니다.',
  },
  {
    title: '어린이집·유치원 통합정보공시',
    source: '유보통합포털',
    href: 'https://enter.childinfo.go.kr/icms/main/TotalSearchSlPL.html',
    note: '어린이집과 유치원을 함께 찾아보는 보호자 관점의 조회 흐름을 확인했습니다.',
  },
  {
    title: '2026학년도 유아학비 지원계획 안내',
    source: '교육부',
    href: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=312&boardSeq=105235&lev=0&m=0301&opType=N&page=1&s=moe&searchType=null&statusYN=W',
    note: '국공립·사립 유치원 비용을 비교할 때 유아학비 지원 여부를 함께 확인해야 한다는 점을 참고했습니다.',
  },
];

export default function KindergartenSelectionGuidePage() {
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: `https://where-kindergarden.vercel.app${ogImage}`,
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
    mainEntity: faq.map((item) => ({
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
        name: title,
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
            href="/search?utm_source=seo&utm_medium=guide_header&utm_campaign=kindergarten_selection"
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
            <span>유치원 선택 가이드</span>
          </nav>

          <p className="mb-4 text-sm font-bold text-[var(--brand-leaf)]">
            유치원 입학 준비
          </p>
          <h1 className="text-3xl font-bold leading-tight text-[var(--brand-ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--brand-ink-soft)]">
            결론부터 말하면 처음 유치원을 고를 때는 교육 프로그램보다 거리,
            하원 시간, 월 총비용, 모집 가능성을 먼저 봐야 합니다. 이 네 가지가
            맞지 않으면 아무리 평판이 좋아도 매일 유지하기 어렵습니다.
          </p>
          <p className="mt-4 text-base leading-8 text-[var(--brand-ink-soft)]">
            이 글은 유치원알리미 공시 정보, 유치원입학 서비스 안내, 유아학비
            지원 안내처럼 학부모가 실제로 확인하게 되는 공식 자료를 바탕으로,
            처음 후보를 줄일 때 도움이 되는 순서로 정리했습니다. 처음부터 좋은
            한 곳을 찾기보다 매일 보내기 어려운 곳을 제외하는 방식으로 읽어보세요.
          </p>
          <p className="mt-5 border-l-4 border-[var(--brand-leaf)] pl-4 text-sm font-semibold leading-7 text-[var(--brand-ink)]">
            자료 기준일: 2026년 6월 28일 / 공식 확인처: 유치원알리미, 유치원입학,
            교육부 유아학비 안내 / 기관별 운영 시간과 비용은 상담으로 최종 확인하세요.
          </p>

          <section className="mt-8 bg-[var(--brand-mist)] px-5 py-6 sm:px-7">
            <h2 className="text-lg font-bold text-[var(--brand-ink)]">
              바쁘다면 이것만 먼저 보세요
            </h2>
            <ul className="mt-4 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              {quickSummary.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-leaf)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 bg-white px-5 py-7 shadow-[0_0_0_1px_rgba(203,188,174,0.24)] sm:px-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">
              우리 집 상황별로 먼저 볼 기준
            </h2>
            <div className="mt-5 divide-y divide-[rgba(203,188,174,0.24)]">
              {familyCases.map((item) => (
                <section key={item.situation} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="font-bold text-[var(--brand-ink)]">{item.situation}</h3>
                  <p className="mt-2 leading-7 text-[var(--brand-ink-soft)]">{item.focus}</p>
                </section>
              ))}
            </div>
          </section>

          <figure className="mt-10">
            <div className="overflow-hidden border border-[rgba(203,188,174,0.24)] bg-white">
              <Image
                src="/images/screenshots/screenshot-search.webp"
                alt="우리동네 유치원 앱에서 주변 유치원을 지도와 목록으로 검색하는 화면"
                width={1206}
                height={2622}
                sizes="(min-width: 768px) 720px, 100vw"
                priority
                className="mx-auto h-auto max-h-[720px] w-auto"
              />
            </div>
            <figcaption className="mt-3 text-sm leading-6 text-[var(--brand-ink-soft)]">
              먼저 집 주변 후보를 넓게 보고, 조건이 맞는 곳만 비교 후보로 남기는
              방식이 가장 빠릅니다. 예시 화면의 정보는 공시·기관 업데이트 시점에
              따라 달라질 수 있습니다.
            </figcaption>
          </figure>

          <figure className="mt-10">
            <div className="overflow-hidden border border-[rgba(203,188,174,0.24)] bg-white">
              <Image
                src="/images/guides/kindergarten-selection-map.jpg"
                alt="동네 지도 위에 여러 유치원 후보와 통학 동선을 비교하는 일러스트"
                width={1200}
                height={630}
                sizes="(min-width: 768px) 720px, 100vw"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-3 text-sm leading-6 text-[var(--brand-ink-soft)]">
              유치원 선택은 한 곳을 바로 고르는 일이 아니라, 집 주변 후보를
              생활 동선에 맞게 줄여가는 과정에 가깝습니다.
            </figcaption>
          </figure>

          <section className="mt-12 border-y border-[rgba(203,188,174,0.24)] py-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">
              제일 먼저 해야 할 일: 후보를 많이 모으지 않는 것
            </h2>
            <p className="mt-4 text-base leading-8 text-[var(--brand-ink-soft)]">
              처음부터 열 곳, 스무 곳을 저장해두면 비교가 쉬워지는 게 아니라 더
              어려워집니다. 실제로는 집에서 갈 수 있는 곳, 시간표가 맞는 곳,
              상담해볼 만한 곳만 남기면 됩니다. 이 글은 그 순서를 기준으로
              정리했습니다.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold leading-snug text-[var(--brand-ink)]">
              {reviewGuide.heading}
            </h2>
            <p className="mt-3 border-l-4 border-[var(--brand-leaf)] pl-4 text-base font-semibold leading-7 text-[var(--brand-ink)]">
              {reviewGuide.summary}
            </p>
            <div className="mt-4 space-y-4">
              {reviewGuide.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-[var(--brand-ink-soft)]">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-12 space-y-12">
            {criteria.map((item, index) => (
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

          <section className="mt-14 bg-[var(--brand-mist)] px-5 py-7 sm:px-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">
              하루 저녁에 후보를 줄이는 순서
            </h2>
            <p className="mt-3 leading-8 text-[var(--brand-ink-soft)]">
              시간이 많지 않다면 아래 순서로만 봐도 충분합니다. 중요한 건 처음부터
              완벽한 한 곳을 고르는 게 아니라, 상담할 만한 후보를 줄이는 것입니다.
            </p>
            <ol className="mt-5 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              {nightPlan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <figure className="mt-12">
            <div className="overflow-hidden border border-[rgba(203,188,174,0.24)] bg-white">
              <Image
                src="/images/screenshots/screenshot-detail.webp"
                alt="유치원 상세 화면에서 정원, 후기, 통학버스, 급식 정보를 확인하는 화면"
                width={1206}
                height={2622}
                sizes="(min-width: 768px) 720px, 100vw"
                className="mx-auto h-auto max-h-[720px] w-auto"
              />
            </div>
            <figcaption className="mt-3 text-sm leading-6 text-[var(--brand-ink-soft)]">
              상세 정보는 상담 전에 질문을 정리하는 용도로 보면 좋습니다. 숫자로
              먼저 비교하고, 마지막에 후기로 분위기를 확인하세요.
            </figcaption>
          </figure>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              상담 전에 적어두면 좋은 질문
            </h2>
            <p className="mt-4 leading-8 text-[var(--brand-ink-soft)]">
              전화나 방문 상담에서는 막상 무엇을 물어볼지 잊기 쉽습니다. 아래
              질문만 적어가도 실제 생활과 맞는지 훨씬 잘 보입니다.
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              <li>통학버스는 우리 동네 어느 지점에서 타나요?</li>
              <li>방과후 과정은 몇 시까지 운영하나요?</li>
              <li>방학 중 운영 시간은 학기 중과 다른가요?</li>
              <li>차량비, 방과후, 특성화 활동비를 포함한 월 평균 비용은 얼마인가요?</li>
              <li>식단표와 알레르기 대응은 어떻게 안내하나요?</li>
              <li>신입 원아 적응 기간에는 보호자에게 어떻게 공유해주나요?</li>
            </ul>
          </section>

          <section className="mt-14 bg-white px-5 py-7 shadow-[0_0_0_1px_rgba(203,188,174,0.24)] sm:px-7">
            <h2 className="text-xl font-bold text-[var(--brand-ink)]">
              바로 결정하지 말고 다시 볼 신호
            </h2>
            <ul className="mt-5 space-y-3 text-base leading-7 text-[var(--brand-ink-soft)]">
              <li>후기는 좋은데 하원 시간이 부모 퇴근과 계속 맞지 않습니다.</li>
              <li>거리만 보고 골랐고 방학 중 운영 시간을 아직 확인하지 않았습니다.</li>
              <li>상담 분위기는 좋았지만 월 총비용과 추가 비용을 정확히 모릅니다.</li>
              <li>아이 성향보다 프로그램 수와 홍보 문구에 마음이 기울었습니다.</li>
            </ul>
          </section>

          <figure className="mt-10">
            <div className="overflow-hidden border border-[rgba(203,188,174,0.24)] bg-white">
              <Image
                src="/images/guides/kindergarten-consultation-prep.jpg"
                alt="유치원 상담 전 확인할 전화, 통학버스, 시간, 급식 항목을 표현한 일러스트"
                width={1200}
                height={630}
                sizes="(min-width: 768px) 720px, 100vw"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-3 text-sm leading-6 text-[var(--brand-ink-soft)]">
              상담 전에 질문을 정리해두면 전화 한 통으로도 후보를 꽤 많이
              줄일 수 있습니다.
            </figcaption>
          </figure>

          <section className="mt-14 border-y border-[rgba(203,188,174,0.24)] py-8">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              참고한 공식 자료
            </h2>
            <p className="mt-4 leading-8 text-[var(--brand-ink-soft)]">
              아래 자료들은 실제 지원 일정, 공시 정보, 비용 지원 여부를 확인할
              때 같이 보는 것이 좋습니다. 블로그 후기나 주변 이야기는 분위기를
              이해하는 데 도움이 되지만, 최종 확인은 공식 자료와 기관 상담으로
              다시 맞춰보는 편이 안전합니다.
            </p>
            <ul className="mt-6 space-y-5">
              {references.map((reference) => (
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

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              다음 고민이 있다면 같이 보세요
            </h2>
            <div className="mt-5 grid gap-3">
              {guides.slice(0, 3).map((guide) => (
                <Link
                  key={guide.slug}
                  href={guidePath(guide.slug)}
                  className="block border border-[rgba(203,188,174,0.24)] bg-white px-5 py-4 transition-colors hover:border-[var(--brand-leaf)]"
                >
                  <p className="text-sm font-bold text-[var(--brand-leaf)]">{guide.category}</p>
                  <h3 className="mt-1 font-bold leading-6 text-[var(--brand-ink)]">
                    {guide.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--brand-ink-soft)]">
                    {guide.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              자주 묻는 질문
            </h2>
            <div className="mt-5 divide-y divide-[rgba(203,188,174,0.24)]">
              {faq.map((item) => (
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
              지금 주변 유치원을 비교해보세요
            </h2>
            <p className="mt-3 leading-8 text-[var(--brand-ink-soft)]">
              우리동네 유치원에서는 위치 기반으로 주변 유치원을 찾고, 관심 있는
              2~3곳을 비교표로 정리할 수 있습니다. 혼자 정리하지 말고 가족에게
              링크로 보내 같이 확인해보세요.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search?utm_source=seo&utm_medium=guide&utm_campaign=kindergarten_selection"
                className="inline-flex justify-center rounded-full bg-[var(--brand-leaf)] px-6 py-3 font-bold text-white transition-colors hover:bg-[var(--brand-leaf-deep)]"
              >
                주변 유치원 찾기
              </Link>
              <Link
                href="/compare?utm_source=seo&utm_medium=guide&utm_campaign=kindergarten_selection"
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
