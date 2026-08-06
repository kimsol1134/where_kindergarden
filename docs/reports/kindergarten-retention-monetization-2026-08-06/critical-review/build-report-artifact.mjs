import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportDir = path.join(
  root,
  'docs/reports/kindergarten-retention-monetization-2026-08-06/critical-review'
);
const artifactPath = path.join(reportDir, 'artifact.json');
const evidencePath = path.join(reportDir, 'evidence.json');
const input = JSON.parse(fs.readFileSync(path.join(reportDir, 'analysis-input.json'), 'utf8'));
const analysis = JSON.parse(fs.readFileSync(path.join(reportDir, 'analysis-output.json'), 'utf8'));
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const now = new Date().toISOString();

const behaviorSignals = analysis.behavior_signals.map((row, index) => ({
  rank: index + 1,
  behavior: row.behavior,
  converted_users: row.converted_users,
  denominator_users: row.denominator_users,
  conversion_rate: row.conversion_rate,
  average_minutes: Math.round((row.average_seconds / 60) * 10) / 10,
  measurement_note: row.definition,
}));
const retentionSummary = analysis.new_user_retention.map((row, index) => ({
  order: index + 1,
  day: row.day,
  returned_users: row.returned_users,
  eligible_users: row.eligible_users,
  rate: row.rate,
  cohort_window: `${row.matured_start}~${row.matured_end}`,
}));
const bestLag = analysis.acquisition_alignment.lag_diagnostics.toSorted(
  (left, right) => right.pearson_r - left.pearson_r
)[0];
const vacancyQuality = analysis.public_data_quality.vacancy.quality;

const acquisitionAlignment = [
  {
    order: 1,
    indicator: '12일 활성 사용자',
    current: 124,
    comparison: 62,
    interpretation: '직전 동기간 대비 2.0배; 시즌 유입 증가 확인',
  },
  {
    order: 2,
    indicator: 'ASC App Units / Mixpanel 신규 실행 합',
    current: analysis.acquisition_alignment.asc_known_units,
    comparison: analysis.acquisition_alignment.mixpanel_new_launch_sum,
    interpretation: '정의·날짜·누락일이 달라 설치 수로 합산 금지',
  },
  {
    order: 3,
    indicator: '시차 진단 최고 상관',
    current: bestLag.pearson_r,
    comparison: bestLag.asc_date_shift_days,
    interpretation: 'ASC 날짜를 -1일 이동할 때 스파이크 정렬; 인과·어트리뷰션 증거 아님',
  },
];

const instrumentationIssues = [
  {
    priority: 1,
    issue: '상세 열림 100%',
    previous_risk: '결과 탭과 상세 열림을 같은 함수에서 연속 기록',
    correction: '상세 시트 onAppear에서 실제 노출 기록',
    status: '소스 수정·Simulator 빌드 통과; 출시 후 기준선 재수집 필요',
  },
  {
    priority: 2,
    issue: '공유 완료 의미 불일치',
    previous_risk: '공유 시트 또는 카카오톡 이동 시작을 완료처럼 기록',
    correction: 'Share Initiated와 Result를 분리하고 성공만 legacy Shared 기록',
    status: '소스 수정; 2026-08-06 전후 시계열 직접 비교 금지',
  },
  {
    priority: 3,
    issue: '빈 비교 탭 포함',
    previous_risk: '후보 0~1곳 Compare Viewed가 핵심 가치 경험을 과대계상',
    correction: '후보 2곳 이상일 때만 Compare Viewed 기록',
    status: '소스 수정·회귀 테스트 추가',
  },
  {
    priority: 4,
    issue: '결원 관심 행동 없음',
    previous_risk: 'has_vacancy 데이터 존재를 사용자 관심으로 오해',
    correction: 'Vacancy Viewed와 데이터 버전·로드 상태 기록',
    status: '소스 수정; 최소 14일 관측 후 유료 알림 판단',
  },
  {
    priority: 5,
    issue: '검색 정의 변경',
    previous_risk: '7월 25일 이전 타이핑 중간값이 검색량을 부풀림',
    correction: '600ms 디바운스 이후 기간만 비교',
    status: '분석 코호트 제한 유지',
  },
];

