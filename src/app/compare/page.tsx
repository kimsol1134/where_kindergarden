'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { CompareHeader } from '@/components/compare/CompareHeader';
import { CompareGrid } from '@/components/compare/CompareGrid';
import { useCompareStore, useKindergartenStore } from '@/stores';
import type { Kindergarten, MealType } from '@/types';
import type { KindergartenRaw } from '@/stores/kindergartenStore';

/**
 * KindergartenRaw를 Kindergarten 타입으로 변환
 * URL로 복원할 때는 distance 정보가 없으므로 0으로 설정
 */
function transformToKindergarten(raw: KindergartenRaw): Kindergarten {
  return {
    kindercode: raw.kindercode,
    name: raw.name,
    type: raw.type === 'public' ? 'public' : 'private',
    address: raw.address,
    lat: raw.lat,
    lng: raw.lng,
    distance: 0, // URL 복원 시 거리 정보 없음
    capacity: raw.capacity,
    currentCount: raw.current_count,
    hasBus: raw.has_bus,
    busCount: raw.bus_count,
    mealType: (raw.meal_type ?? 'none') as MealType,
    hasAfterSchool: raw.has_after_school,
    areaPerChild: raw.area_per_child,
    phone: raw.phone ?? undefined,
    hasPlayground: raw.has_playground,
  };
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');

  const { items, setItems } = useCompareStore();
  const { allData, isLoaded, isLoading, loadData, getByKindercode } =
    useKindergartenStore();

  // 복원 시도 여부를 추적하는 ref (리렌더링 방지)
  const hasAttemptedRestore = useRef(false);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // URL 파라미터로부터 비교 목록 복원
  useEffect(() => {
    // 이미 복원을 시도했으면 스킵
    if (hasAttemptedRestore.current) {
      return;
    }

    // URL에 ids 파라미터가 있고, 스토어가 비어있고, 데이터 로드가 완료된 경우에만 복원
    if (idsParam && items.length === 0 && isLoaded && allData.length > 0) {
      hasAttemptedRestore.current = true;

      const ids = idsParam.split(',').filter(Boolean);
      const kindergartens = ids
        .map((id) => getByKindercode(id))
        .filter((k): k is KindergartenRaw => k !== undefined)
        .map(transformToKindergarten);

      if (kindergartens.length > 0) {
        setItems(kindergartens);
      }
    }
  }, [idsParam, items.length, isLoaded, allData.length, getByKindercode, setItems]);

  // URL에 ids가 있지만 아직 데이터 로드 중인 경우 로딩 표시
  const shouldShowLoading =
    idsParam && isLoading && items.length === 0 && !hasAttemptedRestore.current;

  if (shouldShowLoading) {
    return (
      <div className="bg-gray-50 text-gray-900 min-h-screen">
        <CompareHeader />
        <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
          <p className="text-sm text-gray-500">비교 정보를 불러오는 중...</p>
        </main>
      </div>
    );
  }

  // 비교할 아이템이 없으면 빈 상태 표시
  if (items.length === 0) {
    return (
      <div className="bg-gray-50 text-gray-900 min-h-screen">
        <CompareHeader />
        <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">비교할 기관이 없습니다</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            검색 결과에서 비교할 기관을 선택해주세요
          </p>
          <Link
            href="/search"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-sm shadow-md transition-colors"
          >
            기관 검색하기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      <CompareHeader />
      <main className="max-w-5xl mx-auto pb-24">
        <CompareGrid items={items} />
      </main>
    </div>
  );
}
