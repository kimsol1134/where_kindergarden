'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  Phone,
  MapPin,
  Bus,
  Clock,
  Utensils,
  Building,
  Leaf,
  Calendar,
  Globe,
  Shield,
  Home,
  SquareStack,
  ExternalLink,
  Coins,
  Loader2,
  Heart,
  Newspaper,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import type { Kindergarten } from '@/types';
import { getKindergartenInfoUrl } from '@/lib/utils/kindergarten-url';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { useFavoriteStore, useReviewStore } from '@/stores';
import { ReviewLinkList } from '@/components/review/ReviewLinkList';
import { ReviewPreview } from '@/components/review/ReviewPreview';
import { formatDistanceLabel } from '@/lib/utils';
import { isNative } from '@/lib/utils/platform';

function ChartSkeleton() {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      <span className="mt-2 text-xs text-gray-400">차트 로딩 중...</span>
    </div>
  );
}

const DonutChart = dynamic(
  () => import('./charts/DonutChart').then((mod) => ({ default: mod.DonutChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const RatioBarChart = dynamic(
  () => import('./charts/RatioBarChart').then((mod) => ({ default: mod.RatioBarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

const MEAL_LABELS = {
  direct: '직영',
  outsourced: '위탁',
  none: '미운영',
} as const;

interface KindergartenDetailPanelProps {
  kindergarten: Kindergarten;
  onClose: () => void;
  onCompareToggle: () => void;
  isInCompare: boolean;
  canAddToCompare: boolean;
}

function formatEstablishDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}

function InfoRow({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2.5 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-gray-600">
        {icon}
        {label}
      </span>
      <span className={`text-right text-sm font-medium ${valueClassName ?? 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

type DetailTab = 'info' | 'reviews';

const sectionCardClass =
  'mx-4 mb-3 rounded-[28px] border border-gray-100 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]';

export function KindergartenDetailPanel({
  kindergarten,
  onClose,
  onCompareToggle,
  isInCompare,
  canAddToCompare,
}: KindergartenDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [isChartsExpanded, setIsChartsExpanded] = useState(false);
  const typeStyle = TYPE_STYLES[kindergarten.type];
  const distanceLabel = formatDistanceLabel(kindergarten.distance);
  const footerPaddingBottom = isNative()
    ? 'max(env(safe-area-inset-bottom, 0px), 16px)'
    : 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 56px)';

  const reviewCount = useReviewStore((state) =>
    state.getCountByKindergartenId(kindergarten.kindercode)
  );

  const { isFavorite, toggleItem: toggleFavorite } = useFavoriteStore();
  const isFav = isFavorite(kindergarten.kindercode);

  const totalClassCount =
    kindergarten.classCountAge3 +
    kindergarten.classCountAge4 +
    kindergarten.classCountAge5 +
    kindergarten.classCountMix;
  const vacancyCount = Math.max(0, kindergarten.capacity - kindergarten.currentCount);

  const classData = [
    { name: '만 3세반', value: kindergarten.classCountAge3, color: '#86efac' },
    { name: '만 4세반', value: kindergarten.classCountAge4, color: '#fcd34d' },
    { name: '만 5세반', value: kindergarten.classCountAge5, color: '#93c5fd' },
  ];
  if (kindergarten.classCountMix > 0) {
    classData.push({ name: '혼합반', value: kindergarten.classCountMix, color: '#c4b5fd' });
  }

  const childData = [
    { name: '만 3세반', value: kindergarten.currentAge3, color: '#86efac' },
    { name: '만 4세반', value: kindergarten.currentAge4, color: '#fcd34d' },
    { name: '만 5세반', value: kindergarten.currentAge5, color: '#93c5fd' },
  ];
  if (kindergarten.currentMix > 0) {
    childData.push({ name: '혼합반', value: kindergarten.currentMix, color: '#c4b5fd' });
  }
  if (kindergarten.currentSpecial > 0) {
    childData.push({ name: '특수학급', value: kindergarten.currentSpecial, color: '#f9a8d4' });
  }

  const teacherChildRatio =
    kindergarten.teacherCount > 0
      ? parseFloat((kindergarten.currentCount / kindergarten.teacherCount).toFixed(1))
      : 0;
  const classChildRatio =
    totalClassCount > 0
      ? parseFloat((kindergarten.currentCount / totalClassCount).toFixed(1))
      : 0;

  const ratioData = [
    {
      name: '교사당 원아수',
      value: teacherChildRatio,
      unit: '명',
      color: '#10b981',
      description: '교사 1인당 원아 수',
    },
    {
      name: '학급당 원아수',
      value: classChildRatio,
      unit: '명',
      color: '#6366f1',
      description: '학급 1개당 평균 원아 수',
    },
  ];

  const teacherData = [
    {
      name: '1/2급 정교사',
      value: Math.max(0, kindergarten.teacherCount - kindergarten.seniorTeacherCount),
      color: '#fbbf24',
    },
  ];
  if (kindergarten.seniorTeacherCount > 0) {
    teacherData.unshift({
      name: '수석/부장교사',
      value: kindergarten.seniorTeacherCount,
      color: '#9ca3af',
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/35" onClick={onClose} />

      <div className="safe-inset-y fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[32px] bg-white shadow-2xl md:right-0 md:left-auto md:top-0 md:w-[560px] md:max-w-none md:rounded-none">
        <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 pb-4 pt-3 backdrop-blur-md">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gray-300 md:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${typeStyle.className}`}>
                  {typeStyle.label}
                </span>
                {distanceLabel ? (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                    {distanceLabel}
                  </span>
                ) : null}
                {reviewCount > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                    후기 {reviewCount}건
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-gray-900">
                {kindergarten.name}
              </h2>
              <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <span>{kindergarten.address}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              aria-label="상세 정보 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {kindergarten.phone ? (
              <a
                href={`tel:${kindergarten.phone}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
              >
                <Phone className="h-4 w-4 text-gray-400" />
                전화하기
              </a>
            ) : null}
            {kindergarten.homepage ? (
              <a
                href={
                  kindergarten.homepage.startsWith('http')
                    ? kindergarten.homepage
                    : `http://${kindergarten.homepage}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
              >
                <Globe className="h-4 w-4 text-gray-400" />
                홈페이지
              </a>
            ) : null}
            <a
              href={getKindergartenInfoUrl({
                name: kindergarten.name,
                sidoCode: kindergarten.sidoCode,
                sigunguCode: kindergarten.sigunguCode,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
            >
              <Coins className="h-4 w-4" />
              비용 보기
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
            후기 링크는 공개된 웹 후기만 모아 보여주고, 비용은 교육부 유치원 알리미 원문으로 연결됩니다.
          </div>
        </div>

        <div className="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'info' ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            기본정보
            {activeTab === 'info' ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'reviews' ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            <Newspaper className="h-4 w-4" />
            후기
            {reviewCount > 0 ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {reviewCount}
              </span>
            ) : null}
            {activeTab === 'reviews' ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />
            ) : null}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 py-4">
          {activeTab === 'reviews' ? (
            <ReviewLinkList kindergartenId={kindergarten.kindercode} />
          ) : (
            <>
              <div className={`${sectionCardClass} grid grid-cols-2 gap-3`}>
                <SummaryCard label="정원 / 현원" value={`${kindergarten.capacity} / ${kindergarten.currentCount}명`} />
                <SummaryCard label="여유 정원" value={`${vacancyCount}명`} />
                <SummaryCard label="통학차량" value={kindergarten.hasBus ? `${kindergarten.busCount}대 운영` : '미운영'} />
                <SummaryCard label="방과후 과정" value={kindergarten.hasAfterSchool ? '운영' : '미운영'} />
              </div>

              <ReviewPreview
                kindergartenId={kindergarten.kindercode}
                onViewAll={() => setActiveTab('reviews')}
              />

              <section className={sectionCardClass}>
                <h3 className="text-lg font-bold text-gray-900">운영 및 생활</h3>
                <div className="mt-4">
                  <InfoRow
                    label="설립일"
                    value={formatEstablishDate(kindergarten.establishDate)}
                    icon={<Calendar className="h-4 w-4 text-gray-400" />}
                  />
                  {kindergarten.operationHours ? (
                    <InfoRow
                      label="운영 시간"
                      value={kindergarten.operationHours}
                      icon={<Clock className="h-4 w-4 text-gray-400" />}
                    />
                  ) : null}
                  <InfoRow
                    label="급식 운영"
                    value={MEAL_LABELS[kindergarten.mealType]}
                    icon={<Utensils className="h-4 w-4 text-orange-500" />}
                    valueClassName={kindergarten.mealType !== 'none' ? 'text-emerald-600' : 'text-gray-400'}
                  />
                  <InfoRow
                    label="통학차량"
                    value={kindergarten.hasBus ? `운행 (${kindergarten.busCount}대)` : '미운영'}
                    icon={<Bus className="h-4 w-4 text-blue-500" />}
                    valueClassName={kindergarten.hasBus ? 'text-emerald-600' : 'text-gray-400'}
                  />
                  <InfoRow
                    label="방과후 과정"
                    value={kindergarten.hasAfterSchool ? '운영' : '미운영'}
                    valueClassName={kindergarten.hasAfterSchool ? 'text-emerald-600' : 'text-gray-400'}
                  />
                </div>
              </section>

              <section className={sectionCardClass}>
                <h3 className="text-lg font-bold text-gray-900">시설 및 안전</h3>
                <div className="mt-4">
                  <InfoRow
                    label="총 학급 수"
                    value={`${totalClassCount}학급`}
                    icon={<SquareStack className="h-4 w-4 text-gray-400" />}
                  />
                  <InfoRow
                    label="1인당 면적"
                    value={`${kindergarten.areaPerChild.toFixed(1)}㎡`}
                    icon={<Home className="h-4 w-4 text-gray-400" />}
                  />
                  <InfoRow
                    label="교실 면적"
                    value={`${kindergarten.classroomArea.toFixed(1)}㎡`}
                  />
                  <InfoRow
                    label="실내놀이터"
                    value={
                      kindergarten.indoorPlaygroundArea > 0
                        ? `${kindergarten.indoorPlaygroundArea.toFixed(1)}㎡`
                        : '없음'
                    }
                    valueClassName={
                      kindergarten.indoorPlaygroundArea > 0 ? 'text-emerald-600' : 'text-gray-400'
                    }
                  />
                  <InfoRow
                    label="실외놀이터"
                    value={
                      kindergarten.hasPlayground && kindergarten.outdoorPlaygroundArea > 0
                        ? `${kindergarten.outdoorPlaygroundArea.toFixed(1)}㎡`
                        : '없음'
                    }
                    icon={<Leaf className="h-4 w-4 text-green-500" />}
                    valueClassName={
                      kindergarten.hasPlayground && kindergarten.outdoorPlaygroundArea > 0
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }
                  />
                  {kindergarten.buildingYear ? (
                    <InfoRow
                      label="건축년도"
                      value={`${kindergarten.buildingYear}년`}
                      icon={<Building className="h-4 w-4 text-gray-400" />}
                    />
                  ) : null}
                  {kindergarten.floorInfo ? (
                    <InfoRow
                      label="층 정보"
                      value={kindergarten.floorInfo}
                    />
                  ) : null}
                  <InfoRow
                    label="CCTV"
                    value={`${kindergarten.cctvCount}대`}
                    icon={<Shield className="h-4 w-4 text-blue-500" />}
                  />
                </div>
              </section>

              <section className={sectionCardClass}>
                <button
                  type="button"
                  onClick={() => setIsChartsExpanded((value) => !value)}
                  className="flex w-full items-center justify-between"
                >
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                      차트와 세부 통계
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      학급, 원아, 교사 구성 데이터를 펼쳐서 볼 수 있어요.
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      isChartsExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isChartsExpanded ? (
                  <div className="mt-6 space-y-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                      <div>
                        <ChartErrorBoundary>
                          <DonutChart
                            data={classData}
                            title="학급수"
                            totalLabel="총 학급"
                            totalValue={totalClassCount}
                          />
                        </ChartErrorBoundary>
                      </div>
                      <div>
                        <ChartErrorBoundary>
                          <DonutChart
                            data={childData}
                            title="원아수"
                            totalLabel="총 원아"
                            totalValue={kindergarten.currentCount}
                            totalUnit="명"
                            valueUnit="명"
                          />
                        </ChartErrorBoundary>
                      </div>
                      <div className="md:col-span-2">
                        <ChartErrorBoundary>
                          <RatioBarChart data={ratioData} title="교사당/학급당 원아수" />
                        </ChartErrorBoundary>
                      </div>
                    </div>

                    <div className="mx-auto max-w-xs">
                      <ChartErrorBoundary>
                        <DonutChart
                          data={teacherData}
                          title="교사 자격"
                          totalLabel="총 교사"
                          totalValue={kindergarten.teacherCount}
                          totalUnit="명"
                          valueUnit="명"
                        />
                      </ChartErrorBoundary>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>

        <div
          className="sticky bottom-0 border-t border-gray-200 bg-white/95 px-4 pt-4 backdrop-blur-md"
          style={{ paddingBottom: footerPaddingBottom }}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => toggleFavorite(kindergarten)}
              className={`flex h-12 w-14 flex-shrink-0 items-center justify-center rounded-2xl border transition-all ${
                isFav
                  ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
                  : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-red-500'
              }`}
              aria-label={isFav ? '찜 해제' : '찜하기'}
            >
              <Heart className={`h-5 w-5 ${isFav ? 'fill-red-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onCompareToggle}
              disabled={!isInCompare && !canAddToCompare}
              className={`flex-1 rounded-2xl py-3 text-sm font-bold transition-colors ${
                isInCompare
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : canAddToCompare
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              {isInCompare ? '✓ 비교함에서 제거' : '+ 비교함에 담기'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-gray-900">{value}</div>
    </div>
  );
}