const modelOptions = [
  {
    priority: 1,
    model: '1회성 결정 완료 패스 — 수동 선결제 검증',
    evidence: '후보 2곳 37.9%, 실제 비교 33.9%; 30일 활성 186명',
    risk: '추가 과업과 지불 의향은 미관측, 규모가 작음',
    decision: '제품 개발 전 한 오퍼·한 가격으로 5건 선결제 검증',
  },
  {
    priority: 2,
    model: 'B2B 중립 데이터 관리 파일럿',
    evidence: '공식 데이터 정합성·갱신 문제는 실제로 큼',
    risk: '기관 수요·영업비용 미검증, 유료 노출과 신뢰 충돌 가능',
    decision: '개발 없이 10곳 인터뷰, 3곳 유료 의향 전까지 보류',
  },
  {
    priority: 3,
    model: '결원·모집 알림 시즌권',
    evidence: `실시간 ${analysis.public_data_quality.vacancy.total_count}곳 수집·일일 자동화`,
    risk: '사용자 열람·반복 확인 신호는 아직 없음',
    decision: '14일 Vacancy Viewed 관측과 95% SLA 충족 뒤 무료 대기목록부터',
  },
  {
    priority: 4,
    model: '가족 협업 보드',
    evidence: '과거 공유 시작 2.4%; 실제 완료는 미측정',
    risk: '새 계측 출시 전 가족 도달·지불 이유를 알 수 없음',
    decision: '완료율·재열람을 수집한 뒤 재평가',
  },
  {
    priority: 5,
    model: '기본 비교 유료화·월 구독',
    evidence: '비교는 가장 강한 활성화이나 D7은 3.8%',
    risk: '핵심 무료 가치 훼손, 의사결정 주기와 구독 불일치',
    decision: '하지 않음',
  },
  {
    priority: 6,
    model: '광고·유료 순위',
    evidence: '행동·지불 근거 없음',
    risk: '공식 출처와 무광고 신뢰 훼손',
    decision: '제외',
  },
];

const experimentGates = [
  {
    stage_order: 1,
    stage: '출시 계측 QA',
    action: '실제 상세 노출, 2+ 비교, 공유 결과, 결원 열람을 새 정의로 수집',
    gate: '3일간 중복·누락 없이 수신, measurement_version 확인',
    failure_action: '수익화 노출 보류',
  },
  {
    stage_order: 2,
    stage: '문제 인터뷰 10명',
    action: '후보 2곳 사용자에게 결정 이후 가장 힘든 작업을 인터뷰',
    gate: '동일 과업을 자발적으로 말한 사용자 5명 이상',
    failure_action: '오퍼를 만들지 않고 문제 정의 수정',
  },
  {
    stage_order: 3,
    stage: '한 오퍼·한 가격 50회',
    action: '2+ 비교 직후 1회성 패스를 수동 제공하고 실제 선결제 받기',
    gate: '상세 관심 15% 이상, 환불 제외 선결제 3건 이상',
    failure_action: '가격 A/B 금지; 오퍼 중단 또는 재정의',
  },
  {
    stage_order: 4,
    stage: '100회 적격 노출',
    action: '같은 가치 제안으로 결제와 과업 완료를 재검증',
    gate: '구매 5건 이상, 구매자 60% 이상 과업 완료',
    failure_action: 'B2C 자동화 중단',
  },
  {
    stage_order: 5,
    stage: 'B2B 병행 탐색',
    action: '검색 순위와 분리된 공식 정보 QA·모집 일정 관리 10곳 인터뷰',
    gate: '월 5만원 이상 유료 파일럿 의향 3곳',
    failure_action: '이번 시즌은 수익보다 유입·활성화에 집중',
  },
];

const dataQuality = [
  {
    source: '유치원 기본 공시',
    // Keep the disclosure code textual. The portable renderer otherwise
    // abbreviates numeric-looking codes such as 20261 to "20.26K".
    version: `2026년 1차 (${analysis.public_data_quality.kindergartens.source_version})`,
    records: analysis.public_data_quality.kindergartens.total_count,
    quality: `${(analysis.public_data_quality.kindergartens.registry_join_coverage * 100).toFixed(1)}% 식별자 결합`,
    refresh: '공식 원본 주 1회 확인·품질 게이트 후 자동 반영',
    decision_use: '검색·비교 사용 가능',
  },
  {
    source: '결원',
    version: analysis.public_data_quality.vacancy.version,
    records: analysis.public_data_quality.vacancy.total_count,
    quality: `${vacancyQuality.regionsSucceeded}/${vacancyQuality.regionsRequested} 지역, 상세 ${(vacancyQuality.detailCoverage * 100).toFixed(1)}%`,
    refresh: '매일 수집·부분 실패 시 게시 차단',
    decision_use: '무료 노출 가능; 유료 수요는 새 이벤트로 검증',
  },
  {
    source: '후기 링크',
    version: analysis.public_data_quality.reviews.version,
    records: analysis.public_data_quality.reviews.total_count,
    quality: `${(analysis.public_data_quality.reviews.catalog_coverage * 100).toFixed(1)}% 기관 커버리지`,
    refresh: '주 1회 링크 검증·월 2회 신규 후보 수집; 공개 반영은 사람 승인',
    decision_use: '링크 탐색 사용 가능; 커버리지 차이를 추천 품질로 오해 금지',
  },
  {
    source: '행정구역 코드',
    version: analysis.public_data_quality.region_codes.checked_at,
    records: analysis.public_data_quality.region_codes.total_count,
    quality: '공식 최신 코드표와 일치',
    refresh: '주 1회 자동 확인',
    decision_use: '2026 개편 지역 검색·샤딩 반영',
  },
];

