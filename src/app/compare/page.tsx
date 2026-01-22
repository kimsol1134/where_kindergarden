'use client';

import { Suspense, useEffect } from 'react';
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

    // 정원/현원
    capacity: raw.capacity,
    currentCount: raw.current_count,

    // 연령별 학급 수
    classCountAge3: raw.class_count_age3,
    classCountAge4: raw.class_count_age4,
    classCountAge5: raw.class_count_age5,

    // 연령별 정원
    capacityAge3: raw.capacity_age3,
    capacityAge4: raw.capacity_age4,
    capacityAge5: raw.capacity_age5,

    // 연령별 현원
    currentAge3: raw.current_age3,
    currentAge4: raw.current_age4,
    currentAge5: raw.current_age5,

    // 혼합반
    classCountMix: raw.class_count_mix,
    capacityMix: raw.capacity_mix,
    currentMix: raw.current_mix,

    // 특수학급
    capacitySpecial: raw.capacity_special,
    currentSpecial: raw.current_special,

    // 운영 정보
    hasBus: raw.has_bus,
    busCount: raw.bus_count,
    mealType: (raw.meal_type ?? 'none') as MealType,
    hasAfterSchool: raw.has_after_school,
    establishDate: raw.establish_date,

    // 시설 정보
    areaPerChild: raw.area_per_child,
    hasPlayground: raw.has_playground,
    buildingYear: raw.building_year,
    floorInfo: raw.floor_info,
    classroomArea: raw.classroom_area,
    indoorPlaygroundArea: raw.indoor_playground_area,
    outdoorPlaygroundArea: raw.outdoor_playground_area,

    // 교직원 정보
    teacherCount: raw.teacher_count,
    seniorTeacherCount: raw.senior_teacher_count,

    // 안전 정보
    cctvCount: raw.cctv_count,

    // 연락처
    phone: raw.phone,
    homepage: raw.homepage,
    operationHours: raw.operation_hours,
  };
}

function CompareLoading() {
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
        .map(transformToKindergarten);

      if (kindergartens.length > 0) {
        setItems(kindergartens);
      }
    }
  }, [idsParam, items.length, isLoaded, allData.length, getByKindercode, setItems]);

  // URL에 ids가 있지만 아직 데이터 로드 중인 경우 로딩 표시
  if (idsParam && (isLoading || !isLoaded) && items.length === 0) {
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
