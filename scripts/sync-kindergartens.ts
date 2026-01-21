/**
 * 유치원 알리미 API 데이터 배치 동기화 스크립트
 *
 * 전국 시군구별로 API를 호출하여 유치원 데이터를 수집하고
 * Supabase에 저장합니다.
 *
 * 사용법:
 *   pnpm sync:kindergartens                    # 전체 동기화
 *   pnpm sync:kindergartens -- --test          # 테스트 모드 (서울 종로구만)
 *   pnpm sync:kindergartens -- --save-json     # JSON 파일로 저장
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// .env.local 파일을 우선 로드
config({ path: '.env.local' });
config(); // .env 파일도 fallback으로 로드

import { SIGUNGU_CODES, type SigunguCode } from './data/sigungu-codes';

// ============================================================================
// 타입 정의
// ============================================================================

interface BasicInfo2Row {
  kindercode: string;
  kindername: string;
  establish: string;
  addr: string;
  telno: string;
  hpaddr?: string;
  opertime?: string;
  clcnt3?: string;
  clcnt4?: string;
  clcnt5?: string;
  mixclcnt?: string;
  shclcnt?: string;
  ppcnt3?: string;
  ppcnt4?: string;
  ppcnt5?: string;
  mixppcnt?: string;
  shppcnt?: string;
  prmstfcnt?: string;
  ag3fpcnt?: string;
  ag4fpcnt?: string;
  ag5fpcnt?: string;
  mixfpcnt?: string;
  spcnfpcnt?: string;
  lttdcdnt?: string;
  lngtcdnt?: string;
}

interface BuildingRow {
  kindercode: string;
  archyy?: string;
  floorcnt?: string;
  bldgprusarea?: string;
  grottar?: string;
}

interface TeachersInfoRow {
  kindercode: string;
  drcnt?: string;
  adcnt?: string;
  hdst_thcnt?: string;
  asps_thcnt?: string;
  gnrl_thcnt?: string;
  spcn_thcnt?: string;
  ntcnt?: string;
  ntrt_thcnt?: string;
  shcnt_thcnt?: string;
  owcnt?: string;
  hdst_tchr_qacnt?: string;
  rgth_gd1_qacnt?: string;
  rgth_gd2_qacnt?: string;
  asth_qacnt?: string;
  spsc_tchr_qacnt?: string;
  nth_qacnt?: string;
  ntth_qacnt?: string;
}

interface LessonDayRow {
  kindercode: string;
  ag3_lsn_dcnt?: string;
  ag4_lsn_dcnt?: string;
  ag5_lsn_dcnt?: string;
  mix_age_lsn_dcnt?: string;
  spcl_lsn_dcnt?: string;
  afsc_pros_lsn_dcnt?: string;
}

interface SchoolBusRow {
  kindercode: string;
  vhcl_oprn_yn: string;
  opra_vhcnt?: string;
}

interface SchoolMealRow {
  kindercode: string;
  mlsr_oprn_way_tp_cd?: string;
}

interface ClassAreaRow {
  kindercode: string;
  clsrarea?: string;
  otsparea?: string;
}

interface YearOfWorkRow {
  kindercode: string;
  yy1_undr_thcnt?: string;
  yy1_abv_yy2_undr_thcnt?: string;
  yy2_abv_yy4_undr_thcnt?: string;
  yy4_abv_yy6_undr_thcnt?: string;
  yy6_abv_thcnt?: string;
}

interface EnvironmentHygieneRow {
  kindercode: string;
  mdst_chk_dt?: string;
  mdst_chk_rslt_cd?: string;
  ilmn_chk_dt?: string;
  ilmn_chk_rslt_cd?: string;
  fxtm_dsnf_trgt_yn?: string;
  fxtm_dsnf_chk_dt?: string;
  fxtm_dsnf_chk_rslt_tp_cd?: string;
  arql_chk_dt?: string;
  arql_chk_rslt_tp_cd?: string;
}

interface SafetyEduRow {
  kindercode: string;
  plyg_ck_yn?: string;
  plyg_ck_dt?: string;
  plyg_ck_rs_cd?: string;
  cctv_ist_yn?: string;
  cctv_ist_total?: string;
  cctv_ist_in?: string;
  cctv_ist_out?: string;
  fire_avd_yn?: string;
  fire_avd_dt?: string;
  fire_safe_yn?: string;
  fire_safe_dt?: string;
  gas_ck_yn?: string;
  gas_ck_dt?: string;
  elect_ck_yn?: string;
  elect_ck_dt?: string;
}

interface DeductionSocietyRow {
  kindercode: string;
  school_ds_yn?: string;
  school_ds_en?: string;
  educate_ds_yn?: string;
  educate_ds_en?: string;
}

interface InsuranceRow {
  kindercode: string;
  insurance_nm?: string;
  insurance_en?: string;
  insurance_yn?: string;
  company1?: string;
  company2?: string;
  company3?: string;
}

interface AfterSchoolRow {
  kindercode: string;
  inor_clcnt?: string;
  pm_rrgn_clcnt?: string;
  oper_time?: string;
}

interface KindergartenRecord {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
  type: string;
  capacity: number;
  current_count: number;
  has_bus: boolean;
  bus_count: number;
  meal_type: string | null;
  has_after_school: boolean;
  area_per_child: number;
  phone: string | null;
  homepage: string | null;
  operation_hours: string | null;
  has_playground: boolean;
  lat: number | null;
  lng: number | null;
  batch_synced_at: string;
  data_version: string;
  // 추가 필드 (원시 데이터 포함)
  raw_data: {
    basicInfo2: BasicInfo2Row | null;
    building: BuildingRow | null;
    teachersInfo: TeachersInfoRow | null;
    lessonDay: LessonDayRow | null;
    schoolBus: SchoolBusRow | null;
    schoolMeal: SchoolMealRow | null;
    classArea: ClassAreaRow | null;
    yearOfWork: YearOfWorkRow | null;
    environmentHygiene: EnvironmentHygieneRow | null;
    safetyEdu: SafetyEduRow | null;
    deductionSociety: DeductionSocietyRow | null;
    afterSchool: AfterSchoolRow | null;
    insurance: InsuranceRow[];
  };
}

// ============================================================================
// 상수 정의
// ============================================================================

const API_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/api/notice';

// 수집할 엔드포인트 (13개 중 12개 - basicInfo 제외, basicInfo2 사용)
const ENDPOINTS = {
  basicInfo2: 'basicInfo2',
  building: 'building',
  classArea: 'classArea',
  teachersInfo: 'teachersInfo',
  lessonDay: 'lessonDay',
  schoolMeal: 'schoolMeal',
  schoolBus: 'schoolBus',
  yearOfWork: 'yearOfWork',
  environmentHygiene: 'environmentHygiene',
  safetyEdu: 'safetyEdu',
  deductionSociety: 'deductionSociety',
  insurance: 'insurance',
  afterSchoolPresent: 'afterSchoolPresent',
} as const;

// 요청 간 지연 시간 (ms)
const REQUEST_DELAY = 300;

// ============================================================================
// 유틸리티 함수
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = { info: '[INFO]', warn: '[WARN]', error: '[ERROR]' }[level];
  const output = level === 'error' ? console.error : console.log;
  output(`${timestamp} ${prefix} ${message}`);
}

function parseArea(areaStr: string | undefined): number {
  if (!areaStr) return 0;
  const match = String(areaStr).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseInstitutionType(establish: string): string {
  if (establish.includes('공립')) return 'public';
  if (establish.includes('사립') || establish.includes('법인')) return 'private';
  return 'home';
}

function parseMealType(mlsrOprnWayTpCd: string | undefined): string | null {
  if (!mlsrOprnWayTpCd) return null;
  if (mlsrOprnWayTpCd.includes('직영')) return 'direct';
  if (mlsrOprnWayTpCd.includes('위탁')) return 'outsourced';
  return null;
}

// ============================================================================
// API 호출 함수
// ============================================================================

async function fetchJsonData<T>(
  endpoint: string,
  eduSidoCode: string,
  sggCode: string,
  apiKey: string
): Promise<T[]> {
  const url = `${API_BASE_URL}/${endpoint}.do?key=${apiKey}&sidoCode=${eduSidoCode}&sggCode=${sggCode}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      log(`Failed to fetch ${endpoint} for sgg ${sggCode}: ${response.status}`, 'error');
      return [];
    }

    const data = await response.json();
    return data.kinderInfo || [];
  } catch (error) {
    log(`Error fetching ${endpoint} for sgg ${sggCode}: ${error}`, 'error');
    return [];
  }
}

// ============================================================================
// 데이터 수집 함수
// ============================================================================

interface CollectedData {
  basicInfo2: BasicInfo2Row[];
  building: BuildingRow[];
  classArea: ClassAreaRow[];
  teachersInfo: TeachersInfoRow[];
  lessonDay: LessonDayRow[];
  schoolMeal: SchoolMealRow[];
  schoolBus: SchoolBusRow[];
  yearOfWork: YearOfWorkRow[];
  environmentHygiene: EnvironmentHygieneRow[];
  safetyEdu: SafetyEduRow[];
  deductionSociety: DeductionSocietyRow[];
  insurance: InsuranceRow[];
  afterSchool: AfterSchoolRow[];
}

async function collectSigunguData(
  sigungu: SigunguCode,
  apiKey: string
): Promise<CollectedData> {
  const { adminSidoCode, sggCode } = sigungu;

  // 병렬로 13개 엔드포인트 데이터 수집
  const [
    basicInfo2,
    building,
    classArea,
    teachersInfo,
    lessonDay,
    schoolMeal,
    schoolBus,
    yearOfWork,
    environmentHygiene,
    safetyEdu,
    deductionSociety,
    insurance,
    afterSchool,
  ] = await Promise.all([
    fetchJsonData<BasicInfo2Row>(ENDPOINTS.basicInfo2, adminSidoCode, sggCode, apiKey),
    fetchJsonData<BuildingRow>(ENDPOINTS.building, adminSidoCode, sggCode, apiKey),
    fetchJsonData<ClassAreaRow>(ENDPOINTS.classArea, adminSidoCode, sggCode, apiKey),
    fetchJsonData<TeachersInfoRow>(ENDPOINTS.teachersInfo, adminSidoCode, sggCode, apiKey),
    fetchJsonData<LessonDayRow>(ENDPOINTS.lessonDay, adminSidoCode, sggCode, apiKey),
    fetchJsonData<SchoolMealRow>(ENDPOINTS.schoolMeal, adminSidoCode, sggCode, apiKey),
    fetchJsonData<SchoolBusRow>(ENDPOINTS.schoolBus, adminSidoCode, sggCode, apiKey),
    fetchJsonData<YearOfWorkRow>(ENDPOINTS.yearOfWork, adminSidoCode, sggCode, apiKey),
    fetchJsonData<EnvironmentHygieneRow>(ENDPOINTS.environmentHygiene, adminSidoCode, sggCode, apiKey),
    fetchJsonData<SafetyEduRow>(ENDPOINTS.safetyEdu, adminSidoCode, sggCode, apiKey),
    fetchJsonData<DeductionSocietyRow>(ENDPOINTS.deductionSociety, adminSidoCode, sggCode, apiKey),
    fetchJsonData<InsuranceRow>(ENDPOINTS.insurance, adminSidoCode, sggCode, apiKey),
    fetchJsonData<AfterSchoolRow>(ENDPOINTS.afterSchoolPresent, adminSidoCode, sggCode, apiKey),
  ]);

  return {
    basicInfo2,
    building,
    classArea,
    teachersInfo,
    lessonDay,
    schoolMeal,
    schoolBus,
    yearOfWork,
    environmentHygiene,
    safetyEdu,
    deductionSociety,
    insurance,
    afterSchool,
  };
}

// ============================================================================
// 데이터 변환 함수
// ============================================================================

function transformData(
  sigungu: SigunguCode,
  data: CollectedData,
  dataVersion: string
): KindergartenRecord[] {
  // 각 데이터를 kindercode로 인덱싱
  const buildingMap = new Map(data.building.map((item) => [item.kindercode, item]));
  const classAreaMap = new Map(data.classArea.map((item) => [item.kindercode, item]));
  const teachersInfoMap = new Map(data.teachersInfo.map((item) => [item.kindercode, item]));
  const lessonDayMap = new Map(data.lessonDay.map((item) => [item.kindercode, item]));
  const schoolMealMap = new Map(data.schoolMeal.map((item) => [item.kindercode, item]));
  const schoolBusMap = new Map(data.schoolBus.map((item) => [item.kindercode, item]));
  const yearOfWorkMap = new Map(data.yearOfWork.map((item) => [item.kindercode, item]));
  const environmentHygieneMap = new Map(data.environmentHygiene.map((item) => [item.kindercode, item]));
  const safetyEduMap = new Map(data.safetyEdu.map((item) => [item.kindercode, item]));
  const deductionSocietyMap = new Map(data.deductionSociety.map((item) => [item.kindercode, item]));
  const afterSchoolMap = new Map(data.afterSchool.map((item) => [item.kindercode, item]));

  // insurance는 유치원당 여러 행이 있으므로 그룹화
  const insuranceMap = new Map<string, InsuranceRow[]>();
  for (const item of data.insurance) {
    const existing = insuranceMap.get(item.kindercode) || [];
    existing.push(item);
    insuranceMap.set(item.kindercode, existing);
  }

  const now = new Date().toISOString();

  return data.basicInfo2.map((basic) => {
    const busData = schoolBusMap.get(basic.kindercode);
    const mealData = schoolMealMap.get(basic.kindercode);
    const areaData = classAreaMap.get(basic.kindercode);
    const afterSchoolData = afterSchoolMap.get(basic.kindercode);

    // 정원 계산 (prmstfcnt가 있으면 사용, 없으면 개별 합산)
    const capacity = basic.prmstfcnt
      ? parseInt(basic.prmstfcnt, 10)
      : parseInt(basic.ppcnt3 || '0', 10) +
        parseInt(basic.ppcnt4 || '0', 10) +
        parseInt(basic.ppcnt5 || '0', 10) +
        parseInt(basic.mixppcnt || '0', 10) +
        parseInt(basic.shppcnt || '0', 10);

    // 현원 계산 (연령별 현원 합산)
    const currentCount =
      parseInt(basic.ag3fpcnt || '0', 10) +
      parseInt(basic.ag4fpcnt || '0', 10) +
      parseInt(basic.ag5fpcnt || '0', 10) +
      parseInt(basic.mixfpcnt || '0', 10) +
      parseInt(basic.spcnfpcnt || '0', 10);

    // 면적 계산
    const totalArea = parseArea(areaData?.clsrarea);
    const areaPerChild = capacity > 0 ? Math.round((totalArea / capacity) * 10) / 10 : 0;

    // 실외 놀이터 여부
    const outdoorArea = parseArea(areaData?.otsparea);
    const hasPlayground = outdoorArea > 0;

    // 방과후 과정 여부 (방과후 학급 또는 오후 돌봄 학급 존재)
    const hasAfterSchool =
      parseInt(afterSchoolData?.inor_clcnt || '0', 10) > 0 ||
      parseInt(afterSchoolData?.pm_rrgn_clcnt || '0', 10) > 0;

    // 면적 이상치 처리: 50㎡ 초과 시 0으로 처리 (비정상 데이터)
    const normalizedAreaPerChild = areaPerChild > 50 ? 0 : areaPerChild;

    // 좌표 파싱 (basicInfo2에서 제공)
    const lat = basic.lttdcdnt ? parseFloat(basic.lttdcdnt) : null;
    const lng = basic.lngtcdnt ? parseFloat(basic.lngtcdnt) : null;

    return {
      kindercode: basic.kindercode,
      name: basic.kindername,
      address: basic.addr,
      sido_code: sigungu.adminSidoCode,
      sigungu_code: sigungu.sggCode,
      type: parseInstitutionType(basic.establish),
      capacity,
      current_count: currentCount,
      has_bus: busData?.vhcl_oprn_yn === 'Y',
      bus_count: parseInt(busData?.opra_vhcnt || '0', 10),
      meal_type: parseMealType(mealData?.mlsr_oprn_way_tp_cd),
      has_after_school: hasAfterSchool,
      area_per_child: normalizedAreaPerChild,
      phone: basic.telno || null,
      homepage: basic.hpaddr || null,
      operation_hours: basic.opertime || null,
      has_playground: hasPlayground,
      lat,
      lng,
      batch_synced_at: now,
      data_version: dataVersion,
      raw_data: {
        basicInfo2: basic,
        building: buildingMap.get(basic.kindercode) || null,
        teachersInfo: teachersInfoMap.get(basic.kindercode) || null,
        lessonDay: lessonDayMap.get(basic.kindercode) || null,
        schoolBus: busData || null,
        schoolMeal: mealData || null,
        classArea: areaData || null,
        yearOfWork: yearOfWorkMap.get(basic.kindercode) || null,
        environmentHygiene: environmentHygieneMap.get(basic.kindercode) || null,
        safetyEdu: safetyEduMap.get(basic.kindercode) || null,
        deductionSociety: deductionSocietyMap.get(basic.kindercode) || null,
        afterSchool: afterSchoolData || null,
        insurance: insuranceMap.get(basic.kindercode) || [],
      },
    };
  });
}

// ============================================================================
// Supabase 저장 함수
// ============================================================================

async function upsertToSupabase(
  supabase: ReturnType<typeof createClient>,
  records: KindergartenRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  // 배치 단위로 upsert (100개씩)
  const BATCH_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    // raw_data 제외하고 저장 (DB 스키마에 맞게)
    const dbRecords = batch.map(({ raw_data, ...rest }) => rest);

    const { error } = await supabase.from('kindergartens').upsert(dbRecords, {
      onConflict: 'kindercode',
      ignoreDuplicates: false,
    });

    if (error) {
      log(`Upsert error: ${error.message}`, 'error');
    } else {
      successCount += batch.length;
    }
  }

  return successCount;
}

async function updateSyncMetadata(
  supabase: ReturnType<typeof createClient>,
  dataVersion: string,
  recordCount: number
): Promise<void> {
  const { error } = await supabase.from('data_sync_metadata').upsert(
    {
      endpoint: 'all',
      data_version: dataVersion,
      record_count: recordCount,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint,data_version' }
  );

  if (error) {
    log(`Failed to update sync metadata: ${error.message}`, 'warn');
  }
}

// ============================================================================
// 메인 함수
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isTestMode = args.includes('--test');
  const saveToJson = args.includes('--save-json');

  log('Starting kindergarten data sync...');
  log(`Collecting data from ${Object.keys(ENDPOINTS).length} endpoints`);
  if (isTestMode) {
    log('Running in TEST MODE - only syncing Seoul Jongno-gu');
  }
  if (saveToJson) {
    log('Will save results to JSON file');
  }

  // 환경 변수 확인
  const apiKey = process.env.KINDERGARTEN_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    log('KINDERGARTEN_API_KEY is not set', 'error');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    log('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set', 'error');
    log('Running in dry-run mode (no database save)');
  }

  // Supabase 클라이언트 생성 (있는 경우만)
  const supabase =
    supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

  // 데이터 버전 (현재 학기)
  const now = new Date();
  const year = now.getFullYear();
  const semester = now.getMonth() < 7 ? 1 : 2;
  const dataVersion = `${year}-${semester}학기`;

  log(`Data version: ${dataVersion}`);

  // 테스트 모드면 서울 종로구만
  const sigunguList = isTestMode
    ? SIGUNGU_CODES.filter((sgg) => sgg.sggCode === '11110')
    : SIGUNGU_CODES;

  log(`Total sigungu to process: ${sigunguList.length}`);

  let totalRecords = 0;
  let processedCount = 0;
  const allRecords: KindergartenRecord[] = [];

  // 각 시군구별 데이터 수집
  for (const sigungu of sigunguList) {
    processedCount++;
    const progress = `[${processedCount}/${sigunguList.length}]`;

    try {
      log(`${progress} Processing ${sigungu.sidoName} ${sigungu.sggName} (${sigungu.sggCode})...`);

      // 데이터 수집 (13개 엔드포인트 병렬 호출)
      const collectedData = await collectSigunguData(sigungu, apiKey);

      if (collectedData.basicInfo2.length === 0) {
        log(`  No data found`, 'warn');
        continue;
      }

      log(`  Found ${collectedData.basicInfo2.length} kindergartens`);

      // 데이터 변환
      const records = transformData(sigungu, collectedData, dataVersion);

      // 전체 레코드에 추가 (JSON 저장용)
      if (saveToJson) {
        allRecords.push(...records);
      }

      // Supabase에 저장 (있는 경우만)
      if (supabase) {
        const savedCount = await upsertToSupabase(supabase, records);
        totalRecords += savedCount;
        log(`  Saved ${savedCount} records`);
      } else {
        totalRecords += records.length;
        log(`  [DRY-RUN] Would save ${records.length} records`);
      }

      // Rate limiting 대응
      await sleep(REQUEST_DELAY);
    } catch (error) {
      log(`Error processing ${sigungu.sggName}: ${error}`, 'error');
    }
  }

  // 동기화 메타데이터 업데이트
  if (supabase) {
    await updateSyncMetadata(supabase, dataVersion, totalRecords);
  }

  // JSON 파일로 저장
  if (saveToJson && allRecords.length > 0) {
    const outputDir = path.join(process.cwd(), 'scripts', 'data-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const outputPath = path.join(outputDir, `kindergartens-full-${timestamp}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(allRecords, null, 2));
    log(`Saved ${allRecords.length} records to ${outputPath}`);
  }

  log(`Sync completed. Total records: ${totalRecords}`);
}

// 실행
main().catch((error) => {
  log(`Fatal error: ${error}`, 'error');
  process.exit(1);
});