const evidence = {
  snapshot_date: input.snapshot_date,
  complete_data_through: input.complete_data_through,
  decision: '현재 행동·규모·데이터 품질로 어떤 수익화 모델을 먼저 검증해야 하는지 결정',
  observed: {
    rolling_30_day_active_users: input.mixpanel.rolling_30_day.active_users,
    current_12_day_active_users: input.mixpanel.current_window.active_users,
    prior_12_day_active_users: input.mixpanel.prior_window.active_users,
    behavior_signals: behaviorSignals,
    new_user_retention: retentionSummary,
    two_candidate_retention: input.mixpanel.two_candidate_retention,
    acquisition_alignment: analysis.acquisition_alignment,
  },
  instrumentation_corrections: instrumentationIssues,
  public_data_quality: analysis.public_data_quality,
  economics_scenarios: analysis.economics_scenarios,
  model_options: modelOptions,
  experiment_gates: experimentGates,
  validation: {
    overall: 'share_with_caveats',
    verified: [
      '30일 Mixpanel 고유 활성 사용자 직접 조회',
      '성숙 코호트 D1·D7·D14 분자/분모 재계산',
      'ASC와 Mixpanel 신규 신호의 정의 차이 및 시차 진단',
      '공식 공시 7,152개원과 현재 행정구역 261개 코드 결합',
      '결원 전 지역 수집 및 상세 커버리지 품질 게이트',
      '후기 링크의 현재 기관 재결합·중복 제거',
      'iOS 계측 수정 Simulator 빌드 및 회귀 테스트',
    ],
    not_verified: [
      '실제 결제 의향·결제 전환',
      '유입 채널별 CAC',
      '기관 대상 B2B 지불 의향',
      '새 정의로 수집된 공유 완료율·결원 관심률',
    ],
  },
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

artifact.manifest.title = '수익화 방향 비판적 재검토 — 최신 데이터 교정판';
artifact.manifest.description = '실제 30일 활성, 최신 공식 공시·결원·후기 품질, 교정된 계측을 반영한 수익화 의사결정 보고서';
artifact.manifest.generatedAt = now;
artifact.snapshot.generatedAt = now;
artifact.snapshot.status = 'ready';

const sources = [
  {
    id: 'mixpanel_current_source',
    label: 'Mixpanel 행동·리텐션 읽기 전용 쿼리',
    path: 'mixpanel_queries.py, analysis-input.json',
    query: {
      engine: 'Mixpanel via mixpanel_headless',
      id: 'project 4014822 / workspace 4510961',
      language: 'python',
      executed_at: now,
      description: '12일 행동 퍼널, 실제 30일 활성, 성숙 신규·2후보 코호트 리텐션을 조회했다.',
      tables_used: ['Mixpanel project 4014822', 'analysis-input.json', 'monetization-analysis.ipynb'],
    },
  },
  {
    id: 'acquisition_source',
    label: 'App Store Connect 일별 App Units와 Mixpanel 신규 실행 진단',
    path: 'analysis-input.json, analysis-output.json',
    query: {
      engine: 'App Store Connect scheduled artifacts + pandas lag diagnostic',
      executed_at: now,
      description: 'ASC T-2 일별 App Units와 Mixpanel days_since_install < 1 고유 실행을 정의별로 분리해 비교했다.',
      tables_used: ['daily-asc-analytics workflow artifacts', 'monetization-analysis.ipynb'],
    },
  },
  {
    id: 'instrumentation_source',
    label: '교정된 iOS 분석 이벤트 구현',
    path: 'ios/NativeApp/Sources, ios/NativeApp/Tests',
    query: {
      engine: 'repository inspection + iOS Simulator build/test',
      executed_at: now,
      description: '이벤트가 실제 노출·완료 시점에 기록되는지 소스와 회귀 테스트로 검증했다.',
      tables_used: ['Analytics.swift', 'SearchViewModel.swift', 'CompareViewModel.swift', 'CompareAnalyticsSemanticsTests.swift'],
    },
  },
  {
    id: 'economics_source',
    label: '실제 30일 활성 기반 B2C 민감도',
    path: 'monetization-analysis.ipynb, analysis-output.json',
    query: {
      engine: 'pandas scenario model',
      executed_at: now,
      description: '실제 30일 활성 186명과 관측 적격률에 미관측 결제율 가정을 적용했다.',
      tables_used: ['analysis-input.json', 'analysis-output.json'],
    },
  },
  {
    id: 'public_data_source',
    label: '최신 공식 공시·결원·후기 품질 메타데이터',
    path: 'public/data/*.meta.json, public/data/vacancy.json',
    query: {
      engine: 'official source sync + cross-dataset validator',
      executed_at: now,
      description: '공식 원본 버전, 레코드 수, 결합률, 결원 수집 완전성, 후기 커버리지를 검증했다.',
      tables_used: ['kindergartens.meta.json', 'reviews.meta.json', 'region-codes.meta.json', 'vacancy.json'],
    },
  },
  {
    id: 'decision_framework_source',
    label: '관측·가정 분리 의사결정 모델',
    path: 'evidence.json, source-notes.md',
    query: {
      engine: 'evidence synthesis',
      executed_at: now,
      description: '행동, 리텐션, 규모, 계측 신뢰도, 데이터 SLA를 함께 적용했다.',
      tables_used: ['evidence.json', 'analysis-output.json'],
    },
  },
];
artifact.manifest.sources = sources.map(({ id, label, path: sourcePath }) => ({
  id,
  label,
  path: sourcePath,
}));
artifact.sources = sources;

artifact.snapshot.datasets.behavior_signals = behaviorSignals;
artifact.snapshot.datasets.retention_summary = retentionSummary;
artifact.snapshot.datasets.acquisition_alignment = acquisitionAlignment;
artifact.snapshot.datasets.instrumentation_issues = instrumentationIssues;
artifact.snapshot.datasets.economics_scenarios = analysis.economics_scenarios;
artifact.snapshot.datasets.model_options = modelOptions;
artifact.snapshot.datasets.experiment_gates = experimentGates;
artifact.snapshot.datasets.data_quality = dataQuality;

function table(id) {
  return artifact.manifest.tables.find((item) => item.id === id);
}
function block(id) {
  return artifact.manifest.blocks.find((item) => item.id === id);
}
function upsertTable(definition) {
  const index = artifact.manifest.tables.findIndex((item) => item.id === definition.id);
  if (index >= 0) artifact.manifest.tables[index] = definition;
  else artifact.manifest.tables.push(definition);
}
function insertBlockAfter(afterId, nextBlock) {
  artifact.manifest.blocks = artifact.manifest.blocks.filter((item) => item.id !== nextBlock.id);
  const index = artifact.manifest.blocks.findIndex((item) => item.id === afterId);
  artifact.manifest.blocks.splice(index + 1, 0, nextBlock);
}
function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}
function valuesQuery(tableName, columns, rows, orderBy = columns[0]) {
  const values = rows
    .map((row) => `(${columns.map((column) => sqlLiteral(row[column])).join(',')})`)
    .join(',');
  return `WITH ${tableName}(${columns.join(',')}) AS (VALUES ${values}) SELECT ${columns.join(',')} FROM ${tableName} ORDER BY ${orderBy}`;
}
function widgetSource({ id, label, sourceId, path: sourcePath, description, sql, tablesUsed }) {
  return {
    id,
    label,
    path: sourcePath,
    query: {
      engine: 'SQLite VALUES over reviewed analysis outputs',
      language: 'sql',
      executed_at: now,
      description,
      sql,
      tables_used: tablesUsed,
    },
    sourceId,
  };
}

