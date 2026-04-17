# Phase 0: docs-update

## 사전 준비

아래 문서를 반드시 읽어라:

- `docs/IOS_ARCHITECTURE.md` — 이번 리팩토링의 전체 설계서

그리고 현재 코드의 구조를 확인하라:

- `ios/NativeApp/Package.swift` — 현재 SPM 타겟 구조
- `ios/NativeApp/Sources/` 하위 디렉토리 구조

## 작업 내용

`docs/IOS_ARCHITECTURE.md` 파일이 이미 존재한다. 이 문서를 읽고, 현재 코드와 비교하여 정합성을 검증하라.

구체적으로:
1. 문서에 명시된 "현재 상태" 섹션의 파일 목록과 줄 수가 실제 코드와 일치하는지 확인
2. 문서에 명시된 "레이어 위반" 3건이 실제로 존재하는지 코드를 읽어서 확인
3. 불일치가 있다면 문서를 수정
4. 불일치가 없다면 문서는 그대로 둠

**이 phase에서는 문서 검증/수정만 수행한다. 코드를 변경하지 마라.**

## Acceptance Criteria

```bash
# 문서가 존재하고 비어있지 않음
test -s docs/IOS_ARCHITECTURE.md && echo "PASS" || echo "FAIL"
```

## AC 검증 방법

위 AC 커맨드를 실행하라. 통과하면 `/tasks/0-arch-refactor/index.json`의 phase 0 status를 `"completed"`로 변경하라.

## 주의사항

- 코드를 수정하지 마라. 문서만 다룬다.
- 문서에 새로운 섹션을 추가하지 마라. 기존 내용의 정합성 검증만 한다.
