/**
 * 수집된 데이터 품질 분석 스크립트
 */

import * as fs from 'fs';
import * as path from 'path';

interface KindergartenRecord {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
  type: string;
  capacity: number;
  has_bus: boolean;
  bus_count: number;
  meal_type: string | null;
  has_after_school: boolean;
  area_per_child: number;
  phone: string | null;
  has_playground: boolean;
  batch_synced_at: string;
  data_version: string;
}

function analyze() {
  const dataPath = path.join(process.cwd(), 'scripts', 'data-output', 'kindergartens-2026-01-21.json');
  const data: KindergartenRecord[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log('='.repeat(60));
  console.log('유치원 데이터 품질 분석 보고서');
  console.log('='.repeat(60));
  console.log(`\n총 레코드 수: ${data.length}\n`);

  // 1. 필수 필드 누락 검사
  console.log('1. 필수 필드 누락 검사');
  console.log('-'.repeat(40));

  const missingFields = {
    kindercode: data.filter(d => !d.kindercode).length,
    name: data.filter(d => !d.name).length,
    address: data.filter(d => !d.address).length,
    sido_code: data.filter(d => !d.sido_code).length,
    sigungu_code: data.filter(d => !d.sigungu_code).length,
    type: data.filter(d => !d.type).length,
  };

  for (const [field, count] of Object.entries(missingFields)) {
    const status = count === 0 ? '✓' : '✗';
    console.log(`  ${status} ${field}: ${count}개 누락 (${((count / data.length) * 100).toFixed(2)}%)`);
  }

  // 2. 선택 필드 null 비율
  console.log('\n2. 선택 필드 null/0 비율');
  console.log('-'.repeat(40));

  const nullStats = {
    phone: data.filter(d => !d.phone).length,
    meal_type: data.filter(d => !d.meal_type).length,
    capacity_zero: data.filter(d => d.capacity === 0).length,
    area_per_child_zero: data.filter(d => d.area_per_child === 0).length,
  };

  for (const [field, count] of Object.entries(nullStats)) {
    const pct = ((count / data.length) * 100).toFixed(2);
    console.log(`  ${field}: ${count}개 (${pct}%)`);
  }

  // 3. type 분포
  console.log('\n3. 설립유형(type) 분포');
  console.log('-'.repeat(40));

  const typeDistribution: Record<string, number> = {};
  for (const d of data) {
    typeDistribution[d.type] = (typeDistribution[d.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}개 (${((count / data.length) * 100).toFixed(2)}%)`);
  }

  // 4. 시도별 분포
  console.log('\n4. 시도별 분포');
  console.log('-'.repeat(40));

  const sidoDistribution: Record<string, number> = {};
  for (const d of data) {
    sidoDistribution[d.sido_code] = (sidoDistribution[d.sido_code] || 0) + 1;
  }
  const sidoNames: Record<string, string> = {
    '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주',
    '30': '대전', '31': '울산', '36': '세종', '41': '경기', '51': '강원',
    '43': '충북', '44': '충남', '52': '전북', '46': '전남', '47': '경북',
    '48': '경남', '50': '제주'
  };
  for (const [sido, count] of Object.entries(sidoDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sidoNames[sido] || sido}: ${count}개 (${((count / data.length) * 100).toFixed(2)}%)`);
  }

  // 5. Boolean 필드 분포
  console.log('\n5. Boolean 필드 분포');
  console.log('-'.repeat(40));

  const hasBusTrue = data.filter(d => d.has_bus).length;
  const hasAfterSchoolTrue = data.filter(d => d.has_after_school).length;
  const hasPlaygroundTrue = data.filter(d => d.has_playground).length;

  console.log(`  has_bus: true ${hasBusTrue}개 (${((hasBusTrue / data.length) * 100).toFixed(2)}%)`);
  console.log(`  has_after_school: true ${hasAfterSchoolTrue}개 (${((hasAfterSchoolTrue / data.length) * 100).toFixed(2)}%)`);
  console.log(`  has_playground: true ${hasPlaygroundTrue}개 (${((hasPlaygroundTrue / data.length) * 100).toFixed(2)}%)`);

  // 6. 수치 필드 통계
  console.log('\n6. 수치 필드 통계');
  console.log('-'.repeat(40));

  const capacities = data.map(d => d.capacity).filter(c => c > 0);
  const areas = data.map(d => d.area_per_child).filter(a => a > 0);
  const busCounts = data.filter(d => d.has_bus).map(d => d.bus_count);

  if (capacities.length > 0) {
    console.log(`  capacity (정원):`);
    console.log(`    - 최소: ${Math.min(...capacities)}`);
    console.log(`    - 최대: ${Math.max(...capacities)}`);
    console.log(`    - 평균: ${(capacities.reduce((a, b) => a + b, 0) / capacities.length).toFixed(1)}`);
  }

  if (areas.length > 0) {
    console.log(`  area_per_child (1인당 면적):`);
    console.log(`    - 최소: ${Math.min(...areas).toFixed(1)}㎡`);
    console.log(`    - 최대: ${Math.max(...areas).toFixed(1)}㎡`);
    console.log(`    - 평균: ${(areas.reduce((a, b) => a + b, 0) / areas.length).toFixed(1)}㎡`);
  }

  if (busCounts.length > 0) {
    console.log(`  bus_count (차량 운영 유치원 중):`);
    console.log(`    - 최소: ${Math.min(...busCounts)}`);
    console.log(`    - 최대: ${Math.max(...busCounts)}`);
    console.log(`    - 평균: ${(busCounts.reduce((a, b) => a + b, 0) / busCounts.length).toFixed(1)}`);
  }

  // 7. 이상치 검출
  console.log('\n7. 이상치 및 의심 데이터');
  console.log('-'.repeat(40));

  // 정원 0인데 다른 정보가 있는 경우
  const zeroCapacityWithData = data.filter(d => d.capacity === 0 && (d.has_bus || d.has_after_school));
  console.log(`  정원 0이지만 서비스 운영: ${zeroCapacityWithData.length}개`);

  // 1인당 면적이 비정상적으로 큰 경우 (100㎡ 이상)
  const abnormalArea = data.filter(d => d.area_per_child > 100);
  console.log(`  1인당 면적 100㎡ 초과: ${abnormalArea.length}개`);
  if (abnormalArea.length > 0 && abnormalArea.length <= 5) {
    abnormalArea.forEach(d => {
      console.log(`    - ${d.name}: ${d.area_per_child}㎡ (정원: ${d.capacity})`);
    });
  }

  // 버스 있는데 대수가 0인 경우
  const busWithoutCount = data.filter(d => d.has_bus && d.bus_count === 0);
  console.log(`  차량 운영(Y)인데 대수 0: ${busWithoutCount.length}개`);

  // 8. 중복 검사
  console.log('\n8. 중복 검사');
  console.log('-'.repeat(40));

  const kindercodes = data.map(d => d.kindercode);
  const uniqueKindercodes = new Set(kindercodes);
  const duplicateCount = kindercodes.length - uniqueKindercodes.size;
  console.log(`  kindercode 중복: ${duplicateCount}개`);

  const names = data.map(d => d.name);
  const uniqueNames = new Set(names);
  console.log(`  name 중복: ${names.length - uniqueNames.size}개 (동명이인 가능)`);

  // 9. 주소 패턴 검사
  console.log('\n9. 주소 패턴 검사');
  console.log('-'.repeat(40));

  const addressPatterns = {
    seoul: data.filter(d => d.address.includes('서울')).length,
    withZipcode: data.filter(d => /\d{5}/.test(d.address)).length,
    emptyOrShort: data.filter(d => d.address.length < 10).length,
  };
  console.log(`  '서울' 포함: ${addressPatterns.seoul}개`);
  console.log(`  우편번호 포함: ${addressPatterns.withZipcode}개`);
  console.log(`  주소 10자 미만: ${addressPatterns.emptyOrShort}개`);

  // 10. meal_type 분포
  console.log('\n10. 급식유형(meal_type) 분포');
  console.log('-'.repeat(40));

  const mealDistribution: Record<string, number> = {};
  for (const d of data) {
    const key = d.meal_type || 'null';
    mealDistribution[key] = (mealDistribution[key] || 0) + 1;
  }
  for (const [type, count] of Object.entries(mealDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}개 (${((count / data.length) * 100).toFixed(2)}%)`);
  }

  // 11. 샘플 데이터 출력 (이상치)
  console.log('\n11. 샘플 데이터 (이상치 검토용)');
  console.log('-'.repeat(40));

  console.log('\n[정원 0인 유치원 샘플 (최대 3개)]');
  const zeroCapacity = data.filter(d => d.capacity === 0).slice(0, 3);
  zeroCapacity.forEach(d => {
    console.log(`  - ${d.name} (${d.address.slice(0, 30)}...)`);
  });

  console.log('\n[1인당 면적 최대 유치원]');
  const maxAreaKinder = data.reduce((max, d) => d.area_per_child > max.area_per_child ? d : max);
  console.log(`  - ${maxAreaKinder.name}: ${maxAreaKinder.area_per_child}㎡ (정원: ${maxAreaKinder.capacity})`);

  console.log('\n[정원 최대 유치원]');
  const maxCapacityKinder = data.reduce((max, d) => d.capacity > max.capacity ? d : max);
  console.log(`  - ${maxCapacityKinder.name}: ${maxCapacityKinder.capacity}명`);

  console.log('\n' + '='.repeat(60));
  console.log('분석 완료');
  console.log('='.repeat(60));
}

analyze();
