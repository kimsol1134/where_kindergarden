'use client';

import {
  X,
  Phone,
  MapPin,
  Users,
  Bus,
  Clock,
  Utensils,
  Building,
  Leaf,
  GraduationCap,
  Calendar,
  Globe,
  Shield,
  Home,
  SquareStack,
  ExternalLink,
  Coins,
} from 'lucide-react';
import type { Kindergarten } from '@/types';
import { getKindergartenInfoUrl } from '@/lib/utils/kindergarten-url';

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

/** 급식 유형 라벨 */
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

/** 설립일 포맷 함수 */
function formatEstablishDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

/** 정보 행 컴포넌트 */
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
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium ${valueClassName ?? 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

export function KindergartenDetailPanel({
  kindergarten,
  onClose,
  onCompareToggle,
  isInCompare,
  canAddToCompare,
}: KindergartenDetailPanelProps) {
  const typeStyle = TYPE_STYLES[kindergarten.type];
  const totalClassCount =
    kindergarten.classCountAge3 + kindergarten.classCountAge4 + kindergarten.classCountAge5 + kindergarten.classCountMix;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900">상세 정보</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* 기관 기본 정보 */}
          <div className="p-5 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-1 rounded ${typeStyle.className}`}>
                {typeStyle.label}
              </span>
              <span className="text-xs text-gray-500">{kindergarten.distance.toFixed(1)}km</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{kindergarten.name}</h3>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{kindergarten.address}</span>
              </div>

              {kindergarten.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${kindergarten.phone}`}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    {kindergarten.phone}
                  </a>
                </div>
              )}

              {kindergarten.homepage && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a
                    href={kindergarten.homepage.startsWith('http') ? kindergarten.homepage : `http://${kindergarten.homepage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline font-medium truncate"
                  >
                    홈페이지 바로가기
                  </a>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>설립일: {formatEstablishDate(kindergarten.establishDate)}</span>
              </div>

              {kindergarten.operationHours && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>운영시간: {kindergarten.operationHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* 정원/현원 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              정원 현황
            </h4>

            {/* 전체 현황 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{kindergarten.capacity}</div>
                <div className="text-xs text-gray-500">전체 정원</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{kindergarten.currentCount}</div>
                <div className="text-xs text-gray-500">현재 원아 수</div>
              </div>
            </div>

            {/* 여유 정원 바 */}
            <div className="bg-gray-100 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">여유 정원</span>
                <span className="font-bold text-emerald-700">
                  {Math.max(0, kindergarten.capacity - kindergarten.currentCount)}명
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (kindergarten.currentCount / Math.max(1, kindergarten.capacity)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* 연령별 현황 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 mb-2">연령별 현황</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-md p-2">
                  <div className="text-xs text-gray-500 mb-1">만 3세</div>
                  <div className="text-lg font-bold text-emerald-600">{kindergarten.currentAge3}명</div>
                  <div className="text-[10px] text-gray-400">정원 {kindergarten.capacityAge3} · {kindergarten.classCountAge3}학급</div>
                </div>
                <div className="bg-white rounded-md p-2">
                  <div className="text-xs text-gray-500 mb-1">만 4세</div>
                  <div className="text-lg font-bold text-emerald-600">{kindergarten.currentAge4}명</div>
                  <div className="text-[10px] text-gray-400">정원 {kindergarten.capacityAge4} · {kindergarten.classCountAge4}학급</div>
                </div>
                <div className="bg-white rounded-md p-2">
                  <div className="text-xs text-gray-500 mb-1">만 5세</div>
                  <div className="text-lg font-bold text-emerald-600">{kindergarten.currentAge5}명</div>
                  <div className="text-[10px] text-gray-400">정원 {kindergarten.capacityAge5} · {kindergarten.classCountAge5}학급</div>
                </div>
              </div>
            </div>

            {/* 혼합반/특수학급 현황 */}
            {(kindergarten.capacityMix > 0 || kindergarten.currentMix > 0 || kindergarten.capacitySpecial > 0 || kindergarten.currentSpecial > 0) && (
              <div className="bg-amber-50 rounded-lg p-3 mt-3">
                <div className="text-xs font-medium text-amber-700 mb-2">혼합반/특수학급</div>
                <div className={`grid gap-2 text-center ${
                  (kindergarten.capacityMix > 0 || kindergarten.currentMix > 0) && (kindergarten.capacitySpecial > 0 || kindergarten.currentSpecial > 0)
                    ? 'grid-cols-2'
                    : 'grid-cols-1'
                }`}>
                  {(kindergarten.capacityMix > 0 || kindergarten.currentMix > 0) && (
                    <div className="bg-white rounded-md p-2">
                      <div className="text-xs text-amber-600 mb-1">혼합반</div>
                      <div className="text-lg font-bold text-emerald-600">{kindergarten.currentMix}명</div>
                      <div className="text-[10px] text-gray-400">정원 {kindergarten.capacityMix} · {kindergarten.classCountMix}학급</div>
                    </div>
                  )}
                  {(kindergarten.capacitySpecial > 0 || kindergarten.currentSpecial > 0) && (
                    <div className="bg-white rounded-md p-2">
                      <div className="text-xs text-purple-600 mb-1">특수학급</div>
                      <div className="text-lg font-bold text-emerald-600">{kindergarten.currentSpecial}명</div>
                      <div className="text-[10px] text-gray-400">정원 {kindergarten.capacitySpecial}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 교직원 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              교직원 정보
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{kindergarten.teacherCount}</div>
                <div className="text-xs text-gray-500">전체 교사</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-600">{kindergarten.seniorTeacherCount}</div>
                <div className="text-xs text-gray-500">수석/부장교사</div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-sm text-gray-600">
                교사 1인당 원아 수: <span className="font-bold text-gray-900">
                  {kindergarten.teacherCount > 0
                    ? (kindergarten.currentCount / kindergarten.teacherCount).toFixed(1)
                    : '-'}
                </span>명
              </span>
            </div>
          </div>

          {/* 시설 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              시설 정보
            </h4>

            <div className="space-y-0">
              <InfoRow
                label="총 학급 수"
                value={`${totalClassCount}학급`}
                icon={<SquareStack className="w-4 h-4 text-gray-400" />}
              />
              <InfoRow
                label="1인당 면적"
                value={`${kindergarten.areaPerChild.toFixed(1)} ㎡`}
                icon={<Home className="w-4 h-4 text-gray-400" />}
              />
              <InfoRow
                label="교실 면적"
                value={`${kindergarten.classroomArea.toFixed(1)} ㎡`}
              />
              <InfoRow
                label="실내놀이터"
                value={kindergarten.indoorPlaygroundArea > 0 ? `${kindergarten.indoorPlaygroundArea.toFixed(1)} ㎡` : '없음'}
                valueClassName={kindergarten.indoorPlaygroundArea > 0 ? 'text-emerald-600' : 'text-gray-400'}
              />
              <InfoRow
                label="실외놀이터"
                value={
                  kindergarten.hasPlayground && kindergarten.outdoorPlaygroundArea > 0
                    ? `${kindergarten.outdoorPlaygroundArea.toFixed(1)} ㎡`
                    : '없음'
                }
                icon={<Leaf className="w-4 h-4 text-green-500" />}
                valueClassName={
                  kindergarten.hasPlayground && kindergarten.outdoorPlaygroundArea > 0
                    ? 'text-emerald-600'
                    : 'text-gray-400'
                }
              />
              {kindergarten.buildingYear && (
                <InfoRow
                  label="건축년도"
                  value={`${kindergarten.buildingYear}년`}
                />
              )}
              {kindergarten.floorInfo && (
                <InfoRow
                  label="층 정보"
                  value={kindergarten.floorInfo}
                />
              )}
            </div>
          </div>

          {/* 운영 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              운영 정보
            </h4>
            <div className="space-y-0">
              <InfoRow
                label="셔틀버스"
                value={kindergarten.hasBus ? `운행 (${kindergarten.busCount}대)` : '미운행'}
                icon={<Bus className="w-4 h-4 text-blue-500" />}
                valueClassName={kindergarten.hasBus ? 'text-emerald-600' : 'text-gray-400'}
              />
              <InfoRow
                label="방과후 과정"
                value={kindergarten.hasAfterSchool ? '운영' : '미운영'}
                valueClassName={kindergarten.hasAfterSchool ? 'text-emerald-600' : 'text-gray-400'}
              />
              <InfoRow
                label="급식 운영"
                value={MEAL_LABELS[kindergarten.mealType]}
                icon={<Utensils className="w-4 h-4 text-orange-500" />}
                valueClassName={kindergarten.mealType !== 'none' ? 'text-emerald-600' : 'text-gray-400'}
              />
            </div>
          </div>

          {/* 안전 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              안전 정보
            </h4>
            <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">CCTV 설치</div>
                  <div className="text-xs text-gray-500">원내 안전 관리</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{kindergarten.cctvCount}대</div>
            </div>
          </div>

          {/* 교육비용 정보 (외부 링크) */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              교육비용 정보
            </h4>
            <a
              href={getKindergartenInfoUrl({
                name: kindergarten.name,
                sidoCode: kindergarten.sidoCode,
                sigunguCode: kindergarten.sigunguCode,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-amber-50 hover:bg-amber-100 rounded-lg p-4 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 group-hover:bg-amber-200 rounded-full flex items-center justify-center transition-colors">
                    <Coins className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      교육비용 확인하기
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="text-xs text-gray-500">
                      유치원 알리미에서 상세 페이지 → 비용·회계 탭
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-white">
          <button
            onClick={onCompareToggle}
            disabled={!isInCompare && !canAddToCompare}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              isInCompare
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : canAddToCompare
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isInCompare ? '✓ 비교함에서 제거' : '+ 비교함에 담기'}
          </button>
        </div>
      </div>
    </>
  );
}
