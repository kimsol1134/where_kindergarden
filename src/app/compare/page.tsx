'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { CompareHeader } from '@/components/compare/CompareHeader';
import { CompareGrid } from '@/components/compare/CompareGrid';
import { useCompareStore, useKindergartenStore, useSearchStore } from '@/stores';
import type { KindergartenRaw } from '@/stores/kindergartenStore';
import { transformToKindergarten } from '@/lib/transforms';

function CompareLoading() {
  return (
    <div className="min-h-screen safe-area-top text-[var(--brand-ink)]">
      <CompareHeader />
      <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--brand-leaf)]" />
        <p className="text-sm text-[var(--brand-ink-soft)]">비교 정보를 불러오는 중...</p>
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareLoading />}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');

  const { items, setItems } = useCompareStore();
  const { allData, isLoaded, isLoading, loadData, getByKindercode } =
    useKindergartenStore();
  const { location } = useSearchStore();

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // URL 파라미터로부터 비교 목록 복원
  useEffect(() => {
    // URL에 ids 파라미터가 있고, 스토어가 비어있고, 데이터 로드가 완료된 경우에만 복원
    if (idsParam && items.length === 0 && isLoaded && allData.length > 0) {
      const ids = idsParam.split(',').filter(Boolean);
      const kindergartens = ids
        .map((id) => getByKindercode(id))
        .filter((k): k is KindergartenRaw => k !== undefined)
        .map((raw) => transformToKindergarten(raw, location ?? undefined));

      if (kindergartens.length > 0) {
        setItems(kindergartens);
      }
    }
  }, [idsParam, items.length, isLoaded, allData.length, getByKindercode, setItems, location]);

  // URL에 ids가 있지만 아직 데이터 로드 중인 경우 로딩 표시
  if (idsParam && (isLoading || !isLoaded) && items.length === 0) {
    return (
      <div className="min-h-screen safe-area-top text-[var(--brand-ink)]">
        <CompareHeader />
        <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--brand-leaf)]" />
          <p className="text-sm text-[var(--brand-ink-soft)]">비교 정보를 불러오는 중...</p>
        </main>
      </div>
    );
  }

  // 비교할 아이템이 없으면 빈 상태 표시
  if (items.length === 0) {
    return (
      <div className="min-h-screen safe-area-top text-[var(--brand-ink)]">
        <CompareHeader />
        <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(203,188,174,0.2)]">
            <Search className="h-8 w-8 text-[var(--brand-ink-soft)]" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-[var(--brand-ink)]">비교할 기관이 없습니다</h2>
          <p className="mb-6 text-center text-sm text-[var(--brand-ink-soft)]">
            검색 결과에서 비교할 기관을 선택해주세요
          </p>
          <Link
            href="/search"
            className="rounded-full bg-[var(--brand-leaf)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-colors hover:bg-[var(--brand-leaf-deep)]"
          >
            기관 검색하기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen safe-area-top text-[var(--brand-ink)]">
      <CompareHeader />
      <main className="max-w-5xl mx-auto pb-24">
        <CompareGrid items={items} />
      </main>
    </div>
  );
}
