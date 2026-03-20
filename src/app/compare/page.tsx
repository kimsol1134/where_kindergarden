'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Search from 'lucide-react/dist/esm/icons/search';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { useSearchParams } from 'next/navigation';
import { CompareHeader } from '@/components/compare/CompareHeader';
import { CompareGrid } from '@/components/compare/CompareGrid';
import { useCompareStore, useKindergartenStore, useSearchStore } from '@/stores';
import type { KindergartenRaw } from '@/stores/kindergartenStore';
import { transformToKindergarten } from '@/lib/transforms';

/** Shared page wrapper with header and centered content area */
function ComparePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen safe-area-top text-[var(--brand-ink)]">
      <CompareHeader />
      {children}
    </div>
  );
}

/** Centered content area used for loading, error, and empty states */
function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
      {children}
    </main>
  );
}

function CompareLoading() {
  return (
    <ComparePageShell>
      <CenteredMessage>
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--brand-leaf)]" />
        <p className="text-sm text-[var(--brand-ink-soft)]">비교 정보를 불러오는 중...</p>
      </CenteredMessage>
    </ComparePageShell>
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
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  const hasItems = items.length > 0;

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!idsParam || isLoaded || hasItems) return;
    const timer = setTimeout(() => setLoadTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [idsParam, isLoaded, hasItems]);

  // URL 파라미터로부터 비교 목록 복원
  useEffect(() => {
    if (!idsParam || hasItems || !isLoaded || allData.length === 0) return;

    const ids = idsParam.split(',').filter(Boolean);
    const kindergartens = ids
      .map((id) => getByKindercode(id))
      .filter((k): k is KindergartenRaw => k !== undefined)
      .map((raw) => transformToKindergarten(raw, location ?? undefined));

    if (kindergartens.length > 0) {
      setItems(kindergartens);
    }
  }, [idsParam, hasItems, isLoaded, allData.length, getByKindercode, setItems, location]);

  if (loadTimedOut && !hasItems) {
    return (
      <ComparePageShell>
        <CenteredMessage>
          <p className="mb-4 text-sm text-[var(--brand-ink-soft)]">로딩에 실패했습니다. 다시 시도해주세요</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-[var(--brand-leaf)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-colors hover:bg-[var(--brand-leaf-deep)]"
          >
            다시 시도
          </button>
        </CenteredMessage>
      </ComparePageShell>
    );
  }

  if (idsParam && (isLoading || !isLoaded) && !hasItems) {
    return (
      <ComparePageShell>
        <CenteredMessage>
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--brand-leaf)]" />
          <p className="text-sm text-[var(--brand-ink-soft)]">비교 정보를 불러오는 중...</p>
        </CenteredMessage>
      </ComparePageShell>
    );
  }

  if (!hasItems) {
    return (
      <ComparePageShell>
        <CenteredMessage>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(203,188,174,0.2)]">
            <Search className="h-8 w-8 text-[var(--brand-ink-soft)]" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-[var(--brand-ink)]">비교할 유치원이 없어요</h2>
          <p className="mb-6 text-center text-sm text-[var(--brand-ink-soft)]">
            검색 결과에서 비교할 유치원을 선택해주세요
          </p>
          <Link
            href="/search"
            className="rounded-full bg-[var(--brand-leaf)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-colors hover:bg-[var(--brand-leaf-deep)]"
          >
            유치원 검색하기
          </Link>
        </CenteredMessage>
      </ComparePageShell>
    );
  }

  return (
    <ComparePageShell>
      <main className="max-w-5xl mx-auto pb-24">
        {items.length === 1 && (
          <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-700">비교할 유치원을 더 추가해보세요</p>
            <Link
              href="/search"
              className="flex-shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
            >
              검색으로
            </Link>
          </div>
        )}
        <CompareGrid items={items} />
      </main>
    </ComparePageShell>
  );
}
