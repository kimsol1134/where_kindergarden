/**
 * JSON-LD 구조화된 데이터 컴포넌트
 * 네이버 SEO 최적화 - 검색엔진이 페이지 내용을 더 잘 이해하도록 지원
 * https://searchadvisor.naver.com/guide/structured-data-intro
 */

interface WebsiteJsonLdProps {
  url?: string;
  name?: string;
  description?: string;
}

/**
 * WebSite 구조화된 데이터
 * 사이트 전체에 대한 정보를 검색엔진에 제공
 */
export function WebsiteJsonLd({
  url = 'https://where-kindergarden.vercel.app',
  name = '우리동네 유치원',
  description = '현재 위치 기반으로 주변 유치원을 검색하고 비교해보세요. 전국 7,950개 이상의 유치원 정보를 한눈에 확인할 수 있습니다.',
}: WebsiteJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    inLanguage: 'ko-KR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface OrganizationJsonLdProps {
  url?: string;
  name?: string;
  logo?: string;
}

/**
 * Organization 구조화된 데이터
 * 서비스 운영 주체에 대한 정보 제공
 */
export function OrganizationJsonLd({
  url = 'https://where-kindergarden.vercel.app',
  name = '우리동네 유치원',
  logo = 'https://where-kindergarden.vercel.app/icon.png',
}: OrganizationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface BreadcrumbJsonLdProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * BreadcrumbList 구조화된 데이터
 * 페이지 경로(탐색 경로)를 검색엔진에 제공
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface FAQJsonLdProps {
  mainEntity: Array<{
    questionName: string;
    acceptedAnswerText: string;
  }>;
}

/**
 * FAQ 구조화된 데이터
 * 자주 묻는 질문을 검색 결과에 표시
 */
export function FAQJsonLd({ mainEntity }: FAQJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: mainEntity.map((entity) => ({
      '@type': 'Question',
      name: entity.questionName,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entity.acceptedAnswerText,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
