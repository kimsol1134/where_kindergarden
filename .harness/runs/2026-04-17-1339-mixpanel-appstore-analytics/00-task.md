---
stage: task
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task: "유저행동플로우를 믹스패널로 구축하고 싶어. 앱스토어 데이터도 같이 모아서 분석한다음 앱을 개선하고 싶어."
created_at: 2026-04-17T13:39:00+09:00
---

# Task

유저행동플로우를 믹스패널로 구축하고 싶어. 앱스토어 데이터도 같이 모아서 분석한다음 앱을 개선하고 싶어.

## 추가 맥락

- 대상 앱: "우리동네 유치원" (iOS 네이티브 SwiftUI 앱 — `ios/NativeApp/`, `ios/WhereKindergartenNative/`)
- Capacitor 웹앱(`ios/App/`, `src/`)은 레거시로 더 이상 개발하지 않음 (CLAUDE.md)
- 웹(Next.js) 측은 검색/비교표/개인정보/소개 페이지 등이 존재 (`src/app/*`)
- 기존 분석 도구: Vercel Analytics ID 환경변수만 존재 (`NEXT_PUBLIC_VERCEL_ANALYTICS_ID`)
- 수익화: AdMob 배너 (`MobileAdBanner.tsx`) 연동되어 있음
- 배포: TestFlight (Fastlane `beta_with_api_key` lane)
- 의도: (1) 사용자 행동 퍼널·이탈 지점 측정 → (2) App Store Connect의 리뷰/설치/크래시 지표와 교차 분석 → (3) 앱 UX/기능 개선 우선순위 도출

## 범위 모호성 (Clarify에서 다룰 사항)

- Mixpanel 연동 대상: iOS 네이티브 앱? 웹(Next.js)? 양쪽?
- "앱스토어 데이터" 범위: App Store Connect API(매출/설치/impression)? 리뷰 텍스트? 크래시? ASO 키워드?
- 분석 결과물 형태: 대시보드만? 리포트 문서? 코드 레벨 개선까지 이번 런에 포함?
- 데이터 수집 항목(이벤트 스펙)이 선 정의되어야 하는지, 아니면 먼저 스캔 후 추천해야 하는지
- 개인정보/ATT 고려사항 (iOS IDFA 이미 대응 중)
