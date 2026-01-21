# HANDOFF.md

## 마지막 작업 일시
2026-01-21

## 완료된 작업
- [x] 프로젝트 초기 설정
  - Next.js 16.1.4 + React 19.2.3 + TypeScript 5.9.3
  - TailwindCSS 4.x + shadcn/ui 설정
  - Zustand 5.x 상태 관리
  - Vitest + Playwright 테스트 환경 구성
- [x] 프로젝트 구조 생성 (CLAUDE.md 스펙에 맞게)
- [x] TypeScript 타입 정의 (Kindergarten, API 응답 타입)
- [x] Haversine 거리 계산 함수 구현 및 테스트 (6개 테스트 통과)
- [x] 홈페이지 기본 UI 구현 (위치 검색 버튼)
- [x] 환경 변수 템플릿 (.env.example) 생성
- [x] next.config.ts 보안 설정 (CVE-2025-66478 대응)
- [x] Kakao API 연동 (`src/lib/api/kakaoApi.ts`)
- [x] 유치원 알리미 API 데이터 수집 스크립트 (`scripts/sync-kindergartens.ts`)
- [x] **아키텍처 변경: Supabase DB → 정적 JSON 파일**
- [x] 정적 JSON 데이터 생성 (`/data/kindergartens.json`, 8.5MB, ~8,000개 기관)
- [x] PRD, IA, USECASE 문서 정적 JSON 아키텍처로 업데이트 (v1.2.0)

## 진행 중인 작업
- 없음

## 다음에 할 작업
1. 검색 결과 페이지 UI 구현 (`/search`)
2. kindergartenStore 구현 (JSON 데이터 로드 및 캐싱)
3. 클라이언트 사이드 Haversine 필터링 로직 구현
4. 검색 결과 목록 컴포넌트 구현 (KindergartenList, KindergartenCard)
5. 지도 뷰 컴포넌트 구현 (Kakao Maps)
6. 비교표 기능 구현 (`/compare`)

## 아키텍처 변경 사항 (중요)

### Before (Supabase)
- Supabase PostgreSQL + PostGIS
- 실시간 DB 쿼리
- 서버 사이드 거리 계산

### After (정적 JSON)
- `/data/kindergartens.json` (8.5MB, 37필드)
- 클라이언트 메모리에 전체 데이터 캐싱
- 클라이언트 사이드 Haversine 거리 계산
- 학기별 JSON 파일 수동 갱신

### 데이터 구조 (37개 필드)
```
kindercode, name, address, lat, lng, type, phone, homepage, operation_hours,
sido_code, sigungu_code, capacity, current_count,
class_count_age3~5, capacity_age3~5, current_age3~5,
establish_date, has_bus, bus_count, meal_type, has_after_school,
area_per_child, has_playground, building_year, floor_info,
classroom_area, indoor_playground_area, outdoor_playground_area,
teacher_count, senior_teacher_count, cctv_count
```

## 주의사항 / 알려진 이슈
- 환경 변수 (.env.local 필요)
  - `NEXT_PUBLIC_KAKAO_JS_KEY` - 지도/주소 검색용
  - `KAKAO_REST_API_KEY` - 서버 사이드 지오코딩용 (선택)
  - `KINDERGARTEN_API_KEY` - JSON 갱신 시에만 필요
- Supabase 관련 환경 변수는 더 이상 필요 없음
- JSON 파일 크기 8.5MB → gzip 압축 시 ~1.5MB
- Playwright 브라우저 미설치 (`npx playwright install` 필요)

## 현재 브랜치
main

## 참고 파일
- `docs/PRD.md` - 제품 요구사항 (v1.2.0)
- `docs/IA.md` - 정보 아키텍처 (v1.2.0)
- `docs/USECASE.md` - 유스케이스 명세 (v1.2.0)
- `CLAUDE.md` - 개발 가이드
- `scripts/sync-kindergartens.ts` - JSON 데이터 갱신 스크립트

## 설치된 주요 패키지
| 패키지 | 버전 | 용도 |
|--------|------|------|
| next | 16.1.4 | Framework |
| react | 19.2.3 | UI Library |
| tailwindcss | 4.1.18 | Styling |
| zustand | 5.0.10 | State Management |
| vitest | 3.2.4 | Unit Testing |
| @playwright/test | 1.57.0 | E2E Testing |

## 개발 명령어
```bash
pnpm dev           # 개발 서버 (Turbopack)
pnpm build         # 프로덕션 빌드
pnpm test          # 유닛 테스트
pnpm test:e2e      # E2E 테스트
pnpm type-check    # 타입 체크

# JSON 데이터 갱신 (학기별)
pnpm sync:kindergartens -- --save-json
```
