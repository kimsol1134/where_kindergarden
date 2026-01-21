import { describe, it, expect } from 'vitest';
import { transformToKindergartens } from './transformer';
import type {
  BasicInfoResponse,
  CurrentCountResponse,
  SchoolBusResponse,
  MealInfoResponse,
  AreaInfoResponse,
  AfterSchoolResponse,
} from '@/types';

describe('transformToKindergartens', () => {
  const mockBasicInfo: BasicInfoResponse[] = [
    {
      kindercode: 'K001',
      kindername: '테스트유치원',
      establish: '공립단설',
      edate: '2020-01-01',
      oession: '종일반',
      addr: '서울시 강남구 테스트로 123',
      telno: '02-1234-5678',
      hpaddr: 'http://test.com',
      opertime: '07:00~19:00',
      clcnt3: '2',
      clcnt4: '2',
      clcnt5: '2',
      mixclcnt: '0',
      shclcnt: '0',
      ppcnt3: '20',
      ppcnt4: '20',
      ppcnt5: '20',
      mixppcnt: '0',
      shppcnt: '0',
      ppCnt: '60',
    },
    {
      kindercode: 'K002',
      kindername: '사립어린이집',
      establish: '사립',
      edate: '2018-03-01',
      oession: '종일반',
      addr: '서울시 강남구 테스트로 456',
      telno: '02-9876-5432',
      hpaddr: '',
      opertime: '07:30~19:30',
      clcnt3: '1',
      clcnt4: '1',
      clcnt5: '1',
      mixclcnt: '1',
      shclcnt: '0',
      ppcnt3: '15',
      ppcnt4: '15',
      ppcnt5: '15',
      mixppcnt: '10',
      shppcnt: '0',
      ppCnt: '55',
    },
  ];

  const mockCurrentCount: CurrentCountResponse[] = [
    {
      kindercode: 'K001',
      pm3_acnt: '8',
      pf3_acnt: '10',
      pm4_acnt: '9',
      pf4_acnt: '8',
      pm5_acnt: '10',
      pf5_acnt: '9',
      mixm_acnt: '0',
      mixf_acnt: '0',
      shm_acnt: '0',
      shf_acnt: '0',
    },
    {
      kindercode: 'K002',
      pm3_acnt: '5',
      pf3_acnt: '6',
      pm4_acnt: '7',
      pf4_acnt: '5',
      pm5_acnt: '6',
      pf5_acnt: '7',
      mixm_acnt: '3',
      mixf_acnt: '4',
      shm_acnt: '0',
      shf_acnt: '0',
    },
  ];

  const mockSchoolBus: SchoolBusResponse[] = [
    { kindercode: 'K001', vhcnt: '2', opra_yn: 'Y' },
    { kindercode: 'K002', vhcnt: '0', opra_yn: 'N' },
  ];

  const mockMealInfo: MealInfoResponse[] = [
    { kindercode: 'K001', mlsvof: '직영', phgrinfl: '있음' },
    { kindercode: 'K002', mlsvof: '위탁급식', phgrinfl: '있음' },
  ];

  const mockAreaInfo: AreaInfoResponse[] = [
    { kindercode: 'K001', gfa: '500', pga: '200', plgrdco: '2' },
    { kindercode: 'K002', gfa: '300', pga: '0', plgrdco: '0' },
  ];

  const mockAfterSchool: AfterSchoolResponse[] = [
    { kindercode: 'K001', afschDn: 'Y' },
    { kindercode: 'K002', afschDn: 'N' },
  ];

  it('기본 정보를 올바르게 변환한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: mockCurrentCount,
      schoolBus: mockSchoolBus,
      mealInfo: mockMealInfo,
      areaInfo: mockAreaInfo,
      afterSchool: mockAfterSchool,
    });

    expect(result).toHaveLength(2);
    expect(result[0].kindercode).toBe('K001');
    expect(result[0].name).toBe('테스트유치원');
    expect(result[0].address).toBe('서울시 강남구 테스트로 123');
  });

  it('설립유형을 올바르게 변환한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: mockCurrentCount,
      schoolBus: mockSchoolBus,
      mealInfo: mockMealInfo,
      areaInfo: mockAreaInfo,
      afterSchool: mockAfterSchool,
    });

    expect(result[0].type).toBe('public'); // 공립단설
    expect(result[1].type).toBe('private'); // 사립
  });

  it('현원을 올바르게 계산한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: mockCurrentCount,
      schoolBus: mockSchoolBus,
      mealInfo: mockMealInfo,
      areaInfo: mockAreaInfo,
      afterSchool: mockAfterSchool,
    });

    // K001: 8+10+9+8+10+9 = 54
    expect(result[0].currentCount).toBe(54);
    // K002: 5+6+7+5+6+7+3+4 = 43
    expect(result[1].currentCount).toBe(43);
  });

  it('통학차량 정보를 올바르게 변환한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: mockCurrentCount,
      schoolBus: mockSchoolBus,
      mealInfo: mockMealInfo,
      areaInfo: mockAreaInfo,
      afterSchool: mockAfterSchool,
    });

    expect(result[0].hasBus).toBe(true);
    expect(result[0].busCount).toBe(2);
    expect(result[1].hasBus).toBe(false);
    expect(result[1].busCount).toBe(0);
  });

  it('급식 유형을 올바르게 변환한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: mockCurrentCount,
      schoolBus: mockSchoolBus,
      mealInfo: mockMealInfo,
      areaInfo: mockAreaInfo,
      afterSchool: mockAfterSchool,
    });

    expect(result[0].mealType).toBe('direct'); // 직영
    expect(result[1].mealType).toBe('outsourced'); // 위탁급식
  });

  it('방과후 과정 여부를 올바르게 변환한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: mockCurrentCount,
      schoolBus: mockSchoolBus,
      mealInfo: mockMealInfo,
      areaInfo: mockAreaInfo,
      afterSchool: mockAfterSchool,
    });

    expect(result[0].hasAfterSchool).toBe(true);
    expect(result[1].hasAfterSchool).toBe(false);
  });

  it('놀이터 유무를 올바르게 변환한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: mockCurrentCount,
      schoolBus: mockSchoolBus,
      mealInfo: mockMealInfo,
      areaInfo: mockAreaInfo,
      afterSchool: mockAfterSchool,
    });

    expect(result[0].hasPlayground).toBe(true); // plgrdco: 2
    expect(result[1].hasPlayground).toBe(false); // plgrdco: 0
  });

  it('빈 데이터를 처리한다', () => {
    const result = transformToKindergartens({
      basicInfo: [],
      currentCount: [],
      schoolBus: [],
      mealInfo: [],
      areaInfo: [],
      afterSchool: [],
    });

    expect(result).toHaveLength(0);
  });

  it('일부 데이터가 누락된 경우에도 처리한다', () => {
    const result = transformToKindergartens({
      basicInfo: mockBasicInfo,
      currentCount: [], // 현원 데이터 없음
      schoolBus: [],
      mealInfo: [],
      areaInfo: [],
      afterSchool: [],
    });

    expect(result).toHaveLength(2);
    expect(result[0].currentCount).toBe(0);
    expect(result[0].hasBus).toBe(false);
    expect(result[0].mealType).toBe('none');
  });
});
