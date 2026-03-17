import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KindergartenList } from '../KindergartenList';
import {
  useCompareStore,
  useFavoriteStore,
  useReviewStore,
  useSearchStore,
  useVacancyStore,
} from '@/stores';
import type { Kindergarten } from '@/types';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 180,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        size: 180,
        start: index * 180,
      })),
  }),
}));

vi.mock('../KindergartenDetailPanel', () => ({
  KindergartenDetailPanel: () => null,
}));

const mockKindergartens: Kindergarten[] = [
  {
    kindercode: 'K001',
    name: '강남유치원',
    type: 'private',
    address: '서울특별시 강남구 언주로 123',
    lat: 37.5,
    lng: 127.0,
    distance: 0.4,
    sidoCode: '11',
    sigunguCode: '11680',
    capacity: 120,
    currentCount: 100,
    classCountAge3: 1,
    classCountAge4: 1,
    classCountAge5: 1,
    capacityAge3: 20,
    capacityAge4: 20,
    capacityAge5: 20,
    currentAge3: 18,
    currentAge4: 17,
    currentAge5: 16,
    classCountMix: 0,
    capacityMix: 0,
    currentMix: 0,
    capacitySpecial: 0,
    currentSpecial: 0,
    hasBus: true,
    busCount: 2,
    mealType: 'direct',
    hasAfterSchool: true,
    establishDate: '20150301',
    areaPerChild: 5.2,
    hasPlayground: true,
    buildingYear: 2018,
    floorInfo: '지상 2층',
    classroomArea: 120,
    indoorPlaygroundArea: 20,
    outdoorPlaygroundArea: 40,
    teacherCount: 10,
    seniorTeacherCount: 1,
    cctvCount: 8,
    phone: '02-111-2222',
    homepage: null,
    operationHours: '09:00~17:00',
  },
  {
    kindercode: 'K002',
    name: '도곡유치원',
    type: 'public',
    address: '서울특별시 강남구 선릉로 221',
    lat: 37.51,
    lng: 127.01,
    distance: 0.8,
    sidoCode: '11',
    sigunguCode: '11680',
    capacity: 90,
    currentCount: 90,
    classCountAge3: 1,
    classCountAge4: 1,
    classCountAge5: 1,
    capacityAge3: 15,
    capacityAge4: 15,
    capacityAge5: 15,
    currentAge3: 15,
    currentAge4: 15,
    currentAge5: 15,
    classCountMix: 0,
    capacityMix: 0,
    currentMix: 0,
    capacitySpecial: 0,
    currentSpecial: 0,
    hasBus: false,
    busCount: 0,
    mealType: 'outsourced',
    hasAfterSchool: false,
    establishDate: '20100301',
    areaPerChild: 4.8,
    hasPlayground: false,
    buildingYear: 2008,
    floorInfo: null,
    classroomArea: 90,
    indoorPlaygroundArea: 0,
    outdoorPlaygroundArea: 0,
    teacherCount: 8,
    seniorTeacherCount: 1,
    cctvCount: 6,
    phone: '02-333-4444',
    homepage: null,
    operationHours: null,
  },
];

describe('KindergartenList', () => {
  beforeEach(() => {
    const reviewLoadMock = vi.fn().mockResolvedValue(undefined);
    const vacancyLoadMock = vi.fn().mockResolvedValue(undefined);

    useSearchStore.setState({
      address: '서울특별시 강남구',
      filters: {
        radius: 3,
        type: 'all',
        hasBus: null,
        hasVacancy: null,
        hasIndoorPlayground: null,
        hasLargeSpace: null,
        hasModernBuilding: null,
      },
      isLoading: false,
      error: null,
      selectedId: null,
      detailId: null,
      sortBy: 'distance',
      totalCount: mockKindergartens.length,
      results: mockKindergartens,
    });

    useCompareStore.setState({ items: [], itemsMap: new Map() });
    useFavoriteStore.setState({ items: [], itemsMap: new Map() });
    useReviewStore.setState({
      ...useReviewStore.getState(),
      data: null,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
      loadData: reviewLoadMock,
      getCountByKindergartenId: () => 0,
    });
    useVacancyStore.setState({
      ...useVacancyStore.getState(),
      data: null,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
      loadData: vacancyLoadMock,
      getCountByKindergartenId: (kindergartenId) => (kindergartenId === 'K001' ? 3 : 0),
      hasOfficialVacancy: (kindergartenId) => kindergartenId === 'K001',
    });
  });

  it('should render official vacancy badge only for positive official vacancies', async () => {
    render(
      <KindergartenList mobileView="list" onToggleMobileView={() => undefined} panelWidth={450} />
    );

    expect(screen.getByText('공식 결원 3명')).toBeInTheDocument();
    expect(screen.queryByText('공식 결원 0명')).not.toBeInTheDocument();
    expect(screen.getByText('강남유치원')).toBeInTheDocument();
    expect(screen.getByText('도곡유치원')).toBeInTheDocument();
  });
});
