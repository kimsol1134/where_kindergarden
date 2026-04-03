import { Award, Check, Search, Share2 } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <h2 className="text-3xl font-bold tracking-[-0.04em] text-[var(--brand-ink)] md:text-5xl">
            검색에서 결정까지,
            <br />
            한 흐름으로
          </h2>
        </div>

        <div className="mb-28 grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(78,169,109,0.12)] px-3 py-1 text-sm font-semibold text-[var(--brand-leaf)]">
              <Search className="h-4 w-4" />
              스마트 검색
            </div>
            <h3 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.04em] text-[var(--brand-ink)]">
              복잡한 정보 검색은 줄이고,
              <br />
              필요한 정보는 더 빠르게
            </h3>
            <p className="mt-5 text-lg leading-8 text-[var(--brand-ink-soft)]">
              지도 앱, 맘카페, 기관 홈페이지를 따로 돌지 않아도 됩니다. 위치 기준 탐색,
              핵심 지표, 비교 진입이 한 화면 흐름 안에서 이어집니다.
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
            <h3 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.04em] text-[var(--brand-ink)]">
              고민되는 후보들은
              <br />
              카드와 지표로 더 또렷하게
            </h3>
            <p className="mt-5 text-lg leading-8 text-[var(--brand-ink-soft)]">
              최대 3개 기관을 골라 거리, 면적, 셔틀, 방과후 등 핵심 지표를 빠르게 비교할 수
              있습니다. 비교 결과는 링크 하나로 가족이나 배우자에게 바로 공유할 수 있습니다.
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
