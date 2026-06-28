---
stage: task
run_id: 2026-04-17-1337-splash-logo-fix
task: "스플래쉬 화면에서 앱 로고가 안나와 확인해줘."
created_at: 2026-04-17T13:37:00+09:00
---

# Task
스플래쉬 화면에서 앱 로고가 안나와 확인해줘.

## 추가 맥락
- 사용자는 두 개의 작업을 함께 요청했고, 옵션 A를 선택해 본 작업(스플래시 로고 버그)을 먼저 처리하기로 함.
- 다른 작업(Mixpanel + App Store 분석)은 본 run 종료 후 별도 run으로 진행 예정.
- 프로젝트 규칙(CLAUDE.md):
  - iOS 네이티브 앱 (`ios/NativeApp/`, `ios/WhereKindergartenNative/`)이 현재 메인 앱
  - Capacitor 웹앱 (`ios/App/`, `src/`)은 레거시 — 더 이상 개발하지 않음
  - 따라서 스플래시 이슈는 SwiftUI 네이티브 코드에서 조사해야 함
- main 브랜치 직접 작업 금지 → feature 브랜치 + worktree 사용 필수
