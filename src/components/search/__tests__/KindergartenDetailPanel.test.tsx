import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KindergartenDetailPanel } from '../KindergartenDetailPanel';
import {
  useCompareStore,
  useFavoriteStore,
  useReviewStore,
  useVacancyStore,
} from '@/stores';
import type { Kindergarten, VacancySummary } from '@/types';

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-chart" />,
}));

vi.mock('../ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/review/ReviewLinkList', () => ({
  ReviewLinkList: () => <div>review list</div>,
}));

vi.mock('@/components/review/ReviewPreview', () => ({
  ReviewPreview: () => <div>review preview</div>,
}));

const mockKindergarten: Kindergarten = {
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
};

function seedVacancyStore(summary: VacancySummary | null): void {
  useVacancyStore.setState({
    ...useVacancyStore.getState(),
    data: null,
    isLoaded: true,
    isLoading: false,
    error: null,
    loadPromise: null,
    loadData: vi.fn().mockResolvedValue(undefined),
    getByKindergartenId: () => summary,
    getCountByKindergartenId: () => summary?.vacancyCount ?? 0,
    hasOfficialVacancy: () => (summary?.vacancyCount ?? 0) > 0,
  });
}

describe('KindergartenDetailPanel', () => {
  beforeEach(() => {
    useCompareStore.setState({ items: [], itemsMap: new Map() });
    useFavoriteStore.setState({ items: [], itemsMap: new Map() });
    useReviewStore.setState({
      ...useReviewStore.getState(),
      data: null,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
      getCountByKindergartenId: () => 0,
    });
  });

  it('should render positive official vacancy details', () => {
    seedVacancyStore({
      kindercode: 'K001',
      aidYear: '2026',
      vacancyCount: 4,
      updatedAt: '2026-03-17',
      preschCd: 'P001',
      upperEduOfficeCd: 'U001',
      eduOfficeCd: 'E001',
      foundType: '사립',
      name: '강남유치원',
      address: '서울특별시 강남구 언주로 123',
      phone: '02-111-2222',
      detail: [{ rowNo: 1, age: '3세', course: '교육과정+방과후과정', vacancyCount: 4 }],
    });

    render(
      <KindergartenDetailPanel
        kindergarten={mockKindergarten}
        onClose={() => undefined}
        onCompareToggle={() => undefined}
        isInCompare={false}
        canAddToCompare
      />
    );

    expect(screen.getByText('공식 결원정보')).toBeInTheDocument();
    expect(screen.getByText('총 결원 4명')).toBeInTheDocument();
    expect(screen.getByText('3세')).toBeInTheDocument();
    expect(screen.getByText('교육과정+방과후과정')).toBeInTheDocument();
  });

  it('should render registered zero state', () => {
    seedVacancyStore({
      kindercode: 'K001',
      aidYear: '2026',
      vacancyCount: 0,
      updatedAt: '2026-03-17',
      preschCd: null,
      upperEduOfficeCd: null,
      eduOfficeCd: null,
      foundType: '사립',
      name: '강남유치원',
      address: '서울특별시 강남구 언주로 123',
      phone: '02-111-2222',
      detail: [],
    });

    render(
      <KindergartenDetailPanel
        kindergarten={mockKindergarten}
        onClose={() => undefined}
        onCompareToggle={() => undefined}
        isInCompare={false}
        canAddToCompare
      />
    );

    expect(screen.getByText('현재 빈 자리가 없어요')).toBeInTheDocument();
    expect(screen.getByText('최종 변경일 2026.03.17')).toBeInTheDocument();
  });

  it('should render unregistered state', () => {
    seedVacancyStore(null);

    render(
      <KindergartenDetailPanel
        kindergarten={mockKindergarten}
        onClose={() => undefined}
        onCompareToggle={() => undefined}
        isInCompare={false}
        canAddToCompare
      />
    );

    expect(screen.getByText('공식 결원 등록 정보가 없습니다.')).toBeInTheDocument();
  });

  it('renders at the document body, focuses the close action, and closes on Escape', async () => {
    seedVacancyStore(null);
    const onClose = vi.fn();

    render(
      <div className="transform">
        <KindergartenDetailPanel
          kindergarten={mockKindergarten}
          onClose={onClose}
          onCompareToggle={() => undefined}
          isInCompare={false}
          canAddToCompare
        />
      </div>
    );

    const dialog = await screen.findByRole('dialog', { name: '강남유치원 상세 정보' });
    const closeButton = screen.getByRole('button', { name: '상세 정보 닫기' });

    expect(dialog.parentElement).toBe(document.body);
    await waitFor(() => expect(closeButton).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
