'use client';

import Link from 'next/link';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import GitCompareArrows from 'lucide-react/dist/esm/icons/git-compare-arrows';
import MessageSquareText from 'lucide-react/dist/esm/icons/message-square-text';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { BrandMark } from '@/components/common/BrandMark';

const FEATURES = [
  {
    icon: MapPin,
    title: '내 주변 검색',
    description: '현재 위치 기반으로 가까운 유치원을 찾아요',
  },
  {
    icon: GitCompareArrows,
    title: '한눈에 비교',
    description: '최대 3곳을 나란히 비교해 볼 수 있어요',
  },
  {
    icon: MessageSquareText,
    title: '학부모 후기',
    description: '실제 학부모들의 생생한 후기를 확인하세요',
  },
] as const;

export function AppHome() {
  return (
    <div className="relative min-h-screen bg-[var(--brand-page)] font-sans text-[var(--brand-ink)]">
      {/* 배경 장식 — 수채화 워시 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-[-3.5rem] top-[-2.5rem] h-[220px] w-[280px] rounded-[40%_60%_55%_45%/55%_40%_60%_45%] bg-[radial-gradient(ellipse_at_30%_40%,rgba(78,169,109,0.18),rgba(78,169,109,0.06)_60%,transparent_80%)] blur-[40px]" />
        <div className="absolute left-[-3rem] top-[180px] h-[200px] w-[240px] rounded-[55%_45%_50%_50%/45%_55%_45%_55%] bg-[radial-gradient(ellipse_at_60%_50%,rgba(244,216,106,0.22),rgba(244,216,106,0.08)_55%,transparent_80%)] blur-[40px]" />
        <div className="absolute bottom-[120px] right-[-1.5rem] h-[260px] w-[200px] rounded-[50%_50%_40%_60%/60%_40%_55%_45%] bg-[radial-gradient(ellipse_at_40%_60%,rgba(78,169,109,0.12),rgba(45,90,61,0.04)_50%,transparent_75%)] blur-[40px]" />
        <div className="absolute bottom-[-1.5rem] left-[-2.5rem] h-[180px] w-[320px] rounded-[45%_55%_60%_40%/50%_50%_45%_55%] bg-[radial-gradient(ellipse_at_50%_30%,rgba(244,216,106,0.14),rgba(244,216,106,0.04)_60%,transparent_85%)] blur-[40px]" />
        <div className="absolute right-5 top-[60px] h-[140px] w-[160px] rounded-[50%_50%_45%_55%/55%_45%_50%_50%] bg-[rgba(78,169,109,0.08)] blur-[60px]" />
        <div className="absolute left-[30px] top-[280px] h-[120px] w-[180px] rounded-[50%] bg-[rgba(244,216,106,0.1)] blur-[60px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-5 safe-pt-hero pb-[calc(3rem+var(--total-bottom-offset,0px))]">
        {/* 브랜드마크 */}
        <div className="pt-8 pb-2 animate-fade-up">
          <BrandMark
            className="justify-center"
            labelClassName="text-2xl"
            iconClassName="h-14 w-14"
          />
        </div>

        {/* 환영 문구 */}
        <p className="mt-4 text-center text-base leading-relaxed text-[var(--brand-ink-soft)] animate-fade-up delay-100">
          우리 아이에게 딱 맞는 유치원, 함께 찾아볼까요?
        </p>

        {/* 메인 CTA */}
        <div className="mt-8 animate-fade-up delay-200">
          <Link
            href="/search?mode=location"
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--brand-leaf)] px-6 py-4 text-lg font-semibold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-transform active:scale-[0.97]"
          >
            <MapPin className="h-5 w-5" />
            내 주변 유치원 찾기
          </Link>
        </div>

        {/* 핵심 기능 3개 */}
        <div className="mt-10 space-y-3 animate-fade-up delay-300">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="brand-card flex items-center gap-4 rounded-2xl p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(78,169,109,0.12)]">
                <feature.icon className="h-5 w-5 text-[var(--brand-leaf)]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--brand-ink)]">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--brand-ink-soft)]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 성향 테스트 배너 */}
        <Link
          href="/test"
          className="mt-6 block animate-fade-up delay-300"
        >
          <div className="brand-shell flex items-center rounded-2xl px-5 py-4 transition-transform active:scale-[0.98]">
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-[var(--brand-ink)]">
                우리 아이 유치원 성향 테스트
              </p>
              <p className="mt-1 text-xs text-[var(--brand-ink-soft)]">
                7가지 질문으로 알아보는 맞춤 유치원 유형
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </div>
        </Link>

        {/* 하단 신뢰 정보 + 더보기 링크 */}
        <div className="mt-auto pt-10 animate-fade-up delay-300">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--brand-ink-soft)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-leaf)]" />
            <span>전국 7,950개 유치원</span>
            <span className="text-[var(--brand-sand)]">·</span>
            <span>위치 정보 미저장</span>
          </div>
        </div>
      </div>
    </div>
  );
}