artifact.manifest.charts[0].subtitle = '2026년 7월 25일~8월 5일, 앱 실행 고유 사용자 124명, 1일 전환 창';
artifact.manifest.charts[0].sourceId = 'mixpanel_current_source';
table('behavior_signal_table').subtitle = '동일 124명 분모; 과거 출시 이벤트 의미의 한계를 함께 표시';
table('retention_table').subtitle = '7월 7일~8월 5일 중 각 시점까지 성숙한 신규 실행 코호트';
table('retention_table').sourceId = 'mixpanel_current_source';
table('instrumentation_table').title = '수익화 판단 계측 교정 상태';
table('instrumentation_table').subtitle = '과거 데이터의 위험, 반영한 수정, 새 기준선 수집 상태';
table('instrumentation_table').columns = [
  { field: 'priority', label: '우선순위', format: 'number' },
  { field: 'issue', label: '문제', type: 'text' },
  { field: 'previous_risk', label: '과거 측정 위험', type: 'text' },
  { field: 'correction', label: '교정', type: 'text' },
  { field: 'status', label: '현재 상태', type: 'text' },
];
table('economics_table').subtitle = '실제 30일 활성 186명; 결제율은 관측값이 아닌 민감도 가정';
table('model_table').subtitle = '규모 경제성·신뢰·데이터 SLA·직접 행동 증거를 함께 평가';

