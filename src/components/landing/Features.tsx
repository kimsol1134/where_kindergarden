import {
  ArrowRight,
  Award,
  BarChart2,
  Bus,
  Check,
  CircleSlash,
  Search,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/76 px-4 py-2 text-sm font-semibold text-[var(--brand-leaf)]">
            <Sparkles className="h-4 w-4" />
            검색에서 비교까지 한 흐름
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.04em] text-[var(--brand-ink)] md:text-5xl">
            브랜드는 새로 정리했지만
            <br />
            핵심 탐색 구조는 더 선명해졌습니다
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
                  <strong className="text-[var(--brand-ink)]">필터 중심 UX:</strong> 반경, 셔틀, 공간,
                  최신 건물 등 한 손 조작 가능한 칩 형태
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(203,188,174,0.18)]">
                  <Check className="h-4 w-4 text-[var(--brand-ink)]" />
                </div>
                <span className="text-[var(--brand-ink-soft)]">
                  <strong className="text-[var(--brand-ink)]">하단 결과 시트:</strong> iPhone에서는 전체
                  지도와 결과 리스트를 자연스럽게 넘나듭니다
                </span>
              </li>
            </ul>
          </div>

          <div className="order-1 lg:order-2">
            <div className="mobile-frame mx-auto flex h-[620px] max-w-sm flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(246,245,239,0.96))]">
              <div className="border-b border-white/70 bg-white/72 px-4 pb-4 pt-10 shadow-sm">
                <div className="mb-4 rounded-full bg-white/90 px-4 py-3 text-sm font-semibold text-[var(--brand-ink)]">
                  서울 강남구 역삼동
                </div>
                <div className="flex gap-2">
                  <div className="rounded-full border border-[rgba(78,169,109,0.28)] bg-[rgba(78,169,109,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-leaf)]">
                    반경 1km
                  </div>
                  <div className="rounded-full border border-[rgba(203,188,174,0.3)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--brand-ink-soft)]">
                    넓은 공간
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="brand-card relative rounded-[1.6rem] p-4">
                  <div className="absolute left-4 top-4">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-leaf)]">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="pl-8">
                    <div className="mb-2">
                      <h4 className="font-bold text-[var(--brand-ink)]">역삼유치원</h4>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-[rgba(78,169,109,0.12)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-leaf)]">
                          국공립
                        </span>
                        <span className="text-xs text-[var(--brand-ink-soft)]">0.3km</span>
                      </div>
                    </div>
                    <div className="mb-3 flex gap-3 text-xs text-[var(--brand-ink-soft)]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> 정원 40명
                      </span>
                      <span className="flex items-center gap-1">
                        <Bus className="h-3 w-3" /> 셔틀 있음
                      </span>
                    </div>
                    <div className="border-t border-[rgba(203,188,174,0.18)] pt-3 text-xs text-[var(--brand-ink-soft)]">
                      서울 강남구 역삼로 123
                    </div>
                  </div>
                </div>

                <div className="brand-card relative rounded-[1.6rem] p-4 opacity-90">
                  <div className="absolute left-4 top-4">
                    <div className="h-5 w-5 rounded-full border border-[rgba(203,188,174,0.48)]" />
                  </div>
                  <div className="pl-8">
                    <div className="mb-2">
                      <h4 className="font-bold text-[var(--brand-ink)]">해맑은유치원</h4>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-[rgba(203,188,174,0.2)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-ink-soft)]">
                          사립
                        </span>
                        <span className="text-xs text-[var(--brand-ink-soft)]">0.5km</span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-[var(--brand-ink-soft)]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> 정원 60명
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleSlash className="h-3 w-3" /> 셔틀 없음
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/70 bg-white/82 p-4">
                <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-leaf)] py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(78,169,109,0.22)]">
                  <span>선택한 1개 비교하기</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="preview" className="grid items-center gap-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(244,216,106,0.16)] px-3 py-1 text-sm font-semibold text-[var(--brand-ink)]">
              <BarChart2 className="h-4 w-4 text-[var(--brand-leaf)]" />
              한눈에 비교
            </div>
            <h3 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.04em] text-[var(--brand-ink)]">
              고민되는 후보들은
              <br />
              카드와 지표로 더 또렷하게
            </h3>
            <p className="mt-5 text-lg leading-8 text-[var(--brand-ink-soft)]">
              최대 3개 기관을 골라 거리, 면적, 셔틀, 방과후 등 핵심 지표를 빠르게 비교할 수
              있습니다. iPhone에서는 공유도 시스템 시트로 자연스럽게 이어집니다.
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

          <div className="brand-shell overflow-hidden rounded-[2.2rem] p-5">
            <div className="rounded-[1.7rem] bg-white/74 p-4">
              <div className="mb-4 flex items-center justify-between border-b border-[rgba(203,188,174,0.18)] pb-4">
                <h4 className="font-bold text-[var(--brand-ink)]">비교 결과</h4>
                <span className="text-xs text-[var(--brand-ink-soft)]">3개 기관 선택됨</span>
              </div>
              <div className="space-y-3">
                <CompareRow title="기관" values={['역삼유치원', '해맑은', '꿈나무']} emphasizedIndex={0} />
                <CompareRow title="거리" values={['0.3km', '0.5km', '0.8km']} emphasizedIndex={0} />
                <CompareRow title="셔틀" values={['1대', '없음', '2대']} emphasizedIndex={2} />
                <CompareRow title="급식" values={['직영', '위탁', '직영']} emphasizedIndex={0} />
                <CompareRow title="1인 면적" values={['3.2㎡', '4.5㎡', '2.8㎡']} emphasizedIndex={1} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareRow({
  title,
  values,
  emphasizedIndex,
}: {
  title: string;
  values: string[];
  emphasizedIndex: number;
}) {
  return (
    <div className="grid grid-cols-[80px_repeat(3,minmax(0,1fr))] gap-2">
      <div className="rounded-2xl bg-[rgba(246,245,239,0.8)] px-3 py-4 text-xs font-semibold text-[var(--brand-ink-soft)]">
        {title}
      </div>
      {values.map((value, index) => (
        <div
          key={`${title}-${value}`}
          className={`rounded-2xl px-3 py-4 text-center text-sm font-semibold ${
            index === emphasizedIndex
              ? 'brand-highlight text-[var(--brand-ink)]'
              : 'bg-white text-[var(--brand-ink-soft)]'
          }`}
        >
          {value}
        </div>
      ))}
    </div>
  );
}
