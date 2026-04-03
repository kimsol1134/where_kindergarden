import { Award, Check, Search, Share2 } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-[var(--brand-ink)] sm:text-3xl md:text-5xl">
            맘카페 뒤지는 시간,
            <br />
            이제 끝내세요
          </h2>
        </div>

        <div className="mb-28 grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(78,169,109,0.12)] px-3 py-1 text-sm font-semibold text-[var(--brand-leaf)]">
              <Search className="h-4 w-4" />
              스마트 검색
            </div>
            <h3 className="mt-5 text-2xl font-bold leading-tight tracking-[-0.04em] text-[var(--brand-ink)] sm:text-3xl">
              집에서 가까운 유치원,
              <br />
              한눈에 보고 싶었죠?
            </h3>
            <p className="mt-4 text-base leading-7 text-[var(--brand-ink-soft)] sm:text-lg sm:leading-8">
              지도 앱, 맘카페, 기관 홈페이지를 따로 돌아다닐 필요 없어요.
              현재 위치에서 가까운 순으로 유치원을 보여드립니다.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(78,169,109,0.14)]">
                  <Check className="h-4 w-4 text-[var(--brand-leaf)]" />
                </div>
                <span className="text-[var(--brand-ink-soft)]">
                  <strong className="text-[var(--brand-ink)]">위치 기반 탐색:</strong> 집 근처 기관을
                  거리순으로 확인
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(244,216,106,0.18)]">
                  <Check className="h-4 w-4 text-[var(--brand-ink)]" />
                </div>
                <span className="text-[var(--brand-ink-soft)]">
                  <strong className="text-[var(--brand-ink)]">간편한 조건 설정:</strong> 반경, 셔틀, 공간,
                  신축 여부 등 원하는 조건을 터치 한 번으로 설정
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(203,188,174,0.18)]">
                  <Check className="h-4 w-4 text-[var(--brand-ink)]" />
                </div>
                <span className="text-[var(--brand-ink-soft)]">
                  <strong className="text-[var(--brand-ink)]">지도와 목록 함께 보기:</strong> 지도를 보면서
                  아래에서 결과 목록도 바로 확인할 수 있습니다
                </span>
              </li>
            </ul>
          </div>

          <div className="order-1 lg:order-2">
            <PhoneFrame
              src="/images/screenshots/screenshot-search.webp"
              alt="유치원 검색 화면"
            />
          </div>
        </div>

        <div id="preview" className="grid items-center gap-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(244,216,106,0.16)] px-3 py-1 text-sm font-semibold text-[var(--brand-ink)]">
              <Award className="h-4 w-4 text-[var(--brand-leaf)]" />
              한눈에 비교
            </div>
            <h3 className="mt-5 text-2xl font-bold leading-tight tracking-[-0.04em] text-[var(--brand-ink)] sm:text-3xl">
              여기가 나을까, 저기가 나을까?
              <br />
              감 대신 데이터로 비교하세요
            </h3>
            <p className="mt-4 text-base leading-7 text-[var(--brand-ink-soft)] sm:text-lg sm:leading-8">
              후보 유치원을 나란히 놓고 거리, 면적, 셔틀, 급식까지 한번에 비교하세요.
              결과는 배우자에게 링크 하나로 바로 공유할 수 있어요.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="brand-card rounded-[1.8rem] p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(78,169,109,0.14)]">
                  <Award className="h-5 w-5 text-[var(--brand-leaf)]" />
                </div>
                <h4 className="font-bold text-[var(--brand-ink)]">베스트 조건 강조</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--brand-ink-soft)]">
                  거리, 면적, 셔틀 운영 등 결정에 도움이 되는 값을 먼저 보이게 합니다.
                </p>
              </div>
              <div className="brand-card rounded-[1.8rem] p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(244,216,106,0.18)]">
                  <Share2 className="h-5 w-5 text-[var(--brand-ink)]" />
                </div>
                <h4 className="font-bold text-[var(--brand-ink)]">간편한 공유</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--brand-ink-soft)]">
                  비교 결과를 웹과 iPhone 모두 같은 링크 구조로 바로 공유할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <PhoneFrame
            src="/images/screenshots/screenshot-detail.webp"
            alt="유치원 상세 정보 화면"
          />
        </div>
      </div>
    </section>
  );
}