table('behavior_signal_table').source = widgetSource({
  id: 'behavior_signal_table_source',
  label: '검토된 Mixpanel 1일 행동 퍼널',
  sourceId: 'mixpanel_current_source',
  path: 'analysis-input.json, analysis-output.json',
  description: '동일 124명 분모의 검토된 행동 퍼널을 표 행으로 재생한다.',
  sql: valuesQuery(
    'behavior_signals',
    ['rank', 'behavior', 'converted_users', 'denominator_users', 'conversion_rate', 'average_minutes', 'measurement_note'],
    behaviorSignals,
    'rank'
  ),
  tablesUsed: ['analysis-input.json', 'analysis-output.json'],
});
artifact.manifest.charts[0].source = {
  ...table('behavior_signal_table').source,
  id: 'behavior_signal_chart_source',
  label: '검토된 Mixpanel 1일 행동 퍼널 차트 데이터',
};
table('retention_table').source = widgetSource({
  id: 'retention_table_source',
  label: '성숙 신규 코호트 리텐션',
  sourceId: 'mixpanel_current_source',
  path: 'analysis-input.json, analysis-output.json',
  description: '성숙 코호트 분자·분모를 합산한 D1·D7·D14·D28을 표 행으로 재생한다.',
  sql: valuesQuery(
    'retention_summary',
    ['order', 'day', 'returned_users', 'eligible_users', 'rate', 'cohort_window'],
    retentionSummary,
    '"order"'
  ),
  tablesUsed: ['mixpanel_queries.py', 'analysis-input.json', 'monetization-analysis.ipynb'],
});
table('instrumentation_table').source = widgetSource({
  id: 'instrumentation_table_source',
  label: 'iOS 계측 교정 검토 결과',
  sourceId: 'instrumentation_source',
  path: 'ios/NativeApp/Sources, ios/NativeApp/Tests',
  description: '과거 측정 위험과 현재 소스 교정 상태를 표 행으로 재생한다.',
  sql: valuesQuery(
    'instrumentation_issues',
    ['priority', 'issue', 'previous_risk', 'correction', 'status'],
    instrumentationIssues,
    'priority'
  ),
  tablesUsed: ['Analytics.swift', 'SearchViewModel.swift', 'CompareViewModel.swift', 'CompareAnalyticsSemanticsTests.swift'],
});
table('economics_table').source = widgetSource({
  id: 'economics_table_source',
  label: '실제 30일 활성 기반 민감도 계산',
  sourceId: 'economics_source',
  path: 'analysis-output.json',
  description: '30일 활성 186명, 적격률 37.9032%, 가정 결제율·가격을 적용한 총매출 민감도다.',
  sql: valuesQuery(
    'economics_scenarios',
    ['price_krw', 'eligible_purchase_rate', 'estimated_purchases', 'gross_revenue_krw', 'active_users_for_1m'],
    analysis.economics_scenarios,
    'price_krw, eligible_purchase_rate'
  ),
  tablesUsed: ['analysis-input.json', 'monetization-analysis.ipynb', 'analysis-output.json'],
});
table('model_table').source = widgetSource({
  id: 'model_table_source',
  label: '수익화 옵션 비교 판단',
  sourceId: 'decision_framework_source',
  path: 'evidence.json, analysis-output.json',
  description: '행동·규모·데이터 SLA·신뢰 위험을 모델별 판단으로 구조화했다.',
  sql: valuesQuery(
    'model_options',
    ['priority', 'model', 'evidence', 'risk', 'decision'],
    modelOptions,
    'priority'
  ),
  tablesUsed: ['evidence.json', 'analysis-output.json'],
});
table('experiment_gate_table').source = widgetSource({
  id: 'experiment_gate_table_source',
  label: '순차 실험 게이트',
  sourceId: 'decision_framework_source',
  path: 'evidence.json',
  description: '작은 표본에서 적용할 순차 실험과 중단 조건을 표 행으로 재생한다.',
  sql: valuesQuery(
    'experiment_gates',
    ['stage_order', 'stage', 'action', 'gate', 'failure_action'],
    experimentGates,
    'stage_order'
  ),
  tablesUsed: ['evidence.json'],
});

