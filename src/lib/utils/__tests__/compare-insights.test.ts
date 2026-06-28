import { describe, expect, it } from 'vitest';
import { getCompareCandidateInsights, getConsultationQuestions } from '../compare-insights';
import type { Kindergarten } from '@/types';

function makeKindergarten(overrides: Partial<Kindergarten>): Kindergarten {
  return {
    kindercode: 'K001',
    name: '테스트유치원',
    type: 'private',
    address: '서울시',
    lat: 37,
    lng: 127,
    distance: 0.8,
    sidoCode: '11',
    sigunguCode: '11680',
    capacity: 100,
    currentCount: 90,
    classCountAge3: 0,
    classCountAge4: 0,
    classCountAge5: 0,
    capacityAge3: 0,
    capacityAge4: 0,
    capacityAge5: 0,
    currentAge3: 0,
    currentAge4: 0,
    currentAge5: 0,
    classCountMix: 0,
    capacityMix: 0,
    currentMix: 0,
    capacitySpecial: 0,
    currentSpecial: 0,
    hasBus: true,
    busCount: 2,
    mealType: 'direct',
    hasAfterSchool: true,
    establishDate: '20200101',
    areaPerChild: 5,
    hasPlayground: true,
    buildingYear: 2020,
    floorInfo: null,
    classroomArea: 0,
    indoorPlaygroundArea: 0,
    outdoorPlaygroundArea: 0,
    teacherCount: 0,
    seniorTeacherCount: 0,
    cctvCount: 0,
    phone: null,
    homepage: null,
    operationHours: null,
    ...overrides,
  };
}

describe('compare insights', () => {
  it('summarizes candidate reasons and cautions', () => {
    const insights = getCompareCandidateInsights([
      makeKindergarten({ kindercode: 'K001', name: '가온유치원' }),
      makeKindergarten({
        kindercode: 'K002',
        name: '봄빛유치원',
        distance: 2.5,
        hasBus: false,
        hasAfterSchool: false,
        mealType: 'outsourced',
        areaPerChild: 6,
      }),
    ]);

    expect(insights[0].reasons).toContain('도보권에 가까움');
    expect(insights[1].reasons).toContain('1인당 면적 가장 넓음');
    expect(insights[1].cautions).toContain('통학차량 미운영');
  });

  it('creates consultation questions from compared items', () => {
    const questions = getConsultationQuestions([makeKindergarten({})]);

    expect(questions).toContain('우리 주소 기준 통학차량 노선과 승하차 시간을 확인하세요.');
    expect(questions).toContain('2026학년도 현재 결원과 추가모집 가능 여부를 전화로 확인하세요.');
  });
});
