# 우리동네 유치원 — Remotion App Preview

2026-09-08. 사용자의 "너무 지루하다"는 피드백과 Remotion 지정에 따라 새로 만든 24초 영상입니다. 이전 HyperFrames 프로젝트를 렌더링한 것이 아니라 React/Remotion으로 새로 작성했습니다.

## 편집 방향

- 시작: "어디 보낼지, 아직 고민 중?" — 큰 글씨, 실제 비교 화면, 조건 강조
- 2.4초: "후보는 나란히. 차이는 한눈에." — 비교 항목을 차례로 짚기
- 4.8초: 가까운 유치원 지도
- 7.2초: 실제 비교 후보 담기
- 9.6초: 실제 비교표 스크롤
- 13.2초: 셔틀·운영 시간 강조
- 16.8초: 출처가 있는 후기 링크
- 20.4초: 앱 이름·광고/가입 없음·가족 공유로 마무리

원본 앱 화면은 이전 촬영의 실제 iOS 화면을 재사용했습니다. 새 수치, 가짜 후기, 가짜 기능, 입학 확률은 생성하지 않았습니다. 고정된 화면 속 중요한 항목을 프레임 기반 강조선으로 짚고, 기능 화면에 짧은 홍보 문구를 겹쳤습니다. 과도한 3D 폰 회전·외부 인물 영상은 넣지 않았습니다.

## 오디오

`scripts/score.py`로 만든 100 BPM 오리지널 plucked-key 음악과 작은 UI 전환음을 사용합니다. 샘플 음원이나 상용 곡을 복사하지 않았습니다. 24초 stereo 48kHz WAV가 소스입니다. 음성 내레이션은 없으며 소리를 끈 상태에서도 문구로 이해할 수 있습니다.

## 재현

고정 버전: Remotion 및 @remotion 패키지 4.0.522, React 19.2.3. `pnpm-lock.yaml`에 버전을 보존합니다.

```sh
pnpm --ignore-workspace install --frozen-lockfile --ignore-scripts
pnpm exec tsc --noEmit
node scripts/render.mjs qa
node scripts/render.mjs final
```

음원을 다시 만들려면 NumPy가 설치된 Python으로 `scripts/score.py`를 실행합니다. 현재 제작에서는 데스크톱에 이미 설치된 Codex runtime Python을 사용했습니다. 렌더 스크립트는 설치된 Google Chrome을 사용하며 `.bundle/`을 반복 재사용합니다. 최종 출력은 `out/kindergarten-app-preview-remotion.mp4`입니다.

## 검증

- TypeScript 검사
- 8개 장면별 프레임 검사 및 강조선 위치·동작 시점 수정
- 최종 MP4 H.264/yuv420p, 886×1920, 30fps, AAC stereo 및 전체 디코딩 검증 결과는 `out/verification.json`에 기록
- 최종 영상에서 추출한 모음 이미지와 포스터를 함께 제공

이 영상이 다운로드 전환을 높였다는 실험 결과나 Apple 심사 승인을 주장하지 않습니다. App Store 업로드·배포는 수행하지 않았습니다.
