# 우리동네 유치원 — App Store 소재

## 스크린샷
- `screenshots/iphone-6.9`: 1320×2868, 5장, RGB PNG (알파 없음)
- `screenshots/iphone-6.5`: 1284×2778, 5장, RGB PNG (알파 없음)
- 순서: 비교 → 가까운 곳 검색 → 운영 정보 → 후기 연결 → 저장·가족 공유
- `app-store-screenshots.zip`: 제출용 PNG 10장 묶음
- `overview.jpg`는 검토용 모음이며 스토어 업로드용 개별 이미지가 아닙니다.

## 영상
- 구성: 비교 결과 → 근처 탐색 → 후보 담기 → 조건 비교 → 후기 → 비교표 공유
- 24초, 886×1920, 30fps 목표. 실제 네이티브 앱 녹화 + 짧은 한글 설명.
- 무음 자막형. 새로운 음성·음악 생성 서비스는 사용하지 않았습니다.
- 편집 및 검증 완료. 최종 MP4 렌더는 최종 구성 승인 대기.
- 미리보기: http://localhost:3003/#project/app-store-2026-fall

## 검증 및 출처
- 실제 iOS 앱의 목동 지역 유치원 정보와 출처·게시일이 표시된 후기 링크를 캡처했습니다. 수치·후기·기능을 합성하지 않았습니다.
- 스크린샷은 실제 캡처에 외부 홍보 문구를 배치했습니다. 마지막 장은 저장 목록과 실제 비교표 공유 버튼을 따로 보여줍니다.
- 개별 유치원 평가·추천 순위·실시간 결원·입학 확률을 보장하지 않습니다.
- 스크린샷과 영상 구성의 lint/runtime/layout/contrast 검사 통과. 원본 앱 픽셀 안의 작은 글자는 실제 앱 그대로이며 별도의 기능 UI로 재생성하지 않았습니다.
- 편집 가능한 소스는 상위 프로젝트 폴더의 `index.html`, `STORYBOARD.md`, `scripts/`, `compositions/`, `assets/`에 있습니다.
- 자동 조립 스크립트를 다시 실행하면 내보낸 영상 레이어가 없어질 수 있어 `scripts/restore-video-layers.mjs`를 이어서 실행합니다. 최종 확인한 `index.html`이 현재 기준본입니다.
- 폰트: Pretendard. 라이선스는 `assets/fonts/LICENSE-Pretendard.txt`.
- 현재 App Store에 업로드하거나 앱을 배포하지 않았습니다.
