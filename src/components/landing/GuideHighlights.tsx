import Image from 'next/image';
import Link from 'next/link';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

const guideCards = [
  {
    href: '/guides/kindergarten-selection',
    title: '유치원 고르는 법',
    description: '거리, 하원 시간, 월 총비용, 상담 질문을 어떤 순서로 볼지 정리했습니다.',
    image: '/images/screenshots/screenshot-search.webp',
    alt: '우리동네 유치원 앱에서 주변 유치원을 검색하는 화면',
  },
  {
    href: '/guides/daycare-vs-kindergarten',
    title: '어린이집 유치원 차이',
    description: '맞벌이, 아이 나이, 돌봄 시간 기준으로 어느 쪽이 맞는지 비교합니다.',
    image: '/images/guides/daycare-vs-kindergarten.jpg',
    alt: '어린이집과 유치원 건물을 나란히 비교하는 일러스트',
  },
  {
    href: '/guides/kindergarten-admission-prep',
    title: '유치원 입학 준비',
    description: '모집 전 일정, 후보 줄이기, 전화 상담 질문을 체크리스트로 확인하세요.',
    image: '/images/guides/kindergarten-admission-prep.jpg',
    alt: '유치원 입학 준비를 위해 일정과 후보 기관을 확인하는 일러스트',
  },
];

export function GuideHighlights() {
  return (
    <section id="guides" className="bg-[var(--brand-mist)] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-bold text-[var(--brand-leaf)]">
              부모를 위한 선택 가이드
            </p>
            <h2 className="text-2xl font-bold tracking-[-0.04em] text-[var(--brand-ink)] sm:text-4xl">
              유치원 찾기 전에 기준부터 정리하세요
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--brand-ink-soft)] sm:text-lg">
              처음 알아볼 때 많이 검색하는 질문을 부모 입장에서 정리했습니다.
              후보를 많이 저장하기 전에 무엇을 먼저 봐야 하는지 확인해보세요.
            </p>
          </div>
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 font-bold text-[var(--brand-leaf)] transition-colors hover:text-[var(--brand-leaf-deep)]"
          >
            전체 가이드 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {guideCards.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group overflow-hidden bg-white shadow-[0_0_0_1px_rgba(203,188,174,0.24)] transition-transform hover:-translate-y-0.5"
            >
              <div className="relative aspect-[16/10] bg-[var(--brand-page)]">
                <Image
                  src={guide.image}
                  alt={guide.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-[var(--brand-ink)] group-hover:text-[var(--brand-leaf)]">
                  {guide.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--brand-ink-soft)]">
                  {guide.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
