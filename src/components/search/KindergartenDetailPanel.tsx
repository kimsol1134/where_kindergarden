'use client';

import { X, Phone, MapPin, Users, Bus, Clock, Utensils, Building, Leaf } from 'lucide-react';
import type { Kindergarten } from '@/types';

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-orange-600 bg-orange-50' },
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

export function KindergartenDetailPanel({
  kindergarten,
  onClose,
  onCompareToggle,
  isInCompare,
  canAddToCompare,
}: KindergartenDetailPanelProps) {
  const typeStyle = TYPE_STYLES[kindergarten.type];

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
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
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-1 rounded ${typeStyle.className}`}>
                {typeStyle.label}
              </span>
              <span className="text-xs text-gray-500">{kindergarten.distance.toFixed(1)}km</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{kindergarten.name}</h3>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
              <span>{kindergarten.address}</span>
            </div>
            {kindergarten.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a
                  href={`tel:${kindergarten.phone}`}
                  className="text-emerald-600 hover:underline"
                >
                  {kindergarten.phone}
                </a>
              </div>
            )}
          </div>

          {/* 정원/현원 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              정원 현황
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{kindergarten.capacity}</div>
                <div className="text-xs text-gray-500">정원</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{kindergarten.currentCount}</div>
                <div className="text-xs text-gray-500">현원</div>
              </div>
            </div>
            <div className="mt-3 bg-emerald-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">여유 정원</span>
                <span className="font-bold text-emerald-700">
                  {Math.max(0, kindergarten.capacity - kindergarten.currentCount)}명
                </span>
              </div>
              <div className="mt-2 h-2 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (kindergarten.currentCount / kindergarten.capacity) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 시설 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              시설 정보
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">1인당 면적</span>
                <span className="text-sm font-medium text-gray-900">
                  {kindergarten.areaPerChild.toFixed(1)} ㎡
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-green-500" />
                  실외놀이터
                </span>
                <span className={`text-sm font-medium ${kindergarten.hasPlayground ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {kindergarten.hasPlayground ? '있음' : '없음'}
                </span>
              </div>
            </div>
          </div>

          {/* 운영 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              운영 정보
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Bus className="w-4 h-4 text-blue-500" />
                  셔틀버스
                </span>
                <span className={`text-sm font-medium ${kindergarten.hasBus ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {kindergarten.hasBus ? `운행 (${kindergarten.busCount}대)` : '미운행'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">방과후 과정</span>
                <span className={`text-sm font-medium ${kindergarten.hasAfterSchool ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {kindergarten.hasAfterSchool ? '운영' : '미운영'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-orange-500" />
                  급식 운영
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {MEAL_LABELS[kindergarten.mealType]}
                </span>
              </div>
            </div>
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
