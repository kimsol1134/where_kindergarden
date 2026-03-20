'use client';

import Link from 'next/link';
import { MapPin, GitCompareArrows, MessageSquareText, ShieldCheck, ChevronRight } from 'lucide-react';
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
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-4rem] top-20 h-64 w-64 rounded-full bg-[rgba(244,216,106,0.22)] blur-3xl" />
        <div className="absolute right-[-3rem] top-48 h-56 w-56 rounded-full bg-[rgba(78,169,109,0.16)] blur-3xl" />
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