upsertTable({
  id: 'acquisition_alignment_table',
  title: '유입 증가와 측정 정합성',
  subtitle: 'ASC App Units와 Mixpanel 신규 실행은 정의가 달라 별도 지표로 유지',
  showDescription: true,
  dataset: 'acquisition_alignment',
  sourceId: 'acquisition_source',
  source: {
    id: 'acquisition_alignment_table_source',
    label: 'ASC·Mixpanel 정합성 진단 표 데이터',
    path: 'analysis-input.json, analysis-output.json',
    query: {
      engine: 'SQLite VALUES over notebook outputs',
      language: 'sql',
      executed_at: now,
      description: '노트북에서 재계산한 기간 비교, 지표 합, 최고 시차 상관을 표 행으로 재생한다.',
      sql: `WITH acquisition_alignment(ord, indicator, current_value, comparison_value, interpretation) AS (VALUES (1,'12일 활성 사용자',124,62,'직전 동기간 대비 2.0배'),(2,'ASC App Units / Mixpanel 신규 실행 합',${analysis.acquisition_alignment.asc_known_units},${analysis.acquisition_alignment.mixpanel_new_launch_sum},'정의·날짜가 달라 합산 금지'),(3,'시차 진단 최고 상관',${bestLag.pearson_r},${bestLag.asc_date_shift_days},'인과·어트리뷰션 증거 아님')) SELECT ord, indicator, current_value, comparison_value, interpretation FROM acquisition_alignment ORDER BY ord`,
      tables_used: ['analysis-input.json', 'analysis-output.json', 'monetization-analysis.ipynb'],
    },
  },
  defaultSort: { field: 'indicator', direction: 'asc' },
  density: 'spacious',
  layout: 'full',
  columns: [
    { field: 'indicator', label: '진단', type: 'text' },
    { field: 'current', label: '현재/값', format: 'number' },
    { field: 'comparison', label: '비교/시차', format: 'number' },
    { field: 'interpretation', label: '해석', type: 'text' },
  ],
});
upsertTable({
  id: 'data_quality_table',
  title: '공개 데이터 최신성·품질 게이트',
  subtitle: '2026년 8월 6일 공식 원본 재수집 및 교차 참조 검증',
  showDescription: true,
  dataset: 'data_quality',
  sourceId: 'public_data_source',
  source: {
    id: 'data_quality_table_source',
    label: '최신 공개 데이터 품질 표 데이터',
    path: 'analysis-output.json',
    query: {
      engine: 'SQLite VALUES over validated metadata',
      language: 'sql',
      executed_at: now,
      description: '품질 게이트를 통과한 공시·결원·후기·행정구역 메타데이터를 표 행으로 재생한다.',
      sql: `WITH data_quality(source, version, records, quality, refresh, decision_use) AS (VALUES ('유치원 기본 공시','2026년 1차 (${analysis.public_data_quality.kindergartens.source_version})',${analysis.public_data_quality.kindergartens.total_count},'100% 식별자 결합','주 1회','검색·비교 사용 가능'),('결원','${analysis.public_data_quality.vacancy.version}',${analysis.public_data_quality.vacancy.total_count},'${vacancyQuality.regionsSucceeded}/${vacancyQuality.regionsRequested} 지역','매일','무료 노출 가능'),('후기 링크','${analysis.public_data_quality.reviews.version}',${analysis.public_data_quality.reviews.total_count},'${(analysis.public_data_quality.reviews.catalog_coverage * 100).toFixed(1)}% 기관 커버리지','주 1회 링크 검증·월 2회 후보 수집','커버리지 편향 주의'),('행정구역 코드','${analysis.public_data_quality.region_codes.checked_at}',${analysis.public_data_quality.region_codes.total_count},'공식 코드표 일치','주 1회','2026 개편 반영')) SELECT source, version, records, quality, refresh, decision_use FROM data_quality`,
      tables_used: ['kindergartens.meta.json', 'reviews.meta.json', 'vacancy.json', 'region-codes.meta.json'],
    },
  },
  defaultSort: { field: 'source', direction: 'asc' },
  density: 'spacious',
  layout: 'full',
  columns: [
    { field: 'source', label: '데이터', type: 'text' },
    { field: 'version', label: '버전/확인 시각', type: 'text' },
    { field: 'records', label: '레코드', format: 'number' },
    { field: 'quality', label: '품질', type: 'text' },
    { field: 'refresh', label: '자동 갱신', type: 'text' },
    { field: 'decision_use', label: '수익화 판단 용도', type: 'text' },
  ],
});

