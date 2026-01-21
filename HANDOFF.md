# HANDOFF.md

## 마지막 작업 일시
2026-01-21

## 완료된 작업
- [x] 프로젝트 초기 설정
  - Next.js 16.1.4 + React 19.2.3 + TypeScript 5.9.3
  - TailwindCSS 4.x + shadcn/ui 설정
  - Zustand 5.x + Supabase 클라이언트 설정
  - Vitest + Playwright 테스트 환경 구성
- [x] 프로젝트 구조 생성 (CLAUDE.md 스펙에 맞게)
- [x] TypeScript 타입 정의 (Kindergarten, API 응답 타입)
- [x] Haversine 거리 계산 함수 구현 및 테스트 (6개 테스트 통과)
- [x] 홈페이지 기본 UI 구현 (위치 검색 버튼)
- [x] 환경 변수 템플릿 (.env.example) 생성
- [x] next.config.ts 보안 설정 (CVE-2025-66478 대응)

## 진행 중인 작업
- 없음 (초기 설정 완료)

## 다음에 할 작업
1. Supabase 스키마 생성 (kindergartens 테이블)
2. 유치원 알리미 API 연동 (/api/kindergartens/route.ts)
3. Kakao 주소 검색 API 연동 (/api/geocode/route.ts)
4. 검색 결과 목록 컴포넌트 구현
5. 지도 뷰 컴포넌트 구현 (Kakao Maps)

## 주의사항 / 알려진 이슈
- 환경 변수 미설정 상태 (.env.local 생성 필요)
  - KINDERGARTEN_API_KEY
  - KAKAO_REST_API_KEY
  - NEXT_PUBLIC_KAKAO_JS_KEY
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
- Playwright 브라우저 미설치 (`npx playwright install` 필요)

## 현재 브랜치
main (초기 상태)

## 참고 파일
- DETAILED_SPEC.md - 전체 기술 스펙
- CLAUDE.md - 개발 가이드

## 설치된 주요 패키지
| 패키지 | 버전 | 용도 |
|--------|------|------|
| next | 16.1.4 | Framework |
| react | 19.2.3 | UI Library |
| tailwindcss | 4.1.18 | Styling |
| zustand | 5.0.10 | State Management |
| @supabase/supabase-js | 2.91.0 | Database Client |
| vitest | 3.2.4 | Unit Testing |
| @playwright/test | 1.57.0 | E2E Testing |

## 개발 명령어
```bash
pnpm dev           # 개발 서버 (Turbopack)
pnpm build         # 프로덕션 빌드
pnpm test          # 유닛 테스트
pnpm test:e2e      # E2E 테스트
pnpm type-check    # 타입 체크
```