block('executive_summary').body = `## Executive Summary

- **최선은 지금 구독·광고·기본 비교 유료화를 만드는 것이 아니다.** 실제 30일 활성은 186명으로, 과거 12일 값을 선형 환산한 310명보다 40% 작다. 9,900원 상품에 낙관적이지 않은 5% 결제 가정을 적용해도 월 총매출 민감도는 약 3.5만원이다.

- **비교는 강한 활성화 행동이지만 지불 의사는 아니다.** 124명 중 후보 2곳 도달은 47명(37.9%), 실제 2+ 비교 보기는 42명(33.9%)이다. 기본 비교는 무료로 유지하고, 비교 이후 반복해서 드러나는 의사결정 과업만 한 번의 수동 선결제로 검증한다.

- **B2C 오퍼는 매출 엔진이 아니라 수요 검증 장치다.** 문제 인터뷰 10명 → 한 오퍼·한 가격 50회 → 실제 선결제 3건 → 100회에서 5건을 순차 게이트로 둔다. 통과 전에는 결제·콘텐츠 기능을 자동화하지 않는다.

- **의미 있는 수익을 목표로 한다면 B2B 탐색을 병행해야 한다.** 단, 유료 순위가 아니라 공식 정보 QA·갱신처럼 검색 신뢰와 분리된 제안으로 10곳을 인터뷰하고 월 5만원 이상 유료 파일럿 의향 3곳이 확인될 때만 만든다.

- **데이터는 최신화했지만 후기와 결원 수요는 구분해야 한다.** 공식 공시·행정구역·결원은 품질 게이트와 주기 갱신을 구성했다. 후기 내용 삭제는 자동화하지 않고 사람 승인으로 남겼으며, 새 공유·결원 이벤트는 출시 후 최소 14일 기준선을 다시 모아야 한다.`;
block('behavior_finding').body = `## 유입은 늘었고 비교 활성화는 강하다 — 그러나 결제 근거는 아니다

**최근 12일 활성은 124명으로 직전 12일 62명의 2배다.** 같은 분모에서 후보 2곳 도달은 37.9%, 실제 2곳 이상 비교 보기는 33.9%, 외부 후기 열기는 25.0%다.

이는 시즌 유입을 비교 가치로 연결할 기회가 있다는 뜻이다. 반면 어떤 유료 산출물도 사용하거나 구매한 데이터는 없다. 따라서 비교 자체를 잠그지 말고, 상담 질문·방문 메모·일정·가족 합의처럼 **비교 다음의 실제 문제**를 인터뷰와 선결제로 검증해야 한다.`;
block('retention_finding').body = `## 신규 D7 3.8%: 구독보다 세션 안 가치 회수가 맞다

**7월 7일~8월 5일 성숙 코호트의 D1 재실행은 4/168명(2.4%), D7은 5/132명(3.8%), D14는 1/31명(3.2%)이다.** 후보 2곳에 도달한 사용자의 D7은 4/52명(7.7%)으로 약 두 배지만 표본이 작고 선택 편향이 있다.

제품은 매일 쓰는 습관형 서비스보다 짧고 비연속적인 의사결정 도구에 가깝다. 월 구독보다 현재 세션에서 완료되는 1회성 가치가 구조적으로 맞다.`;
block('measurement_finding').body = `## 과거 계측 오류는 고쳤지만 새 기준선은 아직 없다

상세 열림을 실제 시트 노출로 이동했고, 2곳 미만 비교 탭은 핵심 이벤트에서 제외했다. 공유는 시작과 결과를 분리했으며, 결원 섹션 실제 노출 이벤트를 추가했다.

수정은 iOS Simulator 빌드와 회귀 테스트를 통과했지만 출시 이전 데이터의 의미가 바뀌지는 않는다. **2026년 8월 6일 이전 Compare Shared를 완료율로 재해석하거나 전후 시계열을 직접 연결하면 안 된다.**`;
block('economics_finding').body = `## 실제 30일 활성 186명에서는 B2C가 아직 매출 엔진이 아니다

실제 30일 고유 활성은 **186명**이다. 후보 2곳 도달률 37.9%와 적격 사용자 결제율 5%를 가정하면 9,900원 상품은 약 3.5건·3.5만원, 19,900원은 약 3.5건·7.0만원의 월 총매출 민감도다.

월 총매출 100만원에는 같은 5% 가정에서 각각 약 5,330명·2,652명의 활성 사용자가 필요하다. 지금 결제 실험의 성공은 매출액이 아니라 실제 구매자와 구매 이유의 존재다.`;
block('model_finding').body = `## 잠정 최선은 ‘제품 개발’이 아니라 두 갈래의 증거 수집이다

첫째, 소비자에게는 무료 비교 이후의 의사결정 과업을 **수동 1회성 패스**로 선결제 검증한다. 둘째, 기관에는 유료 순위와 분리된 공식 정보 QA·갱신 파일럿을 인터뷰한다.

결원은 이제 매일 갱신할 수 있지만 유료화 조건은 데이터 공급 가능성만이 아니다. 새 Vacancy Viewed와 반복 확인 수요가 14일 이상 관측되고 수집 SLA가 유지된 뒤 무료 대기목록부터 시험한다.`;
block('experiment_finding').body = `## 작은 표본에서는 순차 게이트가 A/B 테스트보다 낫다

한 번에 상품·가격·노출 시점을 쪼개면 학습할 표본이 사라진다. 먼저 문제 인터뷰 10명에서 반복 과업을 확인하고, 한 오퍼·한 가격을 50회 노출해 실제 선결제 3건을 확인한다. 100회에서 5건과 과업 완료율 60%를 재확인한 뒤 반복 수작업만 자동화한다.

무료 2+ 비교 완료율의 상대 하락 10%를 핵심 가드레일로 둔다. 미달하면 가격을 바꾸기 전에 오퍼를 중단한다.`;
block('further_questions').body = `## 결론을 바꿀 수 있는 다음 질문

- 후보 2곳 이후 가장 힘든 일은 상담 질문, 방문 기록, 일정, 가족 합의 중 무엇인가?
- 새 정의의 공유 완료율과 공유 링크 재열람률은 얼마인가?
- Vacancy Viewed 사용자가 7일 안에 반복 확인하거나 알림을 요청하는가?
- 소비자 선결제 5건 또는 기관 유료 파일럿 3곳 중 어느 쪽이 먼저 확인되는가?
- ASC App Units와 Mixpanel 신규 실행 합계 차이는 날짜대·재설치·install date 산식 중 무엇 때문인가?`;
block('caveats').body = `## Caveats and assumptions

- 최신 행동 퍼널은 12일·124명이며 결제 전환은 한 건도 관측되지 않았다.
- 30일 활성 186명은 직접 조회값이지만 결제율 3%·5%·10%는 전부 가정이다. 수수료·세금·환불도 제외했다.
- D7 신규 분모는 132명, 2후보 분모는 52명이라 차이를 인과 효과로 볼 수 없다.
- ASC와 Mixpanel 신규 신호는 정의와 날짜가 다르고 ASC 7월 21일이 누락돼 설치 수로 합산하지 않았다.
- 후기 링크는 1,892/7,152곳(26.5%)만 커버한다. 자동 판정 제거 후보는 큐레이션 규칙에 따라 사람 승인 전 공개 데이터에서 삭제하지 않았다.
- 계측 수정 효과와 결원 수요는 새 앱 버전 출시 후 최소 14일 관측이 필요하다.`;

insertBlockAfter('behavior_evidence', {
  id: 'acquisition_finding',
  type: 'markdown',
  sourceId: 'acquisition_source',
  body: `## 유입 스파이크는 확인되지만 설치 어트리뷰션은 아직 불완전하다

직전 동기간 대비 활성은 2배다. ASC App Units와 Mixpanel 신규 실행은 스파이크 방향은 비슷하지만, 알려진 구간 합이 각각 ${analysis.acquisition_alignment.asc_known_units}와 ${analysis.acquisition_alignment.mixpanel_new_launch_sum}로 크게 다르다. 최고 상관은 ASC 날짜를 ${bestLag.asc_date_shift_days}일 이동했을 때 r=${bestLag.pearson_r.toFixed(2)}였다.

따라서 시즌 유입 증가는 사실로 보되, 채널별 CAC·설치 전환·정확한 설치일 판단에는 아직 쓰지 않는다.`,
});
insertBlockAfter('acquisition_finding', {
  id: 'acquisition_evidence',
  type: 'table',
  tableId: 'acquisition_alignment_table',
});
insertBlockAfter('economics_evidence', {
  id: 'data_quality_finding',
  type: 'markdown',
  sourceId: 'public_data_source',
  body: `## 데이터 공급은 개선됐지만 수요 증거와 혼동하면 안 된다

공식 2026년 1차 공시 7,152개원을 100% 식별자 결합했고, 행정구역 261개 코드를 최신화했다. 결원은 ${vacancyQuality.regionsSucceeded}/${vacancyQuality.regionsRequested} 지역을 수집했고 상세 커버리지는 ${(vacancyQuality.detailCoverage * 100).toFixed(1)}%다. 후기 링크는 현재 기관 기준 6,055건·1,892개원이며 194건의 폐·변경 기관 연결과 58건 중복을 공개 집계에서 제외했다.

이는 신뢰 가능한 실험 기반을 만든 것이지 유료 수요를 증명한 것이 아니다. 결원 유료화는 새 사용자 행동을, 후기 기반 추천은 지역별 커버리지 편향을 별도로 검증해야 한다.`,
});
insertBlockAfter('data_quality_finding', {
  id: 'data_quality_evidence',
  type: 'table',
  tableId: 'data_quality_table',
});

fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(artifactPath);
